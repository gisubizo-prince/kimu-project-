import { useEffect, useRef, useState } from 'react';
import { testimonialApi } from '../../services/api';
import '../Operations/Operations.css';
import './Testimonials.css';

const EMPTY_FORM = { fullName: '', role: 'MAITRISE student', message: '' };
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_OPTIMIZED_IMAGE_SIZE = 1024 * 1024;

export default function Testimonials() {
  const [testimonials, setTestimonials] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [image, setImage] = useState('');
  const [imageName, setImageName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);
  const [removingId, setRemovingId] = useState('');
  const [feedback, setFeedback] = useState({ type: '', text: '' });
  const fileInput = useRef(null);

  useEffect(() => {
    let active = true;
    testimonialApi.listForManagement()
      .then((response) => {
        if (active) setTestimonials(response.data.data || []);
      })
      .catch((error) => {
        if (active) setFeedback({ type: 'error', text: error.message || 'Unable to load testimonials.' });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  function changeField(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function selectImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFeedback({ type: '', text: '' });

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setFeedback({ type: 'error', text: 'Choose a JPEG, PNG, or WebP image.' });
      event.target.value = '';
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setFeedback({ type: 'error', text: 'Choose an image smaller than 10 MB.' });
      event.target.value = '';
      return;
    }

    setProcessingImage(true);
    try {
      const optimized = await optimizePortrait(file);
      const base64Start = optimized.indexOf(',') + 1;
      const optimizedBytes = Math.ceil((optimized.length - base64Start) * 3 / 4);
      if (optimizedBytes > MAX_OPTIMIZED_IMAGE_SIZE) {
        throw new Error('This image could not be compressed small enough. Please choose a smaller portrait.');
      }
      setImage(optimized);
      setImageName(file.name);
    } catch (error) {
      setImage('');
      setImageName('');
      setFeedback({ type: 'error', text: error.message || 'Unable to process this image.' });
      event.target.value = '';
    } finally {
      setProcessingImage(false);
    }
  }

  async function saveTestimonial(event) {
    event.preventDefault();
    setFeedback({ type: '', text: '' });
    if (!image) {
      setFeedback({ type: 'error', text: 'Add a student portrait before publishing this testimonial.' });
      return;
    }

    setSaving(true);
    try {
      const response = await testimonialApi.create({ ...form, image });
      setTestimonials((current) => [response.data.data, ...current]);
      setForm(EMPTY_FORM);
      setImage('');
      setImageName('');
      if (fileInput.current) fileInput.current.value = '';
      setFeedback({ type: 'success', text: 'Testimonial published on the homepage.' });
    } catch (error) {
      setFeedback({ type: 'error', text: error.message || 'Unable to publish this testimonial.' });
    } finally {
      setSaving(false);
    }
  }

  async function removeTestimonial(testimonial) {
    if (!window.confirm(`Remove ${testimonial.fullName}'s testimonial from the homepage?`)) return;
    setRemovingId(testimonial._id);
    setFeedback({ type: '', text: '' });
    try {
      await testimonialApi.remove(testimonial._id);
      setTestimonials((current) => current.filter((item) => item._id !== testimonial._id));
      setFeedback({ type: 'success', text: 'Testimonial removed from the homepage.' });
    } catch (error) {
      setFeedback({ type: 'error', text: error.message || 'Unable to remove this testimonial.' });
    } finally {
      setRemovingId('');
    }
  }

  return (
    <div className="kimu-testimonials-admin">
      <header className="kimu-operations__heading">
        <div>
          <p className="kimu-eyebrow">HOMEPAGE CONTENT</p>
          <h2>Student testimonials</h2>
          <p>Add real student stories and manage what visitors see on the homepage.</p>
        </div>
        <span className="kimu-testimonials-admin__count">{testimonials.length} published</span>
      </header>

      {feedback.text && <p className={`kimu-testimonials-admin__feedback is-${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>{feedback.text}</p>}

      <div className="kimu-testimonials-admin__layout">
        <section className="kimu-panel kimu-testimonials-admin__list">
          <div className="kimu-testimonials-admin__section-heading">
            <div><p className="kimu-eyebrow">CURRENTLY LIVE</p><h3>Published stories</h3></div>
            <span>{testimonials.length} total</span>
          </div>
          {loading ? (
            <p className="kimu-testimonials-admin__empty">Loading published testimonials…</p>
          ) : testimonials.length === 0 ? (
            <div className="kimu-testimonials-admin__empty">
              <span className="kimu-testimonials-admin__empty-icon"><QuoteIcon /></span>
              <strong>No testimonials yet</strong>
              <span>Your first approved story will appear on the homepage after you publish it.</span>
            </div>
          ) : (
            <div className="kimu-testimonials-admin__items">
              {testimonials.map((testimonial) => (
                <article className="kimu-testimonials-admin__item" key={testimonial._id}>
                  <img src={testimonial.image} alt="" />
                  <div className="kimu-testimonials-admin__item-copy">
                    <strong>{testimonial.fullName}</strong>
                    <span>{testimonial.role || 'MAITRISE student'}</span>
                    <p>{testimonial.message}</p>
                  </div>
                  <button type="button" onClick={() => removeTestimonial(testimonial)} disabled={removingId === testimonial._id} aria-label={`Remove ${testimonial.fullName}'s testimonial`}>
                    {removingId === testimonial._id ? 'Removing…' : 'Remove'}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <form className="kimu-panel kimu-testimonials-admin__form" onSubmit={saveTestimonial}>
          <div className="kimu-testimonials-admin__section-heading">
            <div><p className="kimu-eyebrow">ADD A STUDENT STORY</p><h3>New testimonial</h3></div>
            <span className="kimu-testimonials-admin__form-mark"><QuoteIcon /></span>
          </div>

          <label className="kimu-testimonials-admin__upload">
            <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={selectImage} disabled={saving || processingImage} />
            {image ? (
              <>
                <img className="kimu-testimonials-admin__preview" src={image} alt="Selected student portrait preview" />
                <span className="kimu-testimonials-admin__upload-copy"><strong>Portrait ready</strong><small>{imageName}</small><em>Choose a different image</em></span>
              </>
            ) : (
              <>
                <span className="kimu-testimonials-admin__upload-icon"><UploadIcon /></span>
                <span className="kimu-testimonials-admin__upload-copy"><strong>{processingImage ? 'Preparing portrait…' : 'Upload student portrait'}</strong><small>JPEG, PNG or WebP · optimized for the website</small><em>Browse image</em></span>
              </>
            )}
          </label>

          <div className="kimu-testimonials-admin__fields">
            <label>Student name<input name="fullName" value={form.fullName} onChange={changeField} maxLength="120" placeholder="e.g. Aline Mukamana" required disabled={saving} /></label>
            <label>Subtitle <span className="kimu-testimonials-admin__optional">Optional</span><input name="role" value={form.role} onChange={changeField} maxLength="80" placeholder="MAITRISE student" disabled={saving} /></label>
          </div>

          <label className="kimu-testimonials-admin__message">Testimonial message<textarea name="message" value={form.message} onChange={changeField} maxLength="1200" rows="6" placeholder="Share the student's words about their experience…" required disabled={saving} /><span>{form.message.length}/1,200 characters</span></label>

          <div className="kimu-testimonials-admin__form-footer">
            <span><LockIcon /> Only administrators can publish or remove stories.</span>
            <button type="submit" className="kimu-btn kimu-btn--primary" disabled={saving || processingImage}>
              {saving ? 'Publishing…' : 'Publish testimonial'} {!saving && <ArrowIcon />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function optimizePortrait(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Unable to read the selected image.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('The selected file is not a readable image.'));
      image.onload = () => {
        const maxDimension = 720;
        const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Your browser could not prepare the portrait image.'));
          return;
        }
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const webp = canvas.toDataURL('image/webp', 0.82);
        resolve(webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.82));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function QuoteIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 11H5V6h6v6c0 3-1.6 5-4.5 6M19 11h-5V6h6v6c0 3-1.6 5-4.5 6" /></svg>;
}

function UploadIcon() {
  return <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" /><path d="M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5" /></svg>;
}

function LockIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3"/></svg>;
}

function ArrowIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>;
}
