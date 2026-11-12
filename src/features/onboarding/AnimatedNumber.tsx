import { useEffect, useRef, useState } from 'react';

import { prefersReducedMotion } from './motion';

/** Número que cuenta hasta su nuevo valor y se tiñe de azul un instante al cambiar. */
export function AnimatedNumber({ value, duration = 620 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(value);
  const shown = useRef(value);
  const el = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const from = shown.current;
    if (from === value) return;
    if (prefersReducedMotion()) {
      shown.current = value;
      setDisplay(value);
      return;
    }
    // De azul al color propio: señala qué cifra acaba de cambiar.
    el.current?.animate?.([{ color: '#a3adf0' }], { duration: 1400, easing: 'ease-out', direction: 'reverse' });
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const next = Math.round(from + (value - from) * eased);
      shown.current = next;
      setDisplay(next);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <span ref={el}>{display}</span>;
}
