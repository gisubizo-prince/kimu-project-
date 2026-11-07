import { useEffect, useState } from 'react';
import api from '../../services/api';
import './ResourcePage.css';

export default function ResourcePage({ title, description, endpoint, columns, fields, resourceClassName = '', statusEndpoint, allowDelete = false, deleteConfirmation }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadItems() {
    setLoading(true);
    try {
      const response = await api.get(endpoint, { params: search ? { search } : {} });
      setItems(response.data.data || []);
      setError('');
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadItems(); }, [endpoint, search]);

  function changeField(event) { setForm({ ...form, [event.target.name]: event.target.value }); }
  function beginEdit(item) {
    setEditingId(item._id);
    setForm(Object.fromEntries(fields.map((field) => [field.name, item[field.name] ?? ''])));
  }
  function resetForm() { setEditingId(null); setForm({}); }
  async function save(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      if (editingId) await api.put(`${endpoint}/${editingId}`, form);
      else await api.post(endpoint, form);
      resetForm();
      setSuccess(editingId ? 'Record updated successfully.' : 'Record saved successfully.');
      await loadItems();
    } catch (requestError) { setError(requestError.message || 'Unable to save this record.'); }
    finally { setSaving(false); }
  }
  async function remove(item) {
    const message = typeof deleteConfirmation === 'function' ? deleteConfirmation(item) : deleteConfirmation || 'Delete this record?';
    if (!window.confirm(message)) return;
    try {
      await api.delete(`${endpoint}/${item._id}`);
      if (editingId === item._id) resetForm();
      setSuccess(`${item.fullName || 'Record'} deleted successfully.`);
      await loadItems();
    }
    catch (requestError) { setError(requestError.message); }
  }
  async function toggleStatus(item) {
    try {
      await api.patch(`${endpoint}/${item._id}/${statusEndpoint}`, { isActive: !item.isActive });
      setSuccess(`Student ${item.isActive ? 'deactivated' : 'activated'} successfully.`);
      await loadItems();
    } catch (requestError) { setError(requestError.message); }
  }

  return (
    <div className={`kimu-resource ${resourceClassName}`}>
      <header className="kimu-resource__intro"><div><h2>{title}</h2><p>{description}</p></div></header>
      <div className="kimu-resource__layout">
        <section className="kimu-panel kimu-resource__table-panel">
          <div className="kimu-resource__toolbar"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${title.toLowerCase()}...`} aria-label={`Search ${title}`} /><span>{items.length} records</span></div>
          {error && <p className="kimu-resource__error" role="alert">{error}</p>}
          {success && <p className="kimu-resource__success" role="status">{success}</p>}
          <div className="kimu-resource__table-wrap"><table><thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}<th>Actions</th></tr></thead><tbody>
            {loading ? <tr><td colSpan={columns.length + 1}>Loading records...</td></tr> : items.length === 0 ? <tr><td colSpan={columns.length + 1}>No records found.</td></tr> : items.map((item) => <tr key={item._id}>{columns.map((column) => <td data-label={column.label} key={column.key}>{column.render ? column.render(item) : item[column.key] || '-'}</td>)}<td data-label="Actions" className="kimu-resource__actions"><button type="button" onClick={() => beginEdit(item)}>Edit</button>{statusEndpoint ? <><button type="button" onClick={() => toggleStatus(item)}>{item.isActive ? 'Deactivate' : 'Activate'}</button>{allowDelete && <button type="button" onClick={() => remove(item)}>Delete</button>}</> : <button type="button" onClick={() => remove(item)}>Delete</button>}</td></tr>)}
          </tbody></table></div>
        </section>
        <form className="kimu-panel kimu-resource__form" onSubmit={save}><h3>{editingId ? 'Edit record' : 'Add record'}</h3>{success && <p className="kimu-resource__success" role="status">{success}</p>}{fields.map((field) => <label key={field.name}>{field.label}<input required={field.required !== false} type={field.type || 'text'} name={field.name} value={form[field.name] || ''} onChange={changeField} /></label>)}<div className="kimu-resource__form-actions"><button className="kimu-btn kimu-btn--primary" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Update record' : 'Add record'}</button>{editingId && <button className="kimu-btn kimu-btn--secondary" type="button" onClick={resetForm}>Cancel</button>}</div></form>
      </div>
    </div>
  );
}