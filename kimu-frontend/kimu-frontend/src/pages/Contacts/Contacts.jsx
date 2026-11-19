import { useEffect, useState } from 'react';
import { contactApi } from '../../services/api';
import { formatCatDateTime } from '../../utils/catTime';
import '../Operations/Operations.css';
import '../../components/common/ResourcePage.css';
import './Contacts.css';

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function loadContacts() {
      setLoading(true);
      try {
        const response = await contactApi.list(search.trim() ? { search: search.trim() } : {});
        if (active) {
          setContacts(response.data.data || []);
          setError('');
        }
      } catch (requestError) {
        if (active) setError(requestError.message || 'Unable to load contact submissions.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadContacts();
    return () => { active = false; };
  }, [search]);

  return (
    <div className="kimu-operations kimu-contacts">
      <header className="kimu-operations__heading">
        <div>
          <p className="kimu-eyebrow">WEBSITE ENQUIRIES</p>
          <h2>Contact submissions</h2>
          <p>Details submitted through the website enrollment form.</p>
        </div>
      </header>
      <section className="kimu-panel kimu-operations__list">
        <div className="kimu-list-toolbar">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search contacts"
            aria-label="Search contact submissions"
          />
          <span>{contacts.length} submissions</span>
        </div>
        {error && <p className="kimu-resource__error" role="alert">{error}</p>}
        <div className="kimu-resource__table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Telephone</th>
                <th>Email</th>
                <th>Training interest</th>
                <th>Experience</th>
                <th>Preferred contact</th>
                <th>Received</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7">Loading contact submissions...</td></tr>
              ) : contacts.length === 0 ? (
                <tr><td colSpan="7">No contact submissions found.</td></tr>
              ) : contacts.map((contact) => (
                <tr key={contact._id}>
                  <td className="kimu-name-cell">{contact.fullName}</td>
                  <td>{contact.phone}</td>
                  <td>{contact.email || '-'}</td>
                  <td>{contact.interest}</td>
                  <td>{contact.experience}</td>
                  <td>{contact.contactMethod}</td>
                  <td>{formatCatDateTime(contact.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
