import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import kimuLogo from '../../assets/images.jpg';
import heroDriverKeys from '../../assets/images/247bde7bff181a35aa3acfb59625f4fd.jpg';
import heroTaxi from '../../assets/images/28b0d1580f7a028aee7aedcc96aa3331.jpg';
import heroProfessional from '../../assets/images/3535b62bb207a024cb5790c3c89cd50c.jpg';
import heroVehicle from '../../assets/images/4043c0f5f6bd04fd233192f9a2634dae.jpg';
import heroGps from '../../assets/images/aa896c29f5ce1468607e0f201652fa31.jpg';
import trainingVehicle from '../../assets/images/622230504012f46ec32a07d64282b38f.jpg';
import confidentDriver from '../../assets/images/a665034af5d191ea77fb6e686b09e18c.jpg';
import './Home.css';

const copy = {
  en: {
    nav: ['Home', 'About Us', 'MAITRIZE', 'Training Programme', 'Why KIMU', 'Testimonials', 'Contact'],
    enroll: 'ENROLL NOW',
  },
  rw: {
    nav: ['Ahabanza', 'Twebwe', 'MAITRIZE', 'Gahunda yo Kwiga', 'Impamvu KIMU', 'Abanyeshuri', 'Twandikire'],
    enroll: 'ANDIKA NONAHO',
  },
};

const slides = [
  {
    label: 'KIMU TRANSPORT PRESENTS MAITRIZE',
    title: ['FROM LEARNING TO DRIVE', 'TO BECOMING A', 'PROFESSIONAL DRIVER.'],
    text: "Your journey to professional driving starts here. Gain practical driving skills, master navigation and prepare for opportunities in Rwanda's transport industry.",
    image: heroDriverKeys,
  },
  {
    label: 'CONFIDENT, PROFESSIONAL DRIVERS',
    title: ['DRIVE WITH CONFIDENCE.', 'WORK WITH PROFESSIONALISM.'],
    text: 'Learn the skills that make the difference between an ordinary driver and a professional taxi driver.',
    image: heroTaxi,
  },
  {
    label: 'PRACTICAL NAVIGATION TRAINING',
    title: ['MASTER GOOGLE MAPS.', 'NEVER LOSE YOUR WAY.'],
    text: 'Learn professional GPS navigation, location sharing, route planning and real-world navigation skills.',
    image: heroGps,
  },
  {
    label: 'PRACTICAL ROAD SKILLS',
    title: ['LEARN THE ROAD.', 'MASTER EVERY MANOEUVRE.'],
    text: 'Develop practical driving, parking, circulation and road safety skills with professional guidance.',
    image: heroProfessional,
  },
  {
    label: 'REAL TRANSPORT ENVIRONMENT',
    title: ['YOUR SKILLS CAN OPEN', 'NEW CAREER OPPORTUNITIES.'],
    text: 'Train with KIMU and prepare yourself for professional opportunities in the transport industry.',
    image: heroVehicle,
  },
  {
    label: 'MAITRIZE PROFESSIONAL TRAINING',
    title: ['BUILD SKILLS THAT', 'MOVE YOUR CAREER.'],
    text: 'Learn practical vehicle care, confident operation and the professional habits employers expect.',
    image: trainingVehicle,
  },
  {
    label: 'CONFIDENT DRIVERS. STRONG CAREERS.',
    title: ['START WHERE YOU ARE.', 'DRIVE WHERE YOU WANT.'],
    text: 'Develop the confidence, navigation skill and service mindset needed for the road ahead.',
    image: confidentDriver,
  },
];

const modules = [
  ['01', 'Practical Driving', 'Vehicle handling, steering, acceleration, braking and responsible driving.'],
  ['02', 'Google Maps & GPS', 'Search destinations, understand routes, share locations and navigate customers.'],
  ['03', 'Road Circulation', 'Road signs, markings, traffic rules, junctions, lane discipline and safe circulation.'],
  ['04', 'Professional Parking', 'Safe parking, reverse parking, parallel parking and accurate positioning.'],
  ['05', 'Road Safety', 'Hazard awareness, defensive habits, safe distances and responsible driving.'],
  ['06', 'Taxi Professionalism', 'Customer care, communication, punctuality and responsible service.'],
  ['07', 'Vehicle Inspection', 'Basic checks, cleanliness, maintenance awareness and reporting problems.'],
  ['08', 'Real-World Preparation', 'Build the confidence and habits expected in professional transport work.'],
];

const journey = [
  ['01', 'Register', 'Join the MAITRIZE training programme.'],
  ['02', 'Learn', 'Understand driving principles, road safety and professional conduct.'],
  ['03', 'Practice', 'Develop practical driving, parking and circulation skills.'],
  ['04', 'Master Navigation', 'Learn Google Maps, GPS navigation and location sharing.'],
  ['05', 'Prepare', 'Build the confidence expected of professional drivers.'],
  ['06', 'Explore Opportunities', 'Learn about opportunities subject to eligibility and selection.'],
];

const faqs = [
  ['What is MAITRIZE?', 'MAITRIZE is KIMU Transport\'s professional driver training programme, focused on practical skills, navigation, road safety and professional conduct.'],
  ['Who can join?', 'Eligibility details are confirmed by KIMU Transport during the application and selection process.'],
  ['Do I learn Google Maps?', 'Yes. Training includes Google Maps, GPS navigation, destination search, route planning and location sharing.'],
  ['Do you provide practical driving lessons?', 'Practical driving is a core MAITRIZE training focus, subject to programme availability and training conditions.'],
  ['Can graduates access job opportunities?', 'MAITRIZE aims to prepare trainees for opportunities in the transport industry. Any opportunity is subject to eligibility, selection and company terms.'],
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
  const touchStart = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (paused) return undefined;
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

  function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!form.get('name')?.trim() || !form.get('phone')?.trim()) {
      setFormState({ status: 'error', message: 'Please enter your full name and telephone number.' });
      return;
    }
    setFormState({
      status: 'info',
      message: 'Your details have been validated locally. This form is ready for a verified KIMU application endpoint; no information has been sent.',
    });
  }

  const t = copy[language];
  const current = slides[slide];

  return (
    <div className="maitrize-home">
      <header className={`maitrize-nav ${scrolled ? 'is-scrolled' : ''}`}>
        <button className="maitrize-nav__brand" onClick={() => scrollToSection('home')} aria-label="KIMU Transport home">
          <img src={kimuLogo} alt="KIMU Transport and Multiservices Ltd" />
          <span><strong>KIMU</strong><small>TRANSPORT</small></span>
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
        className="maitrize-hero"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="maitrize-hero__backdrop" key={slide}>
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
            <button key={item.label} className={index === slide ? 'active' : ''} onClick={() => setSlide(index)} aria-label={`Go to slide ${index + 1}`} />
          ))}
        </div>
      </section>

      <main>
        <section id="about" className="maitrize-intro maitrize-section">
          <div className="maitrize-intro__visual">
            <img src={heroVehicle} alt="Professional driver in a vehicle" loading="lazy" />
            <div className="maitrize-intro__stamp">MAI<br /><strong>TRIZE</strong></div>
          </div>
          <div className="maitrize-intro__copy">
            <p className="maitrize-eyebrow">WELCOME TO KIMU TRANSPORT</p>
            <h2>WE DON'T JUST TEACH YOU TO DRIVE. <span>WE PREPARE YOU FOR THE ROAD AHEAD.</span></h2>
            <p>KIMU Transport provides professional driver training focused on practical skills, navigation, road safety and professional conduct. We understand the realities of professional transport work and prepare trainees for the responsibilities that come with it.</p>
            <button className="maitrize-text-button" onClick={() => scrollToSection('programme')}>DISCOVER MAITRIZE <span>→</span></button>
          </div>
        </section>

        <section id="programme" className="maitrize-programme maitrize-section">
          <div className="maitrize-section-heading">
            <p className="maitrize-eyebrow">MAITRIZE TRAINING PROGRAMME</p>
            <h2>THE SKILLS THAT MAKE A <span>PROFESSIONAL DRIVER.</span></h2>
          </div>
          <div className="maitrize-module-grid">
            {modules.map(([number, title, text], index) => (
              <article className={`maitrize-module maitrize-module--${index + 1}`} key={title}>
                <span className="maitrize-module__number">{number}</span>
                <div className="maitrize-module__icon" aria-hidden="true">{['↗', '⌖', '⇄', 'P', '✓', '◆', '⚙', '→'][index]}</div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="why-kimu" className="maitrize-why">
          <div className="maitrize-why__visual">
            <img src={heroProfessional} alt="Professional driver" loading="lazy" />
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
            <p>At KIMU Transport, professional training should prepare you for real opportunities. MAITRIZE develops the skills and professionalism needed to pursue opportunities within the transport industry.</p>
            <p className="maitrize-careers__note">Opportunities are subject to eligibility, selection and company terms. Training completion does not guarantee employment.</p>
            <button className="maitrize-button maitrize-button--white" onClick={() => scrollToSection('contact')}>JOIN MAITRIZE TODAY</button>
          </div>
          <div className="maitrize-careers__visual">
            <img src={confidentDriver} alt="Professional vehicle handover and career opportunity" loading="lazy" />
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
                  <span><strong>Student name</strong><small>MAITRIZE student · Replace with approved testimonial</small></span>
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
            {[['Driving & navigation', heroGps], ['Parking practice', heroDriverKeys], ['Professional conduct', heroTaxi], ['KIMU vehicles', trainingVehicle]].map(([title, image], index) => (
              <figure key={title} className={`maitrize-gallery__item maitrize-gallery__item--${index + 1}`}>
                <img src={image} alt={title} loading="lazy" />
                <figcaption><strong>{title}</strong><span>Project asset</span></figcaption>
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
            <label>Training interest<select name="interest" defaultValue="MAITRIZE"><option>MAITRIZE</option><option>Practical driving</option><option>Google Maps & navigation</option></select></label>
            <label>Previous driving experience<select name="experience" defaultValue="None"><option>None</option><option>Beginner</option><option>Some experience</option><option>Licensed driver</option></select></label>
            <label>Preferred contact method<select name="contactMethod" defaultValue="Telephone"><option>Telephone</option><option>Email</option><option>WhatsApp</option></select></label>
            {formState.message && <p className={`maitrize-form__message ${formState.status}`} role={formState.status === 'error' ? 'alert' : 'status'}>{formState.message}</p>}
            <button className="maitrize-button maitrize-button--green" type="submit">ENROLL NOW</button>
          </form>
        </section>
      </main>

      <footer className="maitrize-footer">
        <div className="maitrize-footer__brand">
          <img src={kimuLogo} alt="KIMU Transport" />
          <div><strong>KIMU</strong><small>TRANSPORT &amp; MULTISERVICES</small></div>
          <p>Professional driver training focused on practical skills, navigation, road safety and professional conduct.</p>
        </div>
        <div>
          <h3>Explore</h3>
          <button onClick={() => scrollToSection('about')}>About Us</button>
          <button onClick={() => scrollToSection('programme')}>Training Programme</button>
          <button onClick={() => scrollToSection('why-kimu')}>Why KIMU</button>
        </div>
        <div>
          <h3>MAITRIZE</h3>
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
