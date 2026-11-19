import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { catDateKey, formatCatDate, formatCatDateTime } from '../../utils/catTime';
import '../Operations/Operations.css';

export default function VisitorList() {
  const [visitors, setVisitors] = useState([]); const [search, setSearch] = useState(''); const [selectedDate, setSelectedDate] = useState(catDateKey()); const [error, setError] = useState('');
  async function load() { try { const response = await api.get('/visitors', { params: search ? { search } : {} }); setVisitors((response.data.data || []).filter((visitor) => localDateKey(visitor.checkIn || visitor.createdAt) === selectedDate)); } catch (requestError) { setError(requestError.message); } }
  useEffect(() => { load(); }, [search, selectedDate]);
  async function checkout(id) { try { await api.put(`/visitors/${id}`, { checkOut: new Date(), status: 'checked_out' }); await load(); } catch (requestError) { setError(requestError.message); } }
  return <div className="kimu-operations"><div className="kimu-operations__heading"><div><p className="kimu-eyebrow">VISITOR LOG</p><h2>Visitors for {formatCatDate(selectedDate)}</h2><p>Today&apos;s visitors are shown by default. Choose another day to view older records.</p></div><Link className="kimu-btn kimu-btn--primary" to="/visitors">Record visitor</Link></div><section className="kimu-panel kimu-operations__list"><div className="kimu-list-toolbar"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search visitors" aria-label="Search visitors" /><label className="kimu-date-filter">Day<input type="date" lang="en-GB" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /></label><span>{visitors.length} visits</span></div>{error && <p className="kimu-resource__error">{error}</p>}<div className="kimu-resource__table-wrap"><table><thead><tr><th>Name</th><th>Phone</th><th>Reason</th><th>Arrival</th><th>Status</th><th>Action</th></tr></thead><tbody>{visitors.length === 0 ? <tr><td colSpan="6">No visitor records found for this day.</td></tr> : visitors.map((visitor) => <tr key={visitor._id}><td className="kimu-name-cell">{visitor.fullName}</td><td>{visitor.phone || '-'}</td><td>{visitor.reason}</td><td>{formatDateTime(visitor.checkIn || visitor.createdAt)}</td><td><span className={`kimu-status kimu-status--${visitor.status}`}>{visitor.status === 'checked_in' ? 'Checked in' : 'Checked out'}</span></td><td>{visitor.status === 'checked_in' && <button className="kimu-link-button" onClick={() => checkout(visitor._id)}>Check out</button>}</td></tr>)}</tbody></table></div></section></div>;
}

function localDateKey(value) { return catDateKey(value); }
function formatDateTime(value) { return formatCatDateTime(value); }