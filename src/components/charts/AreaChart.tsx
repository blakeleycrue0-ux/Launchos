import { useId, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';

export interface ChartPoint {
  /** Fecha ISO (YYYY-MM-DD). */
  date: string;
  value: number;
}

const EASE = [0.22, 1, 0.36, 1] as const;
const W = 720;
const M = { top: 16, right: 16, bottom: 28, left: 48 };

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * pow;
}

/**
 * Gráfica de área de una sola serie con eje temporal.
 * - Un único eje Y que parte de cero.
 * - Cruz y tooltip al pasar el cursor o tocar; también navegable con las flechas.
 */
export function AreaChart({
  points,
  height = 240,
  formatValue,
  formatDate,
  label,
}: {
  points: ChartPoint[];
  height?: number;
  formatValue: (v: number) => string;
  formatDate: (iso: string) => string;
  label: string;
}) {
  const gradient = useId();
  const svg = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState<number | null>(null);

  const geo = useMemo(() => {
    const times = points.map((p) => new Date(`${p.date}T00:00:00`).getTime());
    const t0 = times[0] ?? 0;
    const t1 = times[times.length - 1] ?? 1;
    const span = t1 - t0 || 1;
    const max = niceMax(Math.max(...points.map((p) => p.value), 0));
    const iw = W - M.left - M.right;
    const ih = height - M.top - M.bottom;
    const xy = points.map((p, i) => ({ x: M.left + ((times[i]! - t0) / span) * iw, y: M.top + ih - (p.value / max) * ih }));
    const line = xy.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const area = `${line} L${xy[xy.length - 1]!.x.toFixed(1)} ${M.top + ih} L${xy[0]!.x.toFixed(1)} ${M.top + ih} Z`;
    const ticks = [0, 0.5, 1].map((f) => ({ y: M.top + ih - f * ih, value: max * f }));
    return { xy, line, area, ticks, base: M.top + ih };
  }, [points, height]);

  function nearest(clientX: number) {
    const rect = svg.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((clientX - rect.left) / rect.width) * W;
    let best = 0;
    geo.xy.forEach((p, i) => {
      if (Math.abs(p.x - x) < Math.abs(geo.xy[best]!.x - x)) best = i;
    });
    setActive(best);
  }

  const a = active !== null ? geo.xy[active] : undefined;
  const ap = active !== null ? points[active] : undefined;
  const first = points[0]!;
  const last = points[points.length - 1]!;

  return (
    <div className="chart">
      <svg
        ref={svg}
        viewBox={`0 0 ${W} ${height}`}
        role="img"
        aria-label={`${label}. De ${formatValue(first.value)} el ${formatDate(first.date)} a ${formatValue(last.value)} el ${formatDate(last.date)}.`}
        tabIndex={0}
        onPointerMove={(e) => nearest(e.clientX)}
        onPointerDown={(e) => nearest(e.clientX)}
        onPointerLeave={() => setActive(null)}
        onBlur={() => setActive(null)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') setActive((i) => Math.min(points.length - 1, (i ?? -1) + 1));
          if (e.key === 'ArrowLeft') setActive((i) => Math.max(0, (i ?? points.length) - 1));
          if (e.key === 'Escape') setActive(null);
        }}
      >
        <defs>
          <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--blue-600)" stopOpacity="0.2" />
            <stop offset="1" stopColor="var(--blue-600)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {geo.ticks.map((t) => (
          <g key={t.y}>
            <line x1={M.left} x2={W - M.right} y1={t.y} y2={t.y} className="chart__grid" />
            <text x={M.left - 10} y={t.y + 4} textAnchor="end" className="chart__tick">
              {formatValue(t.value)}
            </text>
          </g>
        ))}
        <text x={M.left} y={height - 6} className="chart__tick">
          {formatDate(first.date)}
        </text>
        <text x={W - M.right} y={height - 6} textAnchor="end" className="chart__tick">
          {formatDate(last.date)}
        </text>
        <motion.path d={geo.area} fill={`url(#${gradient})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.5 }} />
        <motion.path d={geo.line} fill="none" stroke="var(--blue-600)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: EASE }} />
        {geo.xy.length <= 24 &&
          geo.xy.map((p, i) => (
            <motion.circle key={i} cx={p.x} cy={p.y} r="3.5" className="chart__dot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 + i * 0.03 }} />
          ))}
        {a && (
          <g pointerEvents="none">
            <line x1={a.x} x2={a.x} y1={M.top} y2={geo.base} className="chart__cross" />
            <circle cx={a.x} cy={a.y} r="5.5" className="chart__dot chart__dot--active" />
          </g>
        )}
      </svg>
      {a && ap && (
        <div className="chart__tip" style={{ left: `${(a.x / W) * 100}%`, top: `${(a.y / height) * 100}%` }} data-flip={a.x > W * 0.7} role="status">
          <strong>{formatValue(ap.value)}</strong>
          <span>{formatDate(ap.date)}</span>
        </div>
      )}
    </div>
  );
}
