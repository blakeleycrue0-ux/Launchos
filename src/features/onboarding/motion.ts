/** Curvas y muelles compartidos por todo el onboarding: un solo carácter de movimiento. */
export const EASE = [0.22, 1, 0.36, 1] as const;
export const EASE_IN = [0.5, 0, 0.75, 0] as const;
export const SPRING = { type: 'spring', stiffness: 420, damping: 36, mass: 0.9 } as const;
export const SPRING_SOFT = { type: 'spring', stiffness: 140, damping: 24 } as const;

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
