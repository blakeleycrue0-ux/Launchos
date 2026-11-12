import { motion } from 'motion/react';

/** Anillo de progreso animado. El trazo usa currentColor. */
export function ProgressRing({ value, size = 96, stroke = 6, label, track = 'rgb(127 127 140 / 0.22)' }: { value: number; size?: number; stroke?: number; label: string; track?: string }) {
  const v = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  return (
    <svg className="ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label}: ${Math.round(v)} %`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: Math.max(0.001, v / 100) }}
        transition={{ type: 'spring', stiffness: 60, damping: 18 }}
      />
    </svg>
  );
}
