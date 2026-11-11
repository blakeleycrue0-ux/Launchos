export function ConfigErrorScreen({ missing }: { missing: string[] }) {
  return (
    <div className="fullscreen-center">
      <div className="card" style={{ maxWidth: 520 }}>
        <div className="card__body stack-md">
          <h1 style={{ fontSize: 'var(--text-lg)' }}>Falta configurar Supabase</h1>
          <p className="page-header__desc" style={{ marginTop: 0 }}>
            LaunchOS necesita las siguientes variables de entorno para conectarse a la base de datos:
          </p>
          <ul style={{ margin: 0, paddingLeft: 'var(--space-5)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}>
            {missing.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
          <p className="field__hint">
            En local, copia <code>.env.example</code> a <code>.env.local</code>. En Netlify, añádelas en Site configuration → Environment variables y vuelve a desplegar.
          </p>
        </div>
      </div>
    </div>
  );
}
