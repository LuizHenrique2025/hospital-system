type RecordLineProps = {
  label: string;
  value?: string | null;
};

export function RecordLine({ label, value }: RecordLineProps) {
  return (
    <div className="record-line">
      <span>{label}</span>
      <strong>{value || 'Nao informado'}</strong>
    </div>
  );
}
