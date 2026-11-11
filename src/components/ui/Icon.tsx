/**
 * Conjunto mínimo de iconos de trazo (24×24, 1.75px). Se dibujan a mano para
 * mantener coherencia visual; no se usan librerías de iconos genéricas.
 */
const paths = {
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  arrowLeft: <path d="M19 12H5m6-6l-6 6 6 6" />,
  arrowRight: <path d="M5 12h14m-6-6l6 6-6 6" />,
  external: <path d="M14 5h5v5m0-5l-8 8M10 5H6a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1v-4" />,
  copy: <path d="M9 9h10v10H9zM5 15V5h10" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}
