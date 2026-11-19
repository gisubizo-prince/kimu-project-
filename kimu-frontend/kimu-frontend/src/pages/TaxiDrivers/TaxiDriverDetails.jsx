import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { taxiDriverApi } from '../../services/api';
import kimuLogo from '../../assets/LOGO WEBSITE OK.png';
import './TaxiDrivers.css';

export default function TaxiDriverDetails() {
  const { id } = useParams();
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    let active = true;
    taxiDriverApi.getPublished(id).then((response) => { if (active) setDriver(response.data.data); })
      .catch((requestError) => { if (active) setError(requestError.message || 'This driver profile is unavailable.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  if (loading) return <main className="kimu-driver-detail"><p className="kimu-driver-detail__status">Loading driver profile…</p></main>;
  if (error || !driver) return <main className="kimu-driver-detail"><p className="kimu-driver-detail__status">{error || 'Driver not found.'}</p><Link to="/#drivers" className="kimu-driver-detail__back">← Back to drivers</Link></main>;
  const gallery = [driver.profileImage, ...(driver.carImages || [])];
  const car = driver.car || {};
  const dial = driver.phone.replace(/[^+\d]/g, '');
  return <main className="kimu-driver-detail">
    <header className="kimu-driver-detail__nav"><Link to="/" aria-label="KIMU home"><img src={kimuLogo} alt="KIMU Transport"/></Link><Link to="/#drivers" className="kimu-driver-detail__back">← Meet our drivers</Link></header>
    <div className="kimu-driver-detail__wrap">
      <p className="kimu-driver-detail__eyebrow">KIMU TRANSPORT · KIGALI</p>
      <div className="kimu-driver-detail__grid">
        <section className="kimu-driver-detail__visual" aria-label="Driver and vehicle photos"><div className="kimu-driver-detail__main-image"><img src={gallery[activeImage]} alt={activeImage === 0 ? `${driver.fullName}, taxi driver` : `${driver.fullName}'s vehicle`} /><span>{activeImage === 0 ? 'YOUR DRIVER' : 'THE RIDE'}</span></div><div className="kimu-driver-detail__thumbs">{gallery.map((image, index) => <button key={`${index}-${image.slice(-14)}`} type="button" className={activeImage === index ? 'is-active' : ''} onClick={() => setActiveImage(index)} aria-label={`Show ${index === 0 ? 'driver portrait' : `vehicle photo ${index}`}`}><img src={image} alt=""/></button>)}</div></section>
        <section className="kimu-driver-detail__copy"><span className="kimu-driver-detail__availability"><i/> Available in {driver.location || 'Kigali, Rwanda'}</span><h1>{driver.fullName}</h1><p className="kimu-driver-detail__intro">{driver.bio || 'A professional KIMU Transport driver, ready to make your journey comfortable and reliable.'}</p>
          <div className="kimu-driver-detail__facts"><div><small>EXPERIENCE</small><strong>{driver.experienceYears ? `${driver.experienceYears} years` : 'Professional driver'}</strong></div><div><small>LANGUAGES</small><strong>{driver.languages?.length ? driver.languages.join(' · ') : 'Ask when booking'}</strong></div><div><small>BASED IN</small><strong>{driver.location || 'Kigali, Rwanda'}</strong></div></div>
          <div className="kimu-driver-detail__car"><div className="kimu-driver-detail__car-mark" aria-hidden="true">✳</div><div><small>THE VEHICLE</small><h2>{car.make} {car.model}</h2><p>{[car.year, car.color, car.type].filter(Boolean).join(' · ')}</p></div></div>
          <div className="kimu-driver-detail__plate"><span>RWANDA · {car.type || 'TAXI'}</span><strong>{car.plateNumber || 'KIMU DRIVER'}</strong></div>
          <a className="kimu-driver-detail__contact" href={`tel:${dial}`}>Call {driver.fullName.split(' ')[0]} <span>{driver.phone}</span><b>↗</b></a><p className="kimu-driver-detail__note">Contact the driver directly to confirm availability and trip details.</p>
        </section>
      </div>
    </div>
    <footer className="kimu-driver-detail__footer">KIMU TRANSPORT <span>·</span> PROFESSIONAL DRIVERS, LOCAL KNOWLEDGE</footer>
  </main>;
}
