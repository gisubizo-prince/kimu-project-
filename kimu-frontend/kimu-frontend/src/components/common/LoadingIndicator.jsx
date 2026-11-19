import { useEffect, useState } from 'react';
import kimuLogo from '../../assets/LOGO WEBSITE OK.png';
import './LoadingIndicator.css';

export function NetworkLoader() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function handleLoading(event) {
      setVisible(event.detail.visible);
    }

    window.addEventListener('kimu:network-loading', handleLoading);
    return () => window.removeEventListener('kimu:network-loading', handleLoading);
  }, []);

  if (!visible) return null;

  return (
    <div className="kimu-network-loader" role="status" aria-live="polite">
      <span className="kimu-network-loader__spinner" aria-hidden="true" />
      <span>Loading your workspace</span>
      <span className="kimu-network-loader__track" aria-hidden="true"><i /></span>
    </div>
  );
}

export default function LoadingIndicator({ label = 'Preparing your workspace' }) {
  return (
    <div className="kimu-loading-screen" role="status" aria-live="polite">
      <div className="kimu-loading-screen__card">
        <img src={kimuLogo} alt="KIMU Transport and Multiservices Ltd" />
        <span className="kimu-loading-screen__spinner" aria-hidden="true" />
        <strong>{label}</strong>
        <span className="kimu-loading-screen__caption">Please wait a moment</span>
      </div>
    </div>
  );
}
