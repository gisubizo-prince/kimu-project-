import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import letterhead from '../../assets/LETTER HEAD.png';
import letterheadFooter from '../../assets/LETTER HEAD d.png';
import './Certverify.css';

export default function VerifyCertificate() {
  const { id } = useParams();
  const [state, setState] = useState({ loading: true, certificate: null, error: '' });

  useEffect(() => {
    let live = true;
    api.get(`/certificates/verify/${encodeURIComponent(id)}`)
      .then(({ data }) => { if (live) setState({ loading: false, certificate: data.certificate, error: '' }); })
      .catch((error) => { if (live) setState({ loading: false, certificate: null, error: error.status === 404 ? 'Certificate not found.' : error.message }); });
    return () => { live = false; };
  }, [id]);

  const certificate = state.certificate;
  const pdfUrl = `${api.defaults.baseURL}/certificates/verify/${encodeURIComponent(id)}/pdf?download=1`;
  const issueDate = certificate?.issueDate ? new Date(certificate.issueDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '';

  return (
    <main className="cv-verify">
      <div className="cv-verify__intro">
        <span className="cv-verify__intro-mark" aria-hidden="true">✓</span>
        <div><p className="cv-eyebrow">KIMU TRANSPORT &amp; MULTISERVICES</p><h1>Certificate verification</h1><p>Official certificate record · Secure public verification</p></div>
      </div>

      {state.loading ? <section className="cv-verify__state" aria-live="polite"><span className="cv-verify__loader" />Checking the live certificate register…</section>
        : state.error ? <section className="cv-verify__state cv-verify__state--error" role="alert"><strong>We couldn’t verify this certificate</strong><span>{state.error}</span></section>
          : <article className="cv-document" aria-label="Verified certificate details">
            <img className="cv-document__letterhead" src={letterhead} alt="KIMU Transport and Multiservices letterhead" />
            <section className="cv-document__body">
              <div className={`cv-verify__result ${certificate.status === 'valid' ? '' : 'is-revoked'}`}>
                <span className="cv-verify__result-icon" aria-hidden="true">{certificate.status === 'valid' ? '✓' : '!'}</span>
                <span><strong>{certificate.status === 'valid' ? 'Certificate verified' : 'Certificate revoked'}</strong><small>{certificate.status === 'valid' ? 'This record is confirmed in the KIMU register' : 'This certificate is no longer valid'}</small></span>
                <span className="cv-verify__live"><i /> LIVE RECORD</span>
              </div>
              <p className="cv-document__eyebrow">CERTIFICATE OF COMPLETION</p>
              <h2>{certificate.studentName}</h2>
              <p className="cv-document__lead">has successfully completed</p>
              <p className="cv-document__course">{certificate.course}</p>
              <div className="cv-document__rule"><span>✦</span></div>
              <p className="cv-document__institution">Issued by <strong>{certificate.institution}</strong></p>
              <dl className="cv-document__details">
                <div><dt>Certificate ID</dt><dd>{certificate.certificateId}</dd></div>
                <div><dt>Issue date</dt><dd>{issueDate}</dd></div>
                {certificate.academicYear && <div><dt>Academic year</dt><dd>{certificate.academicYear}</dd></div>}
              </dl>
              {certificate.pdfAvailable && <a className="cv-verify__pdf" href={pdfUrl}><span aria-hidden="true">↓</span> Download printable certificate</a>}
              <p className="cv-document__footnote">This digital record was checked against the official KIMU certificate register.</p>
            </section>
            <img className="cv-document__footer" src={letterheadFooter} alt="KIMU office location: Gisozi, Kigali, Rwanda" />
          </article>}
      <p className="cv-verify__security"><span aria-hidden="true">◈</span> Secure certificate lookup <span>·</span> KIMU Transport &amp; Multiservices</p>
    </main>
  );
}
