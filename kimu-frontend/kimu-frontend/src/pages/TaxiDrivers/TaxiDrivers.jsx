import { useEffect, useRef, useState } from 'react';
import { taxiDriverApi } from '../../services/api';
import '../Operations/Operations.css';
import './TaxiDrivers.css';

const EMPTY = { fullName: '', phone: '', bio: '', experienceYears: '', languages: '', location: 'Kigali, Rwanda', make: '', model: '', year: '', color: '', plateNumber: '', type: 'Taxi' };
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export default function TaxiDrivers() {
  const [drivers, setDrivers] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [profileImage, setProfileImage] = useState('');
  const [carImages, setCarImages] = useState([]);
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyImage, setBusyImage] = useState(false);
  const [removingId, setRemovingId] = useState('');
  const [feedback, setFeedback] = useState({ type: '', text: '' });
  const profileInput = useRef(null);
  const carsInput = useRef(null);

  async function loadDrivers() {
    try {
      const response = await taxiDriverApi.listForManagement();
      setDrivers(response.data.data || []);
    } catch (error) {
      setFeedback({ type: 'error', text: error.message || 'Unable to load taxi drivers.' });
    } finally { setLoading(false); }
  }

  useEffect(() => { loadDrivers(); }, []);

  function changeField(event) { setForm((current) => ({ ...current, [event.target.name]: event.target.value })); }

  async function readImages(files, maxCount) {
    setFeedback({ type: '', text: '' });
    const selected = Array.from(files || []);
    if (selected.length > maxCount) throw new Error(`Choose up to ${maxCount} images.`);
    if (selected.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))) throw new Error('Choose JPEG, PNG, or WebP images.');
    if (selected.some((file) => file.size > MAX_IMAGE_SIZE)) throw new Error('Each original image must be smaller than 10 MB.');
    setBusyImage(true);
    try { return await Promise.all(selected.map(optimizeImage)); }
    finally { setBusyImage(false); }
  }

  async function selectProfile(event) {
    try {
      const [image] = await readImages(event.target.files, 1);
      if (image) setProfileImage(image);
    } catch (error) { setFeedback({ type: 'error', text: error.message }); }
    event.target.value = '';
  }

  async function selectCars(event) {
    try {
      const images = await readImages(event.target.files, 6);
      setCarImages((current) => [...current, ...images].slice(0, 6));
    } catch (error) { setFeedback({ type: 'error', text: error.message }); }
    event.target.value = '';
  }

  function resetForm() {
    setForm(EMPTY); setProfileImage(''); setCarImages([]); setEditingId('');
    if (profileInput.current) profileInput.current.value = '';
    if (carsInput.current) carsInput.current.value = '';
  }

  function editDriver(driver) {
    setEditingId(driver._id);
    setForm({ fullName: driver.fullName || '', phone: driver.phone || '', bio: driver.bio || '', experienceYears: driver.experienceYears ?? '', languages: (driver.languages || []).join(', '), location: driver.location || 'Kigali, Rwanda', make: driver.car?.make || '', model: driver.car?.model || '', year: driver.car?.year || '', color: driver.car?.color || '', plateNumber: driver.car?.plateNumber || '', type: driver.car?.type || 'Taxi' });
    setProfileImage(driver.profileImage || ''); setCarImages(driver.carImages || []);
    setFeedback({ type: '', text: '' });
    document.querySelector('.kimu-taxi-admin__form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function saveDriver(event) {
    event.preventDefault(); setFeedback({ type: '', text: '' });
    if (!profileImage) { setFeedback({ type: 'error', text: 'Add a driver portrait to continue.' }); return; }
    setSaving(true);
    const { make, model, year, color, plateNumber, type, ...driverFields } = form;
    const payload = { ...driverFields, experienceYears: Number(form.experienceYears || 0), languages: form.languages.split(',').map((language) => language.trim()).filter(Boolean), car: { make, model, year: Number(year) || undefined, color, plateNumber, type }, profileImage, carImages };
    try {
      const response = editingId ? await taxiDriverApi.update(editingId, payload) : await taxiDriverApi.create(payload);
      if (editingId) setDrivers((current) => current.map((item) => item._id === editingId ? response.data.data : item));
      else setDrivers((current) => [response.data.data, ...current]);
      resetForm(); setFeedback({ type: 'success', text: editingId ? 'Driver profile updated.' : 'Driver published on the homepage.' });
    } catch (error) { setFeedback({ type: 'error', text: error.message || 'Unable to save driver profile.' }); }
    finally { setSaving(false); }
  }

  async function removeDriver(driver) {
    if (!window.confirm(`Remove ${driver.fullName} from the driver directory?`)) return;
    setRemovingId(driver._id); setFeedback({ type: '', text: '' });
    try {
      await taxiDriverApi.remove(driver._id); setDrivers((current) => current.filter((item) => item._id !== driver._id));
      if (editingId === driver._id) resetForm();
      setFeedback({ type: 'success', text: 'Driver profile removed.' });
    } catch (error) { setFeedback({ type: 'error', text: error.message || 'Unable to remove this driver.' }); }
    finally { setRemovingId(''); }
  }

  return <div className="kimu-taxi-admin">
    <header className="kimu-operations__heading"><div><p className="kimu-eyebrow">HOMEPAGE CONTENT</p><h2>Taxi drivers</h2><p>Introduce Kigali’s professional drivers, their vehicles and the people behind the wheel.</p></div><span className="kimu-taxi-admin__count">{drivers.length} profiles</span></header>
    {feedback.text && <p className={`kimu-taxi-admin__feedback is-${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>{feedback.text}</p>}
    <div className="kimu-taxi-admin__layout">
      <section className="kimu-panel kimu-taxi-admin__list"><div className="kimu-taxi-admin__section-heading"><div><p className="kimu-eyebrow">DRIVER DIRECTORY</p><h3>Published profiles</h3></div><span>{drivers.length} total</span></div>
        {loading ? <p className="kimu-taxi-admin__empty">Loading drivers…</p> : drivers.length === 0 ? <div className="kimu-taxi-admin__empty"><strong>No taxi drivers yet</strong><span>Add your first profile and it will appear on the homepage carousel.</span></div> : <div className="kimu-taxi-admin__items">{drivers.map((driver) => <article className="kimu-taxi-admin__item" key={driver._id}><img src={driver.profileImage} alt=""/><div className="kimu-taxi-admin__item-copy"><strong>{driver.fullName}</strong><span>{driver.car?.make} {driver.car?.model} · {driver.location || 'Kigali, Rwanda'}</span><small>{driver.phone}</small></div><div className="kimu-taxi-admin__item-actions"><button type="button" onClick={() => editDriver(driver)}>Edit</button><button type="button" onClick={() => removeDriver(driver)} disabled={removingId === driver._id}>{removingId === driver._id ? 'Removing…' : 'Remove'}</button></div></article>)}</div>}
      </section>
      <form className="kimu-panel kimu-taxi-admin__form" onSubmit={saveDriver}>
        <div className="kimu-taxi-admin__section-heading"><div><p className="kimu-eyebrow">{editingId ? 'UPDATE DRIVER PROFILE' : 'ADD TO THE TEAM'}</p><h3>{editingId ? 'Edit driver' : 'New driver'}</h3></div>{editingId && <button className="kimu-taxi-admin__cancel" type="button" onClick={resetForm}>Cancel edit</button>}</div>
        <label className="kimu-taxi-admin__upload"><input ref={profileInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={selectProfile} disabled={saving || busyImage}/>{profileImage ? <><img className="kimu-taxi-admin__portrait" src={profileImage} alt="Driver portrait preview"/><span><strong>Portrait ready</strong><small>Tap to choose another</small></span></> : <span><strong>Upload driver portrait</strong><small>JPEG, PNG or WebP · optimized for the website</small><em>Browse image</em></span>}</label>
        <div className="kimu-taxi-admin__fields"><label>Driver’s full name<input name="fullName" value={form.fullName} onChange={changeField} maxLength="120" placeholder="e.g. Aline Mukamana" required disabled={saving}/></label><label>Phone number<input name="phone" type="tel" value={form.phone} onChange={changeField} maxLength="30" placeholder="+250 7xx xxx xxx" required disabled={saving}/></label><label>Based in<input name="location" value={form.location} onChange={changeField} maxLength="120" required disabled={saving}/></label><label>Years driving<input name="experienceYears" type="number" min="0" max="60" value={form.experienceYears} onChange={changeField} placeholder="5" disabled={saving}/></label><label>Languages spoken<input name="languages" value={form.languages} onChange={changeField} placeholder="Kinyarwanda, English" disabled={saving}/></label></div>
        <label className="kimu-taxi-admin__bio">About the driver<textarea name="bio" value={form.bio} onChange={changeField} maxLength="1200" rows="3" placeholder="A short introduction, experience and service approach…" disabled={saving}/></label>
        <div className="kimu-taxi-admin__section-label"><strong>Vehicle details</strong><span>What passengers can expect to ride in</span></div>
        <div className="kimu-taxi-admin__fields"><label>Make<input name="make" value={form.make} onChange={changeField} placeholder="Toyota" required disabled={saving}/></label><label>Model<input name="model" value={form.model} onChange={changeField} placeholder="Corolla" required disabled={saving}/></label><label>Year<input name="year" type="number" min="1980" max="2100" value={form.year} onChange={changeField} placeholder="2021" disabled={saving}/></label><label>Color<input name="color" value={form.color} onChange={changeField} placeholder="White" disabled={saving}/></label><label>Plate number<input name="plateNumber" value={form.plateNumber} onChange={changeField} placeholder="RAD 123 A" disabled={saving}/></label><label>Vehicle type<input name="type" value={form.type} onChange={changeField} placeholder="Taxi" disabled={saving}/></label></div>
        <div className="kimu-taxi-admin__section-label"><strong>Vehicle photos</strong><span>Up to 6 images</span></div>
        <div className="kimu-taxi-admin__gallery">{carImages.map((image, index) => <div key={`${index}-${image.slice(-16)}`}><img src={image} alt={`Vehicle ${index + 1}`}/><button type="button" aria-label="Remove vehicle photo" onClick={() => setCarImages((current) => current.filter((_, imageIndex) => imageIndex !== index))}>×</button></div>)}{carImages.length < 6 && <button className="kimu-taxi-admin__add-photo" type="button" onClick={() => carsInput.current?.click()} disabled={saving || busyImage}>{busyImage ? 'Preparing…' : '+ Add photos'}</button>}<input ref={carsInput} hidden type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={selectCars}/></div>
        <div className="kimu-taxi-admin__form-footer"><span>Visible on the public homepage and driver profile page.</span><button type="submit" className="kimu-btn kimu-btn--primary" disabled={saving || busyImage}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Publish driver'} <ArrowIcon/></button></div>
      </form>
    </div>
  </div>;
}

function optimizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onerror = () => reject(new Error('Unable to read the selected image.'));
    reader.onload = () => { const image = new Image(); image.onerror = () => reject(new Error('The selected file is not a readable image.')); image.onload = () => {
      const scale = Math.min(1, 1000 / Math.max(image.naturalWidth, image.naturalHeight)); const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d'); if (!context) { reject(new Error('Unable to prepare the selected image.')); return; }
      context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height);
      let result = canvas.toDataURL('image/webp', 0.78); if (!result.startsWith('data:image/webp')) result = canvas.toDataURL('image/jpeg', 0.78);
      if (Math.ceil((result.length - result.indexOf(',') - 1) * 3 / 4) > 1024 * 1024) { reject(new Error('This image is too large after optimization. Choose a smaller photo.')); return; }
      resolve(result);
    }; image.src = reader.result; }; reader.readAsDataURL(file);
  });
}

function ArrowIcon() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>; }
