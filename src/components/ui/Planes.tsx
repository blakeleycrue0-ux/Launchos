/** Planos inclinados de la marca (eco del símbolo) para superficies oscuras. */
export function Planes({ variant = 'a' }: { variant?: 'a' | 'b' }) {
  return (
    <div className={`planes planes--${variant}`} aria-hidden="true">
      <i />
      <i />
      <i />
    </div>
  );
}
