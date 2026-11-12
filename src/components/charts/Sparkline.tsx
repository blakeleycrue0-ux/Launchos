import { motion } from 'motion/react';

/** Línea mínima sin ejes: da forma a la tendencia junto a una cifra. */
export function Sparkline({ values, width = 120, height = 36 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return <svg width={width} height={height} aria-hidden="true" />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 3;
  const pts = values.map((v, i) => [pad + (i / (values.length - 1)) * (width - pad * 2), height - pad - ((v - min) / span) * (height - pad * 2)] as const);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1]!;
  return (
    <svg className="spark" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <motion.path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
      <motion.circle cx={last[0]} cy={last[1]} r="3" fill="currentColor" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8, type: 'spring', stiffness: 400, damping: 20 }} />
    </svg>
  );
}
