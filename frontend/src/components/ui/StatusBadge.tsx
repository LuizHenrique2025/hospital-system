type StatusBadgeProps = {
  label: string;
  tone?: string;
};

export function StatusBadge({ label, tone = 'tone-info' }: StatusBadgeProps) {
  return <span className={`status-badge ${tone}`}>{label}</span>;
}
