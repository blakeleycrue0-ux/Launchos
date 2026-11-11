import { Icon } from '@/components/ui/Icon';
import type { TaskStatus } from '@/domain/types';

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'pendiente',
  in_progress: 'en curso',
  done: 'completada',
  skipped: 'omitida',
};

/** Casilla circular: alterna entre completada y pendiente. */
export function TaskStatusToggle({
  status,
  title,
  pending,
  onToggle,
}: {
  status: TaskStatus;
  title: string;
  pending?: boolean;
  onToggle: (next: TaskStatus) => void;
}) {
  const done = status === 'done';
  return (
    <button
      type="button"
      className="status-check"
      data-status={status}
      disabled={pending}
      aria-pressed={done}
      aria-label={`${done ? 'Marcar como pendiente' : 'Marcar como completada'}: ${title} (${STATUS_LABEL[status]})`}
      onClick={() => onToggle(done ? 'todo' : 'done')}
    >
      {done && <Icon name="check" />}
    </button>
  );
}

export { STATUS_LABEL };
