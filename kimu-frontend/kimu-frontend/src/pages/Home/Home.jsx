import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { contactApi, testimonialApi, taxiDriverApi } from '../../services/api';
import kimuLogo from '../../assets/LOGO WEBSITE OK.png';
import instructorLearnerPhoto from '../../assets/hero-photos/black-woman-driver.jpg';
import drivingLessonPhoto from '../../assets/hero-photos/adult-driving-lesson.jpg';
import confidentDriverPhoto from '../../assets/hero-photos/smiling-driver-ethiopia.jpg';
import practicePhoto from '../../assets/hero-photos/black-woman-practice.jpg';
import blackMaleDriverPhoto from '../../assets/hero-photos/black-man-driver.jpg';
import gpsPhoto from '../../assets/hero-photos/gps-navigation.jpg';
import './Home.css';



const slides = [
  {
    label: 'KIMU TRANSPORT PRESENTS MAITRISE',
    title: ['FROM LEARNING TO DRIVE', 'TO BECOMING A', 'PROFESSIONAL DRIVER.'],
    text: "Your journey to professional driving starts here. Gain practical driving skills, master navigation and prepare for opportunities in Rwanda\'s transport industry.",
    image: instructorLearnerPhoto,
    credit: 'Gustavo Fring',
    source: 'https://www.pexels.com/photo/smiling-woman-at-steering-wheel-in-car-6817008/',
  },
  {
    label: 'CONFIDENT, PROFESSIONAL DRIVERS',
    title: ['LEARN WITH GUIDANCE.', 'DRIVE WITH CONFIDENCE.'],
    text: 'Build practical driving skills with clear instruction, focused practice and professional guidance.',
    image: practicePhoto,
    credit: 'Gustavo Fring',
    source: 'https://www.pexels.com/photo/a-young-woman-behind-the-steering-wheel-6816982/',
  },
  {
    label: 'YOUR JOURNEY STARTS HERE',
    title: ['YOUR NEXT CHAPTER', 'STARTS BEHIND THE WHEEL.'],
    text: 'Prepare for professional driving with practical skills, road awareness and the confidence to take the next step.',
    image: blackMaleDriverPhoto,
    credit: 'cottonbro studio',
    source: 'https://www.pexels.com/photo/man-in-white-dress-shirt-driving-car-4606336/',
  },
];
const navTargets = ['home', 'about', 'maitrize', 'programme', 'drivers', 'testimonials', 'contact'];

const modules = [
  ['01', 'Practical Driving', 'Vehicle handling, steering, acceleration, braking and responsible driving.', practicePhoto, 'Gustavo Fring'],
  ['02', 'Google Maps & GPS', 'Search destinations, understand routes, share locations and navigate customers.', gpsPhoto, 'Dustin Konrad'],
  ['03', 'Road Circulation', 'Road signs, markings, traffic rules, junctions, lane discipline and safe circulation.', blackMaleDriverPhoto, 'cottonbro studio'],
  ['04', 'Professional Parking', 'Safe parking, reverse parking, parallel parking and accurate positioning.', drivingLessonPhoto, 'Gustavo Fring'],
  ['05', 'Road Safety', 'Hazard awareness, defensive habits, safe distances and responsible driving.', blackMaleDriverPhoto, 'cottonbro studio'],
  ['06', 'Taxi Professionalism', 'Customer care, communication, punctuality and responsible service.', confidentDriverPhoto, 'Abiy Fikru'],
  ['07', 'Vehicle Inspection', 'Basic checks, cleanliness, maintenance awareness and reporting problems.', blackMaleDriverPhoto, 'cottonbro studio'],
  ['08', 'Real-World Preparation', 'Build the confidence and habits expected in professional transport work.', confidentDriverPhoto, 'Abiy Fikru'],
];

const journey = [
  ['01', 'Register', 'Join the MAITRISE training programme.'],
  ['02', 'Learn', 'Understand driving principles, road safety and professional conduct.'],
  ['03', 'Practice', 'Develop practical driving, parking and circulation skills.'],
  ['04', 'Master Navigation', 'Learn Google Maps, GPS navigation and location sharing.'],
  ['05', 'Prepare', 'Build the confidence expected of professional drivers.'],
  ['06', 'Explore Opportunities', 'Learn about opportunities subject to eligibility and selection.'],
];

const faqs = [
  ['What is MAITRISE?', 'MAITRISE is KIMU Transport\'s professional driver training programme, focused on practical skills, navigation, road safety and professional conduct.'],
  ['Who can join?', 'Eligibility details are confirmed by KIMU Transport during the application and selection process.'],
  ['Do I learn Google Maps?', 'Yes. Training includes Google Maps, GPS navigation, destination search, route planning and location sharing.'],
  ['Do you provide practical driving lessons?', 'Practical driving is a core MAITRISE training focus, subject to programme availability and training conditions.'],
  ['Can graduates access job opportunities?', 'MAITRISE aims to prepare trainees for opportunities in the transport industry. Any opportunity is subject to eligibility, selection and company terms.'],
  ['How do I register?', 'Use the enrollment form below or contact KIMU Transport using the verified contact details listed in the footer.'],
];

const copy = {
  en: {
    nav: ['Home', 'About Us', 'MAITRISE', 'Training Programme', 'Meet Your Kimu Driver', 'Testimonials', 'Contact'],
    enroll: 'ENROLL NOW',
    login: 'STAFF LOGIN',
    mobileLogin: 'Staff / Admin Login',
    slides: slides,
    modules,
    journey,
    faqs,
  },
  rw: {
    nav: ['Ahabanza', 'Twebwe', 'MAITRISE', 'Gahunda yo Kwiga', 'Hura Umushoferi wa KIMU', 'Abanyeshuri', 'Twandikire'],
    enroll: 'ANDIKA NONAHO',
    login: 'ABAKOZI BINJIRE',
    mobileLogin: 'Abakozi / Abayobozi binjire',
    slides: [
      { ...slides[0], label: 'KIMU TRANSPORT IKEREKANA MAITRISE', title: ['KUVA KU KWIGA', 'GUTWARA IKINYABIZIGA', 'KUGERA KU BUSHOFERI BW\'UMWUGA.'], text: 'Urugendo rwawe rwo kuba umushoferi w\'umwuga rutangirira hano. Wunguka ubumenyi ngiro bwo gutwara, kumenya inzira no kwitegura amahirwe mu rwego rw\'ubwikorezi mu Rwanda.' },
      { ...slides[1], label: 'ABASHOFERI BIZEYE KANDI B\'UMWUGA', title: ['IGA UYOBOWE.', 'TWARA WIZEYE.'], text: 'Wunguka ubumenyi ngiro bwo gutwara ukoresheje inyigisho zisobanutse, imyitozo yibanda ku byo ukeneye n\'ubuyobozi bw\'abanyamwuga.' },
      { ...slides[2], label: 'URUGENDO RWAWE RUHEREYE HANO', title: ['IGICE GISHYA', 'GITANGIRA UHEREYE KU MUHANDA.'], text: 'Witegure kuba umushoferi w\'umwuga wunguka ubumenyi ngiro, kumenya umutekano wo mu muhanda no kugira icyizere cyo gutera intambwe ikurikira.' },
    ],
    modules: [
      ['01', 'Gutwara ikinyabiziga mu buryo ngiro', 'Kumenya ikinyabiziga, kuyobora, kwihutisha, gufata feri no gutwara witonze.', ...modules[0].slice(3)],
      ['02', 'Google Maps na GPS', 'Gushaka aho ujya, gusobanukirwa inzira, kohereza aho uri no kuyobora abakiriya.', ...modules[1].slice(3)],
      ['03', 'Kugendera mu muhanda', 'Ibyapa, imirongo, amategeko y\'umuhanda, amasangano, kuguma mu murongo no kugendera mu mutekano.', ...modules[2].slice(3)],
      ['04', 'Guhagarika ikinyabiziga kinyamwuga', 'Guhagarika mu mutekano, gusubira inyuma, guhagarika iruhande rw\'umuhanda no kugihagarika neza.', ...modules[3].slice(3)],
      ['05', 'Umutekano wo mu muhanda', 'Kumenya ibyateza impanuka, kwirinda ibyago, gusiga intera ihagije no gutwara witonze.', ...modules[4].slice(3)],
      ['06', 'Kinyamwuga mu gutwara tagisi', 'Kwita ku bakiriya, kuvugana neza, kubahiriza igihe no gutanga serivisi nziza.', ...modules[5].slice(3)],
      ['07', 'Kugenzura ikinyabiziga', 'Kugenzura ibanze, isuku, kwita ku mikorere no kumenyesha ibibazo.', ...modules[6].slice(3)],
      ['08', 'Kwitegura akazi nyakuri', 'Kunguka icyizere n\'imyitwarire ikenewe mu kazi k\'ubwikorezi kinyamwuga.', ...modules[7].slice(3)],
    ],
    journey: [['01', 'Kwiyandikisha', 'Iyandikishe muri gahunda y\'amahugurwa ya MAITRISE.'], ['02', 'Kwiga', 'Sobanukirwa amahame yo gutwara, umutekano wo mu muhanda n\'imyitwarire y\'akazi.'], ['03', 'Gukora imyitozo', 'Kunguka ubumenyi bwo gutwara, guhagarika ikinyabiziga no kugendera mu muhanda.'], ['04', 'Kumenya inzira', 'Iga gukoresha Google Maps, GPS no kohereza aho uherereye.'], ['05', 'Kwitegura', 'Kunguka icyizere gitegerejwe ku bashoferi b\'umwuga.'], ['06', 'Gushaka amahirwe', 'Menya amahirwe bitewe n\'ibisabwa n\'uko gutoranywa bikorwa.']],
    faqs: [['MAITRISE ni iki?', 'MAITRISE ni gahunda ya KIMU Transport yo guhugura abashoferi b\'umwuga, yibanda ku bumenyi ngiro, kumenya inzira, umutekano wo mu muhanda n\'imyitwarire y\'akazi.'], ['Ni nde ushobora kwitabira?', 'Ibisabwa byemezwa na KIMU Transport mu gihe cyo gusaba no gutoranya abazitabira.'], ['Ese nziga gukoresha Google Maps?', 'Yego. Amahugurwa akubiyemo Google Maps, GPS, gushaka aho ujya, gutegura inzira no kohereza aho uherereye.'], ['Ese mutanga amasomo yo gutwara ikinyabiziga mu buryo ngiro?', 'Imyitozo yo gutwara ni ingenzi muri MAITRISE, bitewe n\'uko gahunda ihagaze n\'ibisabwa mu mahugurwa.'], ['Abasoje amahugurwa babona akazi?', 'MAITRISE igamije gutegura abahugurwa ku mahirwe mu rwego rw\'ubwikorezi. Amahirwe ashingira ku bisabwa, gutoranywa n\'amabwiriza ya sosiyete.'], ['Nakora nte ngo niyandikishe?', 'Koresha urupapuro rwo kwiyandikisha rukurikira cyangwa uhamagare KIMU Transport ukoresheje amakuru ari ku mpera y\'urubuga.']],
  },
};

export default function Home() {
  const navigate = useNavigate();
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [language, setLanguage] = useState(() => localStorage.getItem('kimu-language') === 'rw' ? 'rw' : 'en');
  const [openFaq, setOpenFaq] = useState(0);
  const [formState, setFormState] = useState({ status: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const touchStart = useRef(null);
  const testimonialViewport = useRef(null);
  const [testimonials, setTestimonials] = useState([]);
  const [testimonialsLoading, setTestimonialsLoading] = useState(true);
  const [testimonialsError, setTestimonialsError] = useState('');
  const [testimonialScroll, setTestimonialScroll] = useState({ canScrollBack: false, canScrollForward: false });
  const driverViewport = useRef(null);
  const [drivers, setDrivers] = useState([]);
  const [driverScroll, setDriverScroll] = useState({ canScrollBack: false, canScrollForward: false });

  useEffect(() => {
    let active = true;
    testimonialApi.listPublished()
      .then((response) => {
        if (active) setTestimonials(response.data.data || []);
      })
      .catch((error) => {
        if (active) setTestimonialsError(error.message || 'Unable to load student testimonials.');
      })
      .finally(() => {
        if (active) setTestimonialsLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    taxiDriverApi.listPublished().then((response) => {
      if (active) setDrivers(response.data.data || []);
    }).catch(() => {
      if (active) setDrivers([]);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = window.setInterval(() => setSlide((current) => (current + 1) % slides.length), 6500);
    return () => window.clearInterval(timer);
  }, [paused]);

  useEffect(() => {
    const viewport = testimonialViewport.current;
    if (!viewport) return undefined;

    function updateTestimonialScroll() {
      setTestimonialScroll({
        canScrollBack: viewport.scrollLeft > 2,
        canScrollForward: viewport.scrollLeft + viewport.clientWidth < viewport.scrollWidth - 2,
      });
    }

    updateTestimonialScroll();
    viewport.addEventListener('scroll', updateTestimonialScroll, { passive: true });
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateTestimonialScroll);
    observer?.observe(viewport);
    if (viewport.firstElementChild) observer?.observe(viewport.firstElementChild);
    window.addEventListener('resize', updateTestimonialScroll);
    return () => {
      viewport.removeEventListener('scroll', updateTestimonialScroll);
      observer?.disconnect();
      window.removeEventListener('resize', updateTestimonialScroll);
    };
  }, [testimonials.length]);

  useEffect(() => {
    const viewport = driverViewport.current;
    if (!viewport) return undefined;
    function updateDriverScroll() {
      setDriverScroll({ canScrollBack: viewport.scrollLeft > 2, canScrollForward: viewport.scrollLeft + viewport.clientWidth < viewport.scrollWidth - 2 });
    }
    updateDriverScroll();
    viewport.addEventListener('scroll', updateDriverScroll, { passive: true });
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateDriverScroll);
    observer?.observe(viewport);
    if (viewport.firstElementChild) observer?.observe(viewport.firstElementChild);
    window.addEventListener('resize', updateDriverScroll);
    return () => { viewport.removeEventListener('scroll', updateDriverScroll); observer?.disconnect(); window.removeEventListener('resize', updateDriverScroll); };
  }, [drivers.length]);

  function scrollToSection(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  }

  function changeSlide(direction) {
    setSlide((current) => (current + direction + slides.length) % slides.length);
  }

  function scrollTestimonials(direction) {
    const viewport = testimonialViewport.current;
    const track = viewport?.firstElementChild;
    const card = track?.querySelector('.maitrize-testimonial-card');
    if (!viewport || !card) return;

    const gap = Number.parseFloat(window.getComputedStyle(track).columnGap) || 0;
    viewport.scrollBy({ left: direction * (card.getBoundingClientRect().width + gap), behavior: 'smooth' });
  }

  function scrollDrivers(direction) {
    const viewport = driverViewport.current;
    const card = viewport?.querySelector('.maitrize-driver-card');
    if (!viewport || !card) return;
    const gap = Number.parseFloat(window.getComputedStyle(viewport).columnGap) || 0;
    viewport.scrollBy({ left: direction * (card.getBoundingClientRect().width + gap), behavior: 'smooth' });
  }

  function handleTouchStart(event) {
    touchStart.current = event.touches[0].clientX;
  }

  function handleTouchEnd(event) {
    if (touchStart.current === null) return;
    const distance = event.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(distance) > 45) changeSlide(distance > 0 ? -1 : 1);
    touchStart.current = null;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const name = form.get('name')?.trim();
    const phone = form.get('phone')?.trim();
    const email = form.get('email')?.trim();
    if (!name || !phone) {
      setFormState({ status: 'error', message: 'Please enter your full name and telephone number.' });
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormState({ status: 'error', message: 'Please enter a valid email address.' });
      return;
    }

    setSubmitting(true);
    setFormState({ status: '', message: '' });
    try {
      await contactApi.submit({
        fullName: name,
        phone,
        email,
        interest: form.get('interest'),
        experience: form.get('experience'),
        contactMethod: form.get('contactMethod'),
      });
      formElement.reset();
      setFormState({ status: 'success', message: 'Thank you. Your details have been sent to KIMU Transport.' });
    } catch (error) {
      setFormState({ status: 'error', message: error.message || 'Unable to send your details. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  }

  const t = copy[language];
  const current = t.slides[slide];

  return (
    <div className="maitrize-home">
      <header className={`maitrize-nav ${scrolled ? 'is-scrolled' : ''}`}>
        <button className="maitrize-nav__brand" onClick={() => scrollToSection('home')} aria-label="KIMU Transport home">
          <img src={kimuLogo} alt="KIMU Transport and Multiservices Ltd" />
        </button>
        <nav className="maitrize-nav__links" aria-label="Main navigation">
          {t.nav.map((label, index) => (
            <button key={label} onClick={() => scrollToSection(navTargets[index])}>
              {label}
            </button>
          ))}
        </nav>
        <div className="maitrize-nav__actions">
          <button className="maitrize-language" onClick={() => setLanguage((value) => { const next = value === 'en' ? 'rw' : 'en'; localStorage.setItem('kimu-language', next); return next; })} aria-label="Change language">
            {language === 'en' ? 'RW' : 'EN'}
          </button>
          <button className="maitrize-nav__login" onClick={() => navigate('/login')}>{t.login}</button>
          <button className="maitrize-nav__cta" onClick={() => scrollToSection('contact')}>{t.enroll}</button>
          <button className="maitrize-menu" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label="Toggle navigation">
            <span /><span />
          </button>
        </div>
        {menuOpen && (
          <nav className="maitrize-mobile-menu" aria-label="Mobile navigation">
            {t.nav.map((label, index) => (
              <button key={label} onClick={() => scrollToSection(navTargets[index])}>
                {label}
              </button>
            ))}
            <button className="maitrize-mobile-menu__login" onClick={() => navigate('/login')}>{t.mobileLogin}</button>
          </nav>
        )}
      </header>

      <section
        id="home"
        className={`maitrize-hero ${paused ? 'is-paused' : ''}`}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="maitrize-hero__backdrop">
          {slides.map((item, index) => (
            <img
              key={item.label}
              src={item.image}
              alt=""
              className={index === slide ? 'is-active' : ''}
              aria-hidden={index !== slide}
            />
          ))}
        </div>
        <div className="maitrize-hero__shade" />
        <div className="maitrize-hero__content" key={`content-${slide}`}>
          <p className="maitrize-eyebrow maitrize-eyebrow--light">{current.label}</p>
          <h1>
            {current.title.map((line, index) => (
              <span key={line} className={index === 1 ? 'accent' : ''}>{line}</span>
            ))}
          </h1>
          <p className="maitrize-hero__text">{current.text}</p>
          <div className="maitrize-hero__buttons">
            <button className="maitrize-button maitrize-button--green" onClick={() => scrollToSection('contact')}>START YOUR TRAINING</button>
            <button className="maitrize-button maitrize-button--outline" onClick={() => scrollToSection('programme')}>EXPLORE OUR PROGRAMME</button>
          </div>
        </div>
        <button className="maitrize-hero__arrow maitrize-hero__arrow--left" onClick={() => changeSlide(-1)} aria-label="Previous slide">&#8249;</button>
        <button className="maitrize-hero__arrow maitrize-hero__arrow--right" onClick={() => changeSlide(1)} aria-label="Next slide">&#8250;</button>
        <div className="maitrize-hero__dots" aria-label="Slide controls">
          {slides.map((item, index) => (
            <button key={item.label} className={index === slide ? 'active' : ''} onClick={() => setSlide(index)} aria-label={`Go to slide ${index + 1}`} aria-current={index === slide ? 'true' : undefined} />
          ))}
          <span className="maitrize-hero__slide-count"><strong>0{slide + 1}</strong> / 0{slides.length}</span>
        </div>
        <a className="maitrize-hero__photo-credit" href={current.source} target="_blank" rel="noreferrer">
          Illustrative stock photo · Photo by {current.credit} on Pexels
        </a>
      </section>

      <main>
        <section id="about" className="maitrize-intro maitrize-section">
          <div className="maitrize-intro__visual">
            <img src={drivingLessonPhoto} alt="Black learner discussing driving practice with an instructor" loading="lazy" />
            <div className="maitrize-intro__stamp">MAI<br /><strong>TRIZE</strong></div>
            <a className="maitrize-image-credit" href="https://www.pexels.com/photo/man-in-white-hoodie-sitting-inside-car-with-a-woman-6817037/" target="_blank" rel="noreferrer">Illustrative photo · Gustavo Fring / Pexels</a>
          </div>
          <div className="maitrize-intro__copy">
            <p className="maitrize-eyebrow">WELCOME TO KIMU TRANSPORT</p>
            <h2>WE DON\'T JUST TEACH YOU TO DRIVE. <span>WE PREPARE YOU FOR THE ROAD AHEAD.</span></h2>
            <p>KIMU Transport provides professional driver training focused on practical skills, navigation, road safety and professional conduct. We understand the realities of professional transport work and prepare trainees for the responsibilities that come with it.</p>
            <button className="maitrize-text-button" onClick={() => scrollToSection('programme')}>DISCOVER MAITRISE <span>&#8594;</span></button>
          </div>
        </section>

        <section id="programme" className="maitrize-programme maitrize-section">
          <div className="maitrize-section-heading">
            <p className="maitrize-eyebrow">MAITRISE TRAINING PROGRAMME</p>
            <h2>THE SKILLS THAT MAKE A <span>PROFESSIONAL DRIVER.</span></h2>
          </div>
          <div className="maitrize-module-grid">
            {t.modules.map(([number, title, text, image, photographer], index) => (
              <article className={`maitrize-module maitrize-module--${index + 1}`} key={title}>
                <div className="maitrize-module__photo">
                  <img src={image} alt="" loading="lazy" />
                  <span>{photographer} / Pexels</span>
                </div>
                <span className="maitrize-module__number">{number}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="why-kimu" className="maitrize-why">
          <div className="maitrize-why__visual">
            <img src={blackMaleDriverPhoto} alt="Black professional driver behind the wheel" loading="lazy" />
            <a className="maitrize-image-credit" href="https://www.pexels.com/photo/man-in-white-dress-shirt-driving-car-4606336/" target="_blank" rel="noreferrer">Illustrative photo · cottonbro studio / Pexels</a>
          </div>
          <div className="maitrize-why__copy">
            <p className="maitrize-eyebrow maitrize-eyebrow--light">WHY CHOOSE KIMU</p>
            <h2>YOUR FUTURE DESERVES <span>PROFESSIONAL TRAINING.</span></h2>
            <ul>
              {['Practical, skills-focused training', 'Google Maps and GPS navigation', 'Professional driving preparation', 'Road circulation and parking', 'Road safety awareness', 'Customer service and professionalism', 'Real transport industry expectations', 'Eligible graduates may explore opportunities'].map((item) => <li key={item}><b>&#10003;</b>{item}</li>)}
            </ul>
          </div>
        </section>

        <section id="drivers" className="maitrize-drivers maitrize-section">
          <div className="maitrize-drivers__heading">
            <div className="maitrize-section-heading">
              <p className="maitrize-eyebrow">YOUR JOURNEY, IN GOOD HANDS</p>
              <h2>MEET YOUR <span>KIMU DRIVER.</span></h2>
              <p className="maitrize-drivers__intro">Get to know the people behind the wheel and the vehicles ready for your Kigali journey.</p>
            </div>
            {drivers.length > 1 && <div className="maitrize-drivers__controls" aria-label="Driver carousel controls"><button type="button" onClick={() => scrollDrivers(-1)} disabled={!driverScroll.canScrollBack} aria-label="Show previous drivers">&#8592;</button><button type="button" onClick={() => scrollDrivers(1)} disabled={!driverScroll.canScrollForward} aria-label="Show more drivers">&#8594;</button></div>}
          </div>
          {drivers.length ? <div className="maitrize-driver-viewport" ref={driverViewport} role="region" aria-roledescription="carousel" aria-label="KIMU taxi drivers" tabIndex="0"><div className="maitrize-driver-track">{drivers.map((driver, index) => <button className="maitrize-driver-card" type="button" key={driver._id} onClick={() => navigate(`/taxi-drivers/${driver._id}`)} aria-label={`View ${driver.fullName}'s driver and vehicle profile`}>
            <span className="maitrize-driver-card__photos"><img className="maitrize-driver-card__portrait" src={driver.profileImage} alt={`${driver.fullName}`} loading="lazy"/><img className="maitrize-driver-card__car" src={driver.carImages?.[0] || drivingLessonPhoto} alt={driver.carImages?.length ? `${driver.fullName}'s car` : 'KIMU vehicle'} loading="lazy"/><span className="maitrize-driver-card__index">{String(index + 1).padStart(2, '0')}</span></span>
            <span className="maitrize-driver-card__details"><span className="maitrize-driver-card__location"><i/> {driver.location || 'Kigali, Rwanda'}</span><strong>{driver.fullName}</strong><span className="maitrize-driver-card__vehicle">{driver.car?.make} {driver.car?.model}{driver.car?.year ? ` · ${driver.car.year}` : ''}</span><span className="maitrize-driver-card__cta">VIEW DRIVER <b>&#8599;</b></span></span>
          </button>)}</div></div> : <div className="maitrize-drivers__empty"><span>✳</span><strong>Our Kigali drivers are getting ready.</strong><p>Meet the KIMU team here soon.</p></div>}
        </section>

        <section id="maitrize" className="maitrize-journey maitrize-section">
          <div className="maitrize-section-heading">
            <p className="maitrize-eyebrow">YOUR TRAINING JOURNEY</p>
            <h2>FROM BEGINNER TO <span>PROFESSIONAL.</span></h2>
          </div>
          <div className="maitrize-timeline">
            {t.journey.map(([number, title, text]) => (
              <article key={title}>
                <div className="maitrize-timeline__dot">{number}</div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="maitrize-careers">
          <div className="maitrize-careers__copy">
            <p className="maitrize-eyebrow maitrize-eyebrow--light">EMPLOYMENT OPPORTUNITIES</p>
            <h2>LEARN TO DRIVE. DEVELOP YOUR SKILLS. <span>MOVE TOWARDS YOUR CAREER.</span></h2>
            <p>At KIMU Transport, professional training should prepare you for real opportunities. MAITRISE develops the skills and professionalism needed to pursue opportunities within the transport industry.</p>
            <p className="maitrize-careers__note">Opportunities are subject to eligibility, selection and company terms. Training completion does not guarantee employment.</p>
            <button className="maitrize-button maitrize-button--white" onClick={() => scrollToSection('contact')}>JOIN MAITRISE TODAY</button>
          </div>
          <div className="maitrize-careers__visual">
            <img src={confidentDriverPhoto} alt="Black woman smiling behind the wheel" loading="lazy" />
            <a className="maitrize-image-credit" href="https://www.pexels.com/photo/young-woman-driving-a-car-and-smiling-17164787/" target="_blank" rel="noreferrer">Illustrative photo · Abiy Fikru / Pexels</a>
          </div>
        </section>

        <section id="testimonials" className="maitrize-testimonials maitrize-section">
          <div className="maitrize-testimonials__heading">
            <div className="maitrize-section-heading">
              <p className="maitrize-eyebrow">STUDENT EXPERIENCES</p>
              <h2>REAL EXPERIENCES. <span>REAL PROGRESS.</span></h2>
            </div>
            <div className="maitrize-testimonials__controls" aria-label="Testimonial carousel controls">
              <button type="button" onClick={() => scrollTestimonials(-1)} disabled={!testimonialScroll.canScrollBack} aria-label="Show previous testimonials"><span aria-hidden="true">&larr;</span></button>
              <button type="button" onClick={() => scrollTestimonials(1)} disabled={!testimonialScroll.canScrollForward} aria-label="Show more testimonials"><span aria-hidden="true">&rarr;</span></button>
            </div>
          </div>
          <div className="maitrize-testimonial-viewport" ref={testimonialViewport} role="region" aria-roledescription="carousel" aria-label="Student testimonials" tabIndex="0">
            <div className="maitrize-testimonial-track">
              {testimonials.map((testimonial, index) => (
                <article className="maitrize-testimonial-card" key={testimonial._id}>
                  <span className="maitrize-testimonial__seal" aria-hidden="true"><QuoteIcon /></span>
                  <div className="maitrize-testimonial__person">
                    <span className="maitrize-testimonial__avatar">
                      <img src={testimonial.image} alt={`${testimonial.fullName}`} loading="lazy" />
                    </span>
                    <span className="maitrize-testimonial__identity"><strong>{testimonial.fullName}</strong><small>{testimonial.role || 'MAITRISE student'}</small></span>
                    <span className="maitrize-testimonial__label">STUDENT STORY</span>
                  </div>
                  <div className="maitrize-testimonial__rule" />
                  <div className="maitrize-testimonial__quote-mark" aria-hidden="true">&#8220;</div>
                  <p>{testimonial.message}</p>
                  <footer>MAITRISE <span>·</span> KIMU TRANSPORT</footer>
                  <span className="maitrize-testimonial__number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                </article>
              ))}
            </div>
            {testimonialsLoading && <div className="maitrize-testimonials__empty" role="status"><span>Loading student stories&#8230;</span></div>}
            {!testimonialsLoading && testimonials.length === 0 && (
              <div className="maitrize-testimonials__empty" role={testimonialsError ? 'alert' : 'status'}>
                <span className="maitrize-testimonials__empty-icon"><QuoteIcon /></span>
                <strong>{testimonialsError ? 'Testimonials are unavailable right now' : 'Student stories are coming soon'}</strong>
                <span>{testimonialsError || 'We look forward to sharing real MAITRISE student experiences here.'}</span>
              </div>
            )}
          </div>
          {testimonials.length > 1 && <p className="maitrize-testimonials__hint">Use the arrows or swipe to explore student stories</p>}
        </section>

        <section className="maitrize-gallery maitrize-section">
          <div className="maitrize-section-heading">
            <p className="maitrize-eyebrow">LIFE AT KIMU</p>
            <h2>LEARNING. PRACTISING. <span>PROGRESSING.</span></h2>
          </div>
          <div className="maitrize-gallery__grid">
            {[
              ['Learning behind the wheel', instructorLearnerPhoto, 'Gustavo Fring', 'https://www.pexels.com/photo/smiling-woman-at-steering-wheel-in-car-6817008/'],
              ['GPS & navigation', gpsPhoto, 'Dustin Konrad', 'https://www.pexels.com/photo/close-up-of-a-smartphone-displaying-driving-directions-15548360/'],
              ['Driving practice', drivingLessonPhoto, 'Gustavo Fring', 'https://www.pexels.com/photo/man-in-white-hoodie-sitting-inside-car-with-a-woman-6817037/'],
              ['Professional drivers', confidentDriverPhoto, 'Abiy Fikru', 'https://www.pexels.com/photo/young-woman-driving-a-car-and-smiling-17164787/'],
            ].map(([title, image, photographer, source], index) => (
              <figure key={title} className={`maitrize-gallery__item maitrize-gallery__item--${index + 1}`}>
                <img src={image} alt={title} loading="lazy" />
                <figcaption><strong>{title}</strong><a href={source} target="_blank" rel="noreferrer">Illustrative photo · {photographer} / Pexels</a></figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="maitrize-faq maitrize-section">
          <div>
            <p className="maitrize-eyebrow">FREQUENTLY ASKED QUESTIONS</p>
            <h2>QUESTIONS BEFORE <span>YOU BEGIN.</span></h2>
          </div>
          <div className="maitrize-accordion">
            {t.faqs.map(([question, answer], index) => (
              <article key={question}>
                <button onClick={() => setOpenFaq(openFaq === index ? -1 : index)} aria-expanded={openFaq === index}>
                  <span>{question}</span><b>{openFaq === index ? '−' : '+'}</b>
                </button>
                {openFaq === index && <p>{answer}</p>}
              </article>
            ))}
          </div>
        </section>

        <section id="contact" className="maitrize-contact">
          <div className="maitrize-contact__copy">
            <p className="maitrize-eyebrow maitrize-eyebrow--light">ENROLLMENT</p>
            <h2>YOUR NEXT JOURNEY STARTS WITH <span>ONE DECISION.</span></h2>
            <p>Take the first step towards becoming a confident, skilled and professional driver.</p>
          </div>
          <form className="maitrize-form" onSubmit={handleSubmit} noValidate>
            <label>Full name<input name="name" type="text" autoComplete="name" required /></label>
            <label>Telephone number<input name="phone" type="tel" autoComplete="tel" required /></label>
            <label>Email address <small>(optional)</small><input name="email" type="email" autoComplete="email" /></label>
            <label>Training interest<select name="interest" defaultValue="MAITRISE"><option>MAITRISE</option><option>Practical driving</option><option>Google Maps & navigation</option></select></label>
            <label>Previous driving experience<select name="experience" defaultValue="None"><option>None</option><option>Beginner</option><option>Some experience</option><option>Licensed driver</option></select></label>
            <label>Preferred contact method<select name="contactMethod" defaultValue="Telephone"><option>Telephone</option><option>Email</option><option>WhatsApp</option></select></label>
            {formState.message && <p className={`maitrize-form__message ${formState.status}`} role={formState.status === 'error' ? 'alert' : 'status'}>{formState.message}</p>}
            <button className="maitrize-button maitrize-button--green" type="submit" disabled={submitting}>{submitting ? 'SENDING...' : 'ENROLL NOW'}</button>
          </form>
        </section>
      </main>

      <footer className="maitrize-footer">
        <div className="maitrize-footer__brand">
          <img src={kimuLogo} alt="KIMU Transport" />
          <p>Professional driver training focused on practical skills, navigation, road safety and professional conduct.</p>
        </div>
        <div>
          <h3>Explore</h3>
          <button onClick={() => scrollToSection('about')}>About Us</button>
          <button onClick={() => scrollToSection('programme')}>Training Programme</button>
          <button onClick={() => scrollToSection('why-kimu')}>Why KIMU</button>
        </div>
        <div>
          <h3>MAITRISE</h3>
          <button onClick={() => scrollToSection('maitrize')}>Training Journey</button>
          <button onClick={() => scrollToSection('testimonials')}>Testimonials</button>
          <button onClick={() => scrollToSection('contact')}>Enroll Now</button>
        </div>
        <div>
          <h3>Contact</h3>
          <p>Website: <a href="https://kimudigital.com" target="_blank" rel="noreferrer">kimudigital.com</a></p>
          <p>Telephone: <a href="tel:+250794388376">0794388376</a></p>
        </div>
        <div className="maitrize-footer__bottom">
          <span>© {new Date().getFullYear()} KIMU TRANSPORT AND MULTISERVICES LTD</span>
          <a href="/login">Staff login</a>
        </div>
      </footer>
      <a
        className="maitrize-whatsapp"
        href="https://wa.me/250782739381"
        target="_blank"
        rel="noreferrer"
        aria-label="Chat on WhatsApp at 0782739381"
      >
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <path d="M16.02 3.2A12.7 12.7 0 0 0 5.1 22.38L3.4 28.6l6.37-1.67A12.7 12.7 0 1 0 16.02 3.2Zm0 23.1c-1.9 0-3.76-.51-5.4-1.48l-.39-.23-3.78.99 1.01-3.68-.25-.4a10.37 10.37 0 1 1 8.81 4.8Zm5.7-7.77c-.31-.16-1.84-.91-2.13-1.02-.29-.1-.5-.15-.71.16-.2.3-.81 1.02-.99 1.22-.18.21-.36.23-.67.08-.31-.16-1.3-.48-2.47-1.53-.91-.81-1.53-1.82-1.71-2.13-.18-.31-.02-.48.14-.64.14-.14.31-.36.46-.54.15-.18.2-.31.31-.51.1-.21.05-.39-.03-.54-.08-.16-.71-1.7-.97-2.32-.26-.61-.52-.52-.71-.53h-.61c-.21 0-.54.08-.82.39-.28.31-1.07 1.05-1.07 2.57s1.1 2.98 1.25 3.19c.15.2 2.16 3.3 5.24 4.63.73.32 1.3.51 1.75.65.74.23 1.41.2 1.94.12.59-.09 1.84-.75 2.1-1.48.26-.72.26-1.34.18-1.48-.08-.13-.28-.21-.59-.36Z" />
        </svg>
        <span>0782739381</span>
      </a>
    </div>
  );
}

function QuoteIcon() {
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M10.4 11.2H5.8a1 1 0 0 1-1-1V5.8a1 1 0 0 1 1-1h4.6a1 1 0 0 1 1 1v6.8c0 3.2-1.6 5.3-4.8 6.4M19.2 11.2h-4.6a1 1 0 0 1-1-1V5.8a1 1 0 0 1 1-1h4.6a1 1 0 0 1 1 1v6.8c0 3.2-1.6 5.3-4.8 6.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>;
}

function PersonIcon() {
  return <svg width="27" height="27" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="8" r="3.1" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M5.5 19.5c.5-3.1 2.9-5 6.5-5s6 1.9 6.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>;
}
