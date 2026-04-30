type DetailItemProps = {
  label: string;
  value: number | string;
};

export function DetailItem({ label, value }: DetailItemProps) {
  return (
    <div className="record-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
