import { Link } from 'react-router-dom';
import { BRAND } from '@/config/brand';

/** Símbolo oficial de LaunchOS. Hereda el color del texto (currentColor). */
export function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <span
      className="logo__mark"
      aria-hidden="true"
      style={{
        height: size,
        width: Math.round(size * BRAND.markRatio),
        WebkitMaskImage: `url(${BRAND.markSrc})`,
        maskImage: `url(${BRAND.markSrc})`,
      }}
    />
  );
}

export function Logo({ to = '/app', size }: { to?: string; size?: number }) {
  return (
    <Link to={to} className="logo" aria-label={`${BRAND.name}, ir al inicio`}>
      <LogoMark size={size} />
      <span className="logo__wordmark">{BRAND.name}</span>
    </Link>
  );
}
