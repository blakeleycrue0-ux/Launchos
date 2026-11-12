import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Icon } from '@/components/ui/Icon';
import type { TaskStatus } from '@/domain/types';
import { formatMinutes } from '@/lib/format';
import type { WorkspaceItem } from '@/features/projects/useProjectWorkspace';
import { TaskStatusToggle } from './TaskStatusToggle';

export function TaskRow({ item, projectId, pending, highlight, onToggle }: { item: WorkspaceItem; projectId: string; pending: boolean; highlight?: boolean; onToggle: (status: TaskStatus) => void }) {
  const { row, template } = item;
  return (
    <motion.li
      layout="position"
      className="trow"
      data-status={row.status}
      data-next={highlight || undefined}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <TaskStatusToggle status={row.status} title={template.title} pending={pending} onToggle={onToggle} />
      <Link to={`/app/projects/${projectId}/tasks/${row.id}`} className="trow__link">
        <span className="trow__title">{template.title}</span>
        <span className="trow__meta">
          {highlight && row.status === 'todo' && <span className="tag tag--accent">Siguiente</span>}
          {row.status === 'in_progress' && <span className="tag tag--accent">En curso</span>}
          {row.status === 'skipped' && <span className="tag">Omitida</span>}
          {row.notes && <span className="tag">Con notas</span>}
          <span className="trow__time">{formatMinutes(template.estimatedMinutes)}</span>
          <Icon name="arrowRight" size={15} />
        </span>
      </Link>
    </motion.li>
  );
}
