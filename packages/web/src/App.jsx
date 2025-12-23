const getApiBaseUrl = () => {
  const raw = import.meta.env.VITE_API_BASE_URL;
  if (!raw || typeof raw !== "string") {
    return "";
  }
  const trimmed = raw.trim();
  return trimmed ? trimmed.replace(/\/$/, "") : "";
};

export default function App() {
  const apiBaseUrl = getApiBaseUrl();
  const healthUrl = apiBaseUrl ? `${apiBaseUrl}/health` : "";

  return (
    <div className="page">
      <header className="hero">
        <p className="kicker">Obra exhibible</p>
        <h1>Booking Pro</h1>
        <p className="subtitle">
          Obra backend observable + habitat web (en integracion)
        </p>
      </header>

      <main className="grid">
        <section className="card" aria-labelledby="obra-api">
          <h2 id="obra-api">Obra API</h2>
          <p className="body">
            Salud, disponibilidad y reservas con control de concurrencia.
          </p>
          {healthUrl ? (
            <a className="button" href={healthUrl} target="_blank" rel="noreferrer">
              Ver salud
            </a>
          ) : (
            <p className="muted">VITE_API_BASE_URL no configurado.</p>
          )}
          {apiBaseUrl ? (
            <p className="meta">API: {apiBaseUrl}</p>
          ) : (
            <p className="meta">API: sin base configurada.</p>
          )}
        </section>

        <section className="card" aria-labelledby="qa-exhibible">
          <h2 id="qa-exhibible">QA exhibible</h2>
          <p className="body">
            Documento interno: <span className="mono">packages/api/QA-CONCURRENCY.md</span>
          </p>
          <div className="code">
            <pre>
              <code>qa:concurrency:railway</code>
            </pre>
          </div>
          <p className="muted">
            La evidencia valida 1x201 + (N-1)x409 sobre el mismo slot.
          </p>
        </section>
      </main>
    </div>
  );
}
