import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { contactApi } from '../../services/api';
import kimuLogo from '../../assets/LOGO WEBSITE OK.png';
import instructorLearnerPhoto from '../../assets/hero-photos/black-woman-driver.jpg';
import drivingLessonPhoto from '../../assets/hero-photos/adult-driving-lesson.jpg';
import confidentDriverPhoto from '../../assets/hero-photos/smiling-driver-ethiopia.jpg';
import practicePhoto from '../../assets/hero-photos/black-woman-practice.jpg';
import blackMaleDriverPhoto from '../../assets/hero-photos/black-man-driver.jpg';
import gpsPhoto from '../../assets/hero-photos/gps-navigation.jpg';
import './Home.css';

const copy = {
  en: {
    nav: ['Home', 'About Us', 'MAITRISE', 'Training Programme', 'Why KIMU', 'Testimonials', 'Contact'],
    enroll: 'ENROLL NOW',
  },
  rw: {
    nav: ['Ahabanza', 'Twebwe', 'MAITRISE', 'Gahunda yo Kwiga', 'Impamvu KIMU', 'Abanyeshuri', 'Twandikire'],
    enroll: 'ANDIKA NONAHO',
  },
};

const slides = [
  {
    label: 'KIMU TRANSPORT PRESENTS MAITRISE',
    title: ['FROM LEARNING TO DRIVE', 'TO BECOMING A', 'PROFESSIONAL DRIVER.'],
    text: "Your journey to professional driving starts here. Gain practical driving skills, master navigation and prepare for opportunities in Rwanda's transport industry.",
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

export default function Home() {
  const navigate = useNavigate();
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [language, setLanguage] = useState('en');
  const [openFaq, setOpenFaq] = useState(0);
  const [formState, setFormState] = useState({ status: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const touchStart = useRef(null);

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

  function scrollToSection(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  }

  function changeSlide(direction) {
    setSlide((current) => (current + direction + slides.length) % slides.length);
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
  const current = slides[slide];

  return (
    <div className="maitrize-home">
      <header className={`maitrize-nav ${scrolled ? 'is-scrolled' : ''}`}>
        <button className="maitrize-nav__brand" onClick={() => scrollToSection('home')} aria-label="KIMU Transport home">
          <img src={kimuLogo} alt="KIMU Transport and Multiservices Ltd" />
        </button>
        <nav className="maitrize-nav__links" aria-label="Main navigation">
          {t.nav.map((label, index) => (
            <button key={label} onClick={() => scrollToSection(['home', 'about', 'maitrize', 'programme', 'why-kimu', 'testimonials', 'contact'][index])}>
              {label}
            </button>
          ))}
        </nav>
        <div className="maitrize-nav__actions">
          <button className="maitrize-language" onClick={() => setLanguage((value) => (value === 'en' ? 'rw' : 'en'))} aria-label="Change language">
            {language === 'en' ? 'RW' : 'EN'}
          </button>
          <button className="maitrize-nav__login" onClick={() => navigate('/login')}>STAFF LOGIN</button>
          <button className="maitrize-nav__cta" onClick={() => scrollToSection('contact')}>{t.enroll}</button>
          <button className="maitrize-menu" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label="Toggle navigation">
            <span /><span />
          </button>
        </div>
        {menuOpen && (
          <nav className="maitrize-mobile-menu" aria-label="Mobile navigation">
            {t.nav.map((label, index) => (
              <button key={label} onClick={() => scrollToSection(['home', 'about', 'maitrize', 'programme', 'why-kimu', 'testimonials', 'contact'][index])}>
                {label}
              </button>
            ))}
            <button className="maitrize-mobile-menu__login" onClick={() => navigate('/login')}>Staff / Admin Login</button>
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
        <button className="maitrize-hero__arrow maitrize-hero__arrow--left" onClick={() => changeSlide(-1)} aria-label="Previous slide">‹</button>
        <button className="maitrize-hero__arrow maitrize-hero__arrow--right" onClick={() => changeSlide(1)} aria-label="Next slide">›</button>
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
            <h2>WE DON'T JUST TEACH YOU TO DRIVE. <span>WE PREPARE YOU FOR THE ROAD AHEAD.</span></h2>
            <p>KIMU Transport provides professional driver training focused on practical skills, navigation, road safety and professional conduct. We understand the realities of professional transport work and prepare trainees for the responsibilities that come with it.</p>
            <button className="maitrize-text-button" onClick={() => scrollToSection('programme')}>DISCOVER MAITRISE <span>→</span></button>
          </div>
        </section>

        <section id="programme" className="maitrize-programme maitrize-section">
          <div className="maitrize-section-heading">
            <p className="maitrize-eyebrow">MAITRISE TRAINING PROGRAMME</p>
            <h2>THE SKILLS THAT MAKE A <span>PROFESSIONAL DRIVER.</span></h2>
          </div>
          <div className="maitrize-module-grid">
            {modules.map(([number, title, text, image, photographer], index) => (
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
              {['Practical, skills-focused training', 'Google Maps and GPS navigation', 'Professional driving preparation', 'Road circulation and parking', 'Road safety awareness', 'Customer service and professionalism', 'Real transport industry expectations', 'Eligible graduates may explore opportunities'].map((item) => <li key={item}><b>✓</b>{item}</li>)}
            </ul>
          </div>
        </section>

        <section id="maitrize" className="maitrize-journey maitrize-section">
          <div className="maitrize-section-heading">
            <p className="maitrize-eyebrow">YOUR TRAINING JOURNEY</p>
            <h2>FROM BEGINNER TO <span>PROFESSIONAL.</span></h2>
          </div>
          <div className="maitrize-timeline">
            {journey.map(([number, title, text]) => (
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
          <div className="maitrize-section-heading">
            <p className="maitrize-eyebrow">STUDENT EXPERIENCES</p>
            <h2>REAL EXPERIENCES. <span>REAL PROGRESS.</span></h2>
          </div>
          <div className="maitrize-testimonial-grid">
            {[1, 2, 3].map((number) => (
              <article key={number}>
                <div className="maitrize-testimonial__quote">“</div>
                <p>Genuine student testimonial placeholder.</p>
                <footer>
                  <div>{number}</div>
                  <span><strong>Student name</strong><small>MAITRISE student · Replace with approved testimonial</small></span>
                </footer>
              </article>
            ))}
          </div>
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
            {faqs.map(([question, answer], index) => (
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
          <p>Website: <a href="https://www.kimutransport.com" target="_blank" rel="noreferrer">kimutransport.com</a></p>
          <p>Telephone: <a href="tel:+250793999">+250 793 999</a></p>
        </div>
        <div className="maitrize-footer__bottom">
          <span>© {new Date().getFullYear()} KIMU TRANSPORT AND MULTISERVICES LTD</span>
          <a href="/login">Staff login</a>
        </div>
      </footer>
    </div>
  );
}
