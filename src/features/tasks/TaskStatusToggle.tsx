import { motion } from 'motion/react';
import type { TaskStatus } from '@/domain/types';

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'pendiente',
  in_progress: 'en curso',
  done: 'completada',
  skipped: 'omitida',
};

/** Casilla circular: alterna entre completada y pendiente, con el check dibujado. */
export function TaskStatusToggle({ status, title, pending, onToggle }: { status: TaskStatus; title: string; pending?: boolean; onToggle: (next: TaskStatus) => void }) {
  const done = status === 'done';
  return (
    <motion.button
      type="button"
      className="check"
      data-status={status}
      disabled={pending}
      aria-pressed={done}
      aria-label={`${done ? 'Marcar como pendiente' : 'Marcar como completada'}: ${title} (${STATUS_LABEL[status]})`}
      onClick={() => onToggle(done ? 'todo' : 'done')}
      whileTap={{ scale: 0.86 }}
      transition={{ type: 'spring', stiffness: 500, damping: 26 }}
    >
      {done && (
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <motion.path d="M2.6 6.3l2.2 2.2 4.6-4.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }} />
        </svg>
      )}
    </motion.button>
  );
}
