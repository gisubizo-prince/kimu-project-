import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import './Certverify.css';
export default function VerifyCertificate() {
  const { id } = useParams();
  const [state, setState] = useState({ loading: true, certificate: null, error: '' });
  useEffect(() => { let live = true; api.get(`/certificates/verify/${encodeURIComponent(id)}`).then(({ data }) => { if (live) setState({ loading: false, certificate: data.certificate, error: '' }); }).catch((error) => { if (live) setState({ loading: false, certificate: null, error: error.status === 404 ? 'Certificate not found.' : error.message }); }); return () => { live = false; }; }, [id]);
  const pdfUrl = `${api.defaults.baseURL}/certificates/verify/${encodeURIComponent(id)}/pdf?download=1`;
  return <main className="cv-verify"><div className="cv-card"><p className="cv-eyebrow">KIMU TRANSPORT</p><h1>Certificate verification</h1>{state.loading ? <p>Checking the live certificate register…</p> : state.error ? <p className="cv-alert cv-alert--error">{state.error}</p> : <><p className={`cv-verify__result ${state.certificate.status === 'valid' ? '' : 'is-revoked'}`}>{state.certificate.status === 'valid' ? 'Certificate verified' : 'Certificate revoked'}</p><dl>{[['Certificate ID', state.certificate.certificateId], ['Student', state.certificate.studentName], ['Course', state.certificate.course], ['Institution', state.certificate.institution], ['Issue date', new Date(state.certificate.issueDate).toLocaleDateString()]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>{state.certificate.pdfAvailable && <a className="cv-verify__pdf" href={pdfUrl}>Download printable certificate</a>}</>}</div></main>;
}
