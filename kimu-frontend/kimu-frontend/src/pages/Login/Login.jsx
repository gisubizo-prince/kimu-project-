import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import kimuLogo from '../../assets/LOGO WEBSITE OK.png';
import './Login.css';

export default function Login() {
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const previousTitle = document.title;
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex,nofollow';
    document.head.appendChild(robots);
    document.title = 'Staff Login | KIMU Digital';
    return () => {
      robots.remove();
      document.title = previousTitle;
    };
  }, []);

  if (!authLoading && isAuthenticated) {
    const redirectTo = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please enter both your email and password.');
      return;
    }

    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="kimu-login">
      <div className="kimu-login__card">
        <section className="kimu-login__welcome" aria-label="KIMU staff workspace">
          <a className="kimu-login__brand" href="/" aria-label="KIMU Transport home">
            <img src={kimuLogo} alt="KIMU Transport and Multiservices Ltd" className="kimu-login__mark" />
          </a>
          <div className="kimu-login__welcome-copy">
            <p className="kimu-login__eyebrow">KIMU TRANSPORT · STAFF WORKSPACE</p>
            <h1>WELCOME<br />BACK.</h1>
            <p className="kimu-login__welcome-subtitle">Pick up where you left off and keep the training programme moving.</p>
          </div>
          <div className="kimu-login__features">
            <Feature icon={<PeopleIcon />} title="Manage students" text="Keep student records and training progress organized." />
            <Feature icon={<ClockIcon />} title="Track attendance" text="Record daily sessions and follow attendance at a glance." />
            <Feature icon={<ReportIcon />} title="Stay informed" text="Access reports and the tools your team needs." />
          </div>
          <p className="kimu-login__welcome-footer">MAITRISE · Professional driver training</p>
        </section>

        <section className="kimu-login__form-panel">
          <div className="kimu-login__form-content">
            <p className="kimu-login__form-eyebrow">STAFF PORTAL</p>
            <h2 className="kimu-login__title">Welcome back</h2>
            <p className="kimu-login__subtitle">Sign in to continue to your workspace.</p>

            <form onSubmit={handleSubmit} noValidate>
              <div className="kimu-field">
                <label htmlFor="email">Email address</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>

              <div className="kimu-field">
                <label htmlFor="password">Password</label>
                <div className="kimu-field__password-wrap">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting}
                    required
                  />
                  <button
                    type="button"
                    className="kimu-field__toggle"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              <div className="kimu-login__row">
                <label className="kimu-checkbox">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  <span>Remember me</span>
                </label>
              </div>

              {error && (
                <div className="kimu-login__error" role="alert">
                  {error}
                </div>
              )}

              <button type="submit" className="kimu-login__submit" disabled={submitting}>
                <span>{submitting ? 'Signing in…' : 'Sign in to workspace'}</span>
                {!submitting && <ArrowIcon />}
              </button>
            </form>

            <p className="kimu-login__security"><LockIcon /> Secure access for authorized staff</p>
            <a className="kimu-login__back-link" href="/">Back to KIMU Transport website</a>
          </div>
        </section>
      </div>
    </div>
  );
}

function Feature({ icon, title, text }) {
  return (
    <div className="kimu-login__feature">
      <span className="kimu-login__feature-icon" aria-hidden="true">{icon}</span>
      <span className="kimu-login__feature-copy"><strong>{title}</strong><span>{text}</span></span>
    </div>
  );
}

function iconProps() {
  return { width: 21, height: 21, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
}
function PeopleIcon() { return <svg {...iconProps()}><circle cx="9" cy="8" r="3"/><path d="M3.5 20c0-3.2 2.3-5.3 5.5-5.3s5.5 2.1 5.5 5.3"/><path d="M16 5.4a3 3 0 0 1 0 5.8M17 14.8c2.2.7 3.5 2.4 3.5 5.2"/></svg>; }
function ClockIcon() { return <svg {...iconProps()}><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3.2 2"/></svg>; }
function ReportIcon() { return <svg {...iconProps()}><path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"/><path d="M14 3.5v4h4M9 12h6M9 16h6"/></svg>; }
function LockIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3M12 14v3"/></svg>; }
function ArrowIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg>; }

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 3l18 18" />
      <path d="M10.6 5.1A10.7 10.7 0 0 1 12 5c6.5 0 10 7 10 7a13.2 13.2 0 0 1-3.4 4.1M6.4 6.4A13.2 13.2 0 0 0 2 12s3.5 7 10 7a10.6 10.6 0 0 0 4.2-.9" />
      <path d="M9.5 9.5a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}
