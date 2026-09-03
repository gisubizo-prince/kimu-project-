import EmptyState from './EmptyState';

/**
 * Used by modules that have not yet received a dedicated workflow.
 */
export default function PlaceholderPage({ title, description }) {
  return (
    <EmptyState
      title={title}
      description={description}
    />
  );
}
