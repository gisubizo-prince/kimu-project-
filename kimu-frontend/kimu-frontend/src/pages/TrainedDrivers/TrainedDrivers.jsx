import { useEffect, useMemo, useState } from 'react';
import { trainedDriverApi } from '../../services/api';
import './TrainedDrivers.css';

const today = new Date().toISOString().slice(0, 10);
const EMPTY = { fullName: '', phone: '', vehicle: '', startedAt: today };

export default function TrainedDrivers() {
  const [drivers, setDrivers] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  async function load() {
    try { const response = await trainedDriverApi.list(); setDrivers(response.data.data || []); }
    catch (error) { setMessage({ type: 'error', text: error.message || 'Abashoferi ntibashoboye kuboneka.' }); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const visibleDrivers = useMemo(() => drivers.filter((driver) => `${driver.fullName} ${driver.phone} ${driver.vehicle}`.toLowerCase().includes(search.toLowerCase())), [drivers, search]);
  function reset() { setForm(EMPTY); setEditing(''); }
  function edit(driver) {
    setEditing(driver._id);
    setForm({ fullName: driver.fullName || '', phone: driver.phone || '', vehicle: driver.vehicle || '', startedAt: driver.startedAt ? new Date(driver.startedAt).toISOString().slice(0, 10) : today });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  async function save(event) {
    event.preventDefault(); setSaving(true); setMessage({ type: '', text: '' });
    try {
      const payload = { ...form, startedAt: new Date(`${form.startedAt}T12:00:00`).toISOString() };
      if (editing) await trainedDriverApi.update(editing, payload); else await trainedDriverApi.create(payload);
      reset(); await load(); setMessage({ type: 'success', text: editing ? 'Amakuru y’umushoferi yavuguruwe.' : 'Umushoferi yongewe ku rutonde.' });
    } catch (error) { setMessage({ type: 'error', text: error.message || 'Ntibyashobotse kubika aya makuru.' }); }
    finally { setSaving(false); }
  }
  async function remove(driver) {
    if (!window.confirm(`Delete ${driver.fullName} from this list?`)) return;
    try { await trainedDriverApi.remove(driver._id); await load(); setMessage({ type: 'success', text: 'Umushoferi yakuwe ku rutonde.' }); }
    catch (error) { setMessage({ type: 'error', text: error.message || 'Ntibyashobotse gusiba uyu mushoferi.' }); }
  }

  return <main className="trained-drivers">
    <header className="trained-drivers__heading"><div><p className="kimu-eyebrow">ABASOHOZI BA MAITRISE</p><h2>Abashoferi bahuguwe</h2><p>Andika kandi urebe abashoferi barangije amahugurwa.</p></div><a className="trained-drivers__view" href="#driver-directory"><span aria-hidden="true">↓</span> View abashoferi <b>{drivers.length}</b></a></header>
    {message.text && <p className={`trained-drivers__message is-${message.type}`} role={message.type === 'error' ? 'alert' : 'status'}>{message.text}</p>}
    <div className="trained-drivers__layout">
      <form className="kimu-panel trained-drivers__form" onSubmit={save}>
        <div className="trained-drivers__form-title"><span className="trained-drivers__form-icon">＋</span><div><p className="kimu-eyebrow">{editing ? 'HINDURA AMAKURU' : 'ANDIKA UMUSHOFERI'}</p><h3>{editing ? 'Hindura umushoferi' : 'Ongeraho umushoferi'}</h3></div></div>
        <label>Amazina yose<input required maxLength="120" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} placeholder="Urugero: Jean Claude" /></label>
        <label>Telefoni<input required type="tel" maxLength="30" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+250 7xx xxx xxx" /></label>
        <label>Imodoka<input value={form.vehicle} maxLength="120" onChange={(event) => setForm({ ...form, vehicle: event.target.value })} placeholder="Urugero: Toyota Corolla · RAD 123A" /></label>
        <label>Igihe yatangiye<input required type="date" value={form.startedAt} onChange={(event) => setForm({ ...form, startedAt: event.target.value })} /></label>
        <div className="trained-drivers__form-actions"><button className="kimu-btn kimu-btn--primary" type="submit" disabled={saving}>{saving ? 'Birabikwa…' : editing ? 'Bika impinduka' : 'Ongeraho umushoferi'}</button>{editing && <button type="button" className="trained-drivers__cancel" onClick={reset}>Reka</button>}</div>
        <p className="trained-drivers__hint">Abanyeshuri bashyizwe kuri <strong>Pass</strong> baziyongera hano.</p>
      </form>

      <section className="kimu-panel trained-drivers__directory" id="driver-directory">
        <div className="trained-drivers__directory-head"><div><p className="kimu-eyebrow">URUTONDE RWABO</p><h3>Abashoferi bose</h3><span>{drivers.length} {drivers.length === 1 ? 'umuntu' : 'abantu'} banditswe</span></div><label className="trained-drivers__search"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Shaka umushoferi…" aria-label="Search drivers" /></label></div>
        <div className="trained-drivers__table-wrap"><table><thead><tr><th>UMUSHOFERI</th><th>TELEFONI</th><th>IMODOKA</th><th>IGIHE YATANGIYE</th><th>UBWOKO</th><th></th></tr></thead><tbody>
          {loading ? <tr><td colSpan="6" className="trained-drivers__empty">Birimo gutegurwa…</td></tr> : visibleDrivers.length === 0 ? <tr><td colSpan="6" className="trained-drivers__empty">{search ? 'Nta mushoferi uhuye n’ayo makuru.' : 'Nta bashoferi barandikwa. Uzuza form kugira utangire.'}</td></tr> : visibleDrivers.map((driver) => <tr key={driver._id}><td><div className="trained-drivers__person"><span>{initials(driver.fullName)}</span><strong>{driver.fullName}</strong></div></td><td><a href={`tel:${driver.phone}`}>{driver.phone}</a></td><td>{driver.vehicle || <span className="trained-drivers__muted">Ntabwo yatanzwe</span>}</td><td>{formatDate(driver.startedAt)}</td><td><span className={`trained-drivers__badge ${driver.sourceStudentId ? 'is-student' : ''}`}>{driver.sourceStudentId ? 'Uwatsinze' : 'Yanditswe'}</span></td><td className="trained-drivers__actions">{!driver.sourceStudentId && <><button type="button" onClick={() => edit(driver)}>Hindura</button><button type="button" onClick={() => remove(driver)} aria-label={`Delete ${driver.fullName}`}>Siba</button></>}</td></tr>)}
        </tbody></table></div>
      </section>
    </div>
  </main>;
}

function initials(name) { return (name || '?').trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase(); }
function formatDate(value) { return value ? new Intl.DateTimeFormat('rw-RW', { dateStyle: 'medium', timeZone: 'Africa/Kigali' }).format(new Date(value)) : '—'; }
