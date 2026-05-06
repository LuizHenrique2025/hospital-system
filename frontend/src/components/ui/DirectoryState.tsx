type DirectoryStateProps = {
  code: string;
  description: string;
  title: string;
};

export function DirectoryState({
  code,
  description,
  title,
}: DirectoryStateProps) {
  return (
    <div className="directory-state">
      <span>{code}</span>
      <strong>{title}</strong>
      <small>{description}</small>
    </div>
  );
}
