import { Link } from 'react-router-dom';
import { BRAND } from '@/config/brand';

/**
 * Logo oficial de LaunchOS.
 *
 * El símbolo aprobado (cuadrado negro redondeado con tres paneles blancos
 * inclinados) se cargará desde BRAND.logoSrc cuando se añada el archivo
 * original a /public/brand. Hasta entonces se muestra solo el nombre:
 * no se dibuja ninguna versión aproximada del símbolo.
 */
export function Logo({ to = '/app' }: { to?: string }) {
  return (
    <Link to={to} className="logo" aria-label={`${BRAND.name}, ir al inicio`}>
      {BRAND.logoSrc && <img src={BRAND.logoSrc} alt="" width={26} height={26} />}
      <span className="logo__wordmark">{BRAND.name}</span>
    </Link>
  );
}
