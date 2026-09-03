import './EmptyState.css';

/**
 * Shown when a page has no data yet. Always pairs the "nothing here" message
 * with a clear next action, per the "empty screen is an invitation to act" rule.
 */
export default function EmptyState({ title, description, actionLabel, onAction }) {
  return (
    <div className="kimu-empty">
      <div className="kimu-empty__icon">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 9h18M8 4v16" />
        </svg>
      </div>
      <h3 className="kimu-empty__title">{title}</h3>
      {description && <p className="kimu-empty__desc">{description}</p>}
      {actionLabel && onAction && (
        <button className="kimu-btn kimu-btn--primary" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
