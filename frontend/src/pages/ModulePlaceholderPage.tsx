type ModulePlaceholderPageProps = {
  description: string;
  environment: string;
  steps: string[];
  title: string;
};

export function ModulePlaceholderPage({
  description,
  environment,
  steps,
  title,
}: ModulePlaceholderPageProps) {
  return (
    <section className="panel module-placeholder">
      <div className="page-header">
        <div>
          <p className="eyebrow">{environment}</p>
          <h2>{title}</h2>
        </div>
        <span className="inline-badge">Em configuracao</span>
      </div>

      <p>{description}</p>

      <div className="placeholder-flow">
        {steps.map((step, index) => (
          <article key={step}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <strong>{step}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}
