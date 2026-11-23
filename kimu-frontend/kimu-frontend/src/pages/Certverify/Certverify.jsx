import { useCallback, useEffect, useState } from 'react';
import { certificateApi } from '../../services/api';
import './Certverify.css';

const empty = { certificateNumber: '', studentName: '', course: '', institution: 'KIMU TRANSPORT', issueDate: '', graduationDate: '', department: '', academicYear: '', notes: '' };
const messageOf = (error) => error?.message || 'Unable to complete the request. Please try again.';

export default function Certverify() {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageInfo, setPageInfo] = useState({ page: 1, totalPages: 1, total: 0 });
  const [summary, setSummary] = useState({ total: 0, valid: 0, revoked: 0 });
  const [form, setForm] = useState(empty);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(null);
  const refresh = useCallback(async () => {
    try { const { data } = await certificateApi.list({ q: query || undefined, status: statusFilter || undefined, page, limit: 10 }); setItems(data.data?.items || []); setPageInfo(data.data || { page: 1, totalPages: 1, total: 0 }); setError(''); }
    catch (e) { setError(messageOf(e)); }
    try { const { data } = await certificateApi.stats(); setSummary(data.data); } catch { /* the searchable register remains usable if stats fail */ }
  }, [query, statusFilter, page]);
  useEffect(() => { refresh(); }, [refresh]);

  async function submit(event) {
    event.preventDefault(); setError(''); setNotice('');
    if (!file) return setError('Choose the certificate PDF before registering it.');
    if (file.size > 10 * 1024 * 1024) return setError('PDF must be 10 MB or smaller.');
    setBusy(true);
    try {
      const data = await file.arrayBuffer();
      const bytes = new Uint8Array(data);
      let binary = ''; for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
      const encoded = btoa(binary);
      let response;
      try { ({ data: response } = await certificateApi.create(form, { name: file.name, data: encoded })); }
      catch (e) { if (e.status !== 409 || !window.confirm(`${e.message}\nContinue registering this possible duplicate?`)) throw e; ({ data: response } = await certificateApi.create(form, { name: file.name, data: encoded }, true)); }
      setNotice(`Certificate ${response.data.certificateId} was registered.`); setForm(empty); setFile(null);
      event.target.reset(); await refresh();
    } catch (e) { setError(messageOf(e)); } finally { setBusy(false); }
  }
  async function changeStatus(certificate) {
    const next = certificate.status === 'valid' ? 'revoked' : 'valid';
    const reason = next === 'revoked' ? window.prompt('Reason for revoking this certificate:') : '';
    if (next === 'revoked' && (!reason || reason.trim().length < 3)) return;
    try { await certificateApi.updateStatus(certificate.certificateId, next, reason); setNotice(`${certificate.certificateId} marked ${next}.`); await refresh(); }
    catch (e) { setError(messageOf(e)); }
  }
  async function saveEdit(event) {
    event.preventDefault();
    try { await certificateApi.update(editing.certificateId, editing); setNotice(`${editing.certificateId} updated.`); setEditing(null); await refresh(); }
    catch (e) { setError(messageOf(e)); }
  }
  async function replacePdf(certificate, file) {
    if (!file || !window.confirm(`Replace the stored original PDF for ${certificate.certificateId}?`)) return;
    if (file.size > 10 * 1024 * 1024) return setError('PDF must be 10 MB or smaller.');
    try {
      const bytes = new Uint8Array(await file.arrayBuffer()); let binary = '';
      for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
      await certificateApi.replacePdf(certificate.certificateId, { name: file.name, data: btoa(binary) });
      setNotice(`${certificate.certificateId} PDF replaced.`); await refresh();
    } catch (e) { setError(messageOf(e)); }
  }
  async function downloadAsset(request, filename) {
    try {
      const { data } = await request;
      const url = URL.createObjectURL(data); const anchor = document.createElement('a');
      anchor.href = url; anchor.download = filename; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setError(messageOf(e)); }
  }
  async function regenerate(certificate) {
    if (!window.confirm(`Regenerate the QR printable PDF for ${certificate.certificateId} from its preserved original?`)) return;
    try { await certificateApi.regeneratePdf(certificate.certificateId); setNotice(`Printable PDF regenerated for ${certificate.certificateId}.`); await refresh(); }
    catch (e) { setError(messageOf(e)); }
  }

  return <div className="cv-page">
    <header className="cv-heading"><div><p className="cv-eyebrow">STAFF WORKSPACE</p><h1>Certificate verification</h1><p>Register issued certificates and manage their verification status.</p></div><div className="cv-count"><strong>{summary.total}</strong><span>certificates</span><small>{summary.valid} valid · {summary.revoked} revoked</small></div></header>
    {error && <div className="cv-alert cv-alert--error" role="alert">{error}</div>}{notice && <div className="cv-alert" role="status">{notice}</div>}
    <section className="cv-card"><div className="cv-card__head"><div><h2>Register certificate</h2><p>Add certificate details and the original PDF to the staff register.</p></div></div>
      <form className="cv-form cv-form--register" onSubmit={submit}>
        <section className="cv-form-section" aria-labelledby="cv-details-title">
          <div className="cv-form-section__heading"><span className="cv-form-section__number">01</span><div><h3 id="cv-details-title">Certificate details</h3><p>Enter the information that appears on the certificate.</p></div></div>
          <div className="cv-form-grid">
            <label>Certificate number <span className="cv-optional">Optional</span><input placeholder="Leave blank to generate one" maxLength="64" value={form.certificateNumber} onChange={e => setForm({ ...form, certificateNumber: e.target.value })} /><small className="cv-field-help">You can use an existing reference number.</small></label>
            <label>Institution <span className="cv-required" aria-hidden="true">*</span><input required maxLength="250" autoComplete="organization" value={form.institution} onChange={e => setForm({ ...form, institution: e.target.value })} /></label>
            <label>Course or programme <span className="cv-required" aria-hidden="true">*</span><input required maxLength="250" placeholder="e.g. Professional Driver Training" value={form.course} onChange={e => setForm({ ...form, course: e.target.value })} /></label>
            <label>Department <span className="cv-optional">Optional</span><input maxLength="200" placeholder="Department or faculty" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} /></label>
            <label>Academic year <span className="cv-optional">Optional</span><input maxLength="40" placeholder="e.g. 2025-2026" value={form.academicYear} onChange={e => setForm({ ...form, academicYear: e.target.value })} /></label>
          </div>
        </section>
        <section className="cv-form-section" aria-labelledby="cv-recipient-title">
          <div className="cv-form-section__heading"><span className="cv-form-section__number">02</span><div><h3 id="cv-recipient-title">Recipient and dates</h3><p>Use the student name and dates printed on the document.</p></div></div>
          <div className="cv-form-grid cv-form-grid--three">
            <label className="cv-form-grid__full">Student name <span className="cv-required" aria-hidden="true">*</span><input required maxLength="200" autoComplete="name" placeholder="Full name as printed on the certificate" value={form.studentName} onChange={e => setForm({ ...form, studentName: e.target.value })} /></label>
            <label>Issue date <span className="cv-required" aria-hidden="true">*</span><input required type="date" value={form.issueDate} onChange={e => setForm({ ...form, issueDate: e.target.value })} /></label>
            <label>Graduation date <span className="cv-optional">Optional</span><input type="date" value={form.graduationDate} onChange={e => setForm({ ...form, graduationDate: e.target.value })} /></label>
          </div>
        </section>
        <section className="cv-form-section" aria-labelledby="cv-notes-title">
          <div className="cv-form-section__heading"><span className="cv-form-section__number">03</span><div><h3 id="cv-notes-title">Internal notes <span className="cv-optional">Optional</span></h3><p>For staff use only; notes are not shown on the public verification page.</p></div></div>
          <label className="cv-notes-field"><span className="cv-sr-only">Internal notes</span><textarea maxLength="2000" rows="3" placeholder="Add any relevant staff notes..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></label>
        </section>
        <section className="cv-form-section cv-form-section--upload" aria-labelledby="cv-upload-title">
          <div className="cv-form-section__heading"><span className="cv-form-section__number">04</span><div><h3 id="cv-upload-title">Upload certificate PDF <span className="cv-required" aria-hidden="true">*</span></h3><p>Choose the original PDF to attach to this record.</p></div></div>
          <label className="cv-upload-panel"><span className="cv-upload-panel__icon" aria-hidden="true">+</span><span className="cv-upload-panel__copy"><strong>{file ? file.name : 'Choose a PDF from your device'}</strong><small>{file ? (file.size / (1024 * 1024)).toFixed(2) + ' MB - Ready to upload' : 'PDF format - Maximum file size 10 MB'}</small></span><span className="cv-upload-panel__button">Browse files</span><input required type="file" accept="application/pdf,.pdf" onChange={e => setFile(e.target.files?.[0] || null)} /></label>
          <p className="cv-upload-note">The original is kept for staff. A separate printable copy includes the verification QR code.</p>
        </section>
        <div className="cv-form-submit"><p>Fields marked <span className="cv-required" aria-hidden="true">*</span> are required.</p><button disabled={busy} className="cv-primary">{busy ? 'Registering...' : 'Register certificate'}</button></div>
      </form>
    </section>
    <section className="cv-card cv-register">
      <div className="cv-register__header">
        <div className="cv-register__title"><span className="cv-register__title-icon" aria-hidden="true">&#10003;</span><div><p className="cv-register__eyebrow">RECORDS</p><h2>Certificate register</h2><p>Search records, review status, and manage certificate files.</p></div></div>
        <div className="cv-register__tools">
          <label className="cv-register__search"><span aria-hidden="true">&#9906;</span><span className="cv-sr-only">Search certificates</span><input placeholder="Search by student or certificate ID" value={query} onChange={e => { setPage(1); setQuery(e.target.value); }} /></label>
          <label className="cv-register__filter"><span className="cv-sr-only">Filter by status</span><select value={statusFilter} onChange={e => { setPage(1); setStatusFilter(e.target.value); }}><option value="">All statuses</option><option value="valid">Valid</option><option value="revoked">Revoked</option></select></label>
        </div>
      </div>
      <div className="cv-register__summary"><span className="cv-register__result-count">{pageInfo.total} {pageInfo.total === 1 ? 'certificate' : 'certificates'}</span><span>Page {pageInfo.page} of {Math.max(pageInfo.totalPages || 1, 1)}</span></div>
      <div className="cv-table-wrap"><table className="cv-table cv-table--register"><thead><tr><th scope="col">Certificate</th><th scope="col">Student</th><th scope="col">Course</th><th scope="col">Issue date</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead><tbody>
        {items.map(item => <tr key={item.certificateId}>
          <td><div className="cv-certificate-id"><span className="cv-certificate-id__mark" aria-hidden="true">C</span><strong>{item.certificateId}</strong></div><a className="cv-verification-link" href={'/verify-certificate/' + encodeURIComponent(item.verificationUrl?.split('/').pop() || item.certificateId)} target="_blank" rel="noreferrer">View verification page <span aria-hidden="true">&#8599;</span></a></td>
          <td><span className="cv-register__student">{item.studentName}</span></td>
          <td><span className="cv-register__course">{item.course}</span></td>
          <td><time className="cv-register__date" dateTime={item.issueDate}>{new Date(item.issueDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}</time></td>
          <td><span className={'cv-status cv-status--' + item.status}><span className="cv-status__dot" aria-hidden="true" />{item.status}</span></td>
          <td className="cv-table__actions-cell"><div className="cv-table__actions"><button type="button" className="cv-action-button cv-action-button--primary" onClick={() => downloadAsset(certificateApi.printablePdf(item.certificateId), 'certificate-' + item.certificateId + '-verified.pdf')}><span aria-hidden="true">&#8595;</span>Printable PDF</button><details className="cv-actions-menu"><summary>More actions <span aria-hidden="true">&#8942;</span></summary><div className="cv-actions-menu__panel">
            <button type="button" onClick={() => downloadAsset(certificateApi.originalPdf(item.certificateId), item.pdfOriginalFilename)}>Download original</button>
            <button type="button" onClick={() => downloadAsset(certificateApi.qr(item.certificateId), 'certificate-' + item.certificateId + '-qr.png')}>Download QR code</button>
            <button type="button" onClick={() => regenerate(item)}>Regenerate printable PDF</button>
            <button type="button" onClick={() => setEditing({ ...item, issueDate: item.issueDate?.slice(0, 10) || '', graduationDate: item.graduationDate?.slice(0, 10) || '' })}>Edit details</button>
            <label className="cv-actions-menu__file">Replace original PDF<input type="file" accept=".pdf,application/pdf" onChange={e => replacePdf(item, e.target.files?.[0])} /></label>
            <button type="button" onClick={() => changeStatus(item)}>{item.status === 'valid' ? 'Revoke certificate' : 'Restore certificate'}</button>
            <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(item.verificationUrl); setNotice('Verification link copied.'); } catch { window.prompt('Copy verification link', item.verificationUrl); } }}>Copy verification link</button>
            <button type="button" onClick={async () => { const { data } = await certificateApi.audit(item.certificateId); window.alert((data.data || []).map(row => new Date(row.createdAt).toLocaleString() + ' - ' + row.actor + ' - ' + row.action).join('\n') || 'No audit history'); }}>View audit history</button>
            <button type="button" className="cv-actions-menu__danger" onClick={async () => { if (window.confirm('Archive ' + item.certificateId + '? It will no longer appear in verification.')) { try { await certificateApi.archive(item.certificateId); setNotice(item.certificateId + ' archived.'); await refresh(); } catch (e) { setError(messageOf(e)); } } }}>Archive certificate</button>
          </div></details></div></td>
        </tr>)}
        {!items.length && <tr><td colSpan="6" className="cv-empty">{query || statusFilter ? 'No certificates match these filters.' : 'No certificates found. Register the first certificate above.'}</td></tr>}
      </tbody></table></div>
      <div className="cv-pagination cv-pagination--register"><span>{pageInfo.total} {pageInfo.total === 1 ? 'certificate' : 'certificates'} &middot; page {pageInfo.page} of {Math.max(pageInfo.totalPages || 1, 1)}</span><div><button type="button" disabled={page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}>Previous</button><button type="button" disabled={page >= (pageInfo.totalPages || 1)} onClick={() => setPage(value => value + 1)}>Next</button></div></div>
    </section>
    {editing && <div className="cv-modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setEditing(null); }}><section className="cv-modal" role="dialog" aria-modal="true" aria-labelledby="cv-edit-title"><h2 id="cv-edit-title">Edit {editing.certificateId}</h2><form className="cv-form" onSubmit={saveEdit}>{[['studentName','Student name'],['course','Course'],['institution','Institution'],['issueDate','Issue date'],['graduationDate','Graduation date'],['department','Department'],['academicYear','Academic year']].map(([key,label]) => <label key={key}>{label}<input type={key.toLowerCase().includes('date') ? 'date' : 'text'} required={['studentName','course','institution','issueDate'].includes(key)} value={editing[key] || ''} onChange={e => setEditing({ ...editing, [key]: e.target.value })} /></label>)}<label className="cv-form__wide">Internal notes<textarea rows="3" value={editing.notes || ''} onChange={e => setEditing({ ...editing, notes: e.target.value })} /></label><div className="cv-actions cv-form__wide"><button type="button" className="cv-secondary" onClick={() => setEditing(null)}>Cancel</button><button className="cv-primary">Save changes</button></div></form></section></div>}
  </div>;
}
