type EmptyStateProps = {
  action?: string;
  description: string;
  icon?: string;
  title: string;
};

export function EmptyState({
  action,
  description,
  icon = '!',
  title,
}: EmptyStateProps) {
  return (
    <div className="context-empty-state">
      <span className="context-empty-icon" aria-hidden="true">
        {icon}
      </span>
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
        {action ? <small>{action}</small> : null}
      </div>
    </div>
  );
}
