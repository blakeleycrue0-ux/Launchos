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
  overview: <path d="M4 5h7v6H4zM13 5h7v10h-7zM4 13h7v6H4zM13 17h7v2h-7z" />,
  roadmap: <path d="M4 6.5l1.6 1.6L8.4 5M11 6.5h9M4 12.5l1.6 1.6L8.4 11M11 12.5h9M5 18.5h.01M11 18.5h9" />,
  chart: <path d="M4 19h16M5 15.5l4.2-4.6 3.4 3L19 7" />,
  folder: <path d="M4 7.5a1.5 1.5 0 011.5-1.5h3.6l1.8 2h7.6A1.5 1.5 0 0120 9.5v8a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 17.5z" />,
  user: <path d="M12 12a3.6 3.6 0 100-7.2 3.6 3.6 0 000 7.2zM5 19.5c.8-3 3.6-4.6 7-4.6s6.2 1.6 7 4.6" />,
  chevron: <path d="M7 10l5 5 5-5" />,
  clock: <path d="M12 20a8 8 0 100-16 8 8 0 000 16zM12 8v4.4l2.8 1.8" />,
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
