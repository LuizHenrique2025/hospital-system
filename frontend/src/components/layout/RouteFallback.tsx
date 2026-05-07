export function RouteFallback() {
  return (
    <div className="route-fallback" role="status" aria-live="polite">
      <span className="route-fallback-marker" />
      <span>Carregando modulo...</span>
    </div>
  );
}
