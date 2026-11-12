import { useEffect, useRef, useState } from 'react';

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Número que cuenta hasta su valor. `format` permite moneda, porcentajes, etc. */
export function CountUp({ value, format = (n) => String(Math.round(n)), duration = 700 }: { value: number; format?: (n: number) => string; duration?: number }) {
  const [display, setDisplay] = useState(value);
  const shown = useRef(value);
  useEffect(() => {
    const from = shown.current;
    if (from === value) return;
    if (reduced()) {
      shown.current = value;
      setDisplay(value);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const next = from + (value - from) * (1 - Math.pow(1 - p, 3));
      shown.current = next;
      setDisplay(p < 1 ? next : value);
      if (p < 1) raf = requestAnimationFrame(tick);
      else shown.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{format(display)}</>;
}
