import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { CountUp } from '@/components/ui/CountUp';
import { Icon } from '@/components/ui/Icon';
import { Alert } from '@/components/ui/States';
import { estimateWeeks } from '@/domain/progress';
import { toUserMessage } from '@/lib/errors';
import { useUpdateTask } from '@/features/projects/api';
import { workspaceGate } from '@/features/projects/ProjectStates';
import { useProjectWorkspace } from '@/features/projects/useProjectWorkspace';
import { TaskRow } from './TaskRow';

const EASE = [0.22, 1, 0.36, 1] as const;
type Filter = 'all' | 'open' | 'done';
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'open', label: 'Pendientes' },
  { value: 'done', label: 'Hechas' },
];

export function RoadmapPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const ws = useProjectWorkspace(projectId);
  const updateTask = useUpdateTask(projectId ?? '');
  const [filter, setFilter] = useState<Filter>('all');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const gate = workspaceGate(ws);
  const project = ws.project.data;
  if (gate || !project || !ws.path || !ws.data) return gate;
  const { items, summary, byPhase, next, remainingMinutes } = ws.data;
  const phases = ws.path.phases.filter((p) => byPhase.has(p.key));
  const match = (status: string) => filter === 'all' || (filter === 'done' ? status === 'done' || status === 'skipped' : status === 'todo' || status === 'in_progress');
  const weeks = estimateWeeks(remainingMinutes, project.weekly_hours);

  return (
    <div className="page">
      <header className="phead">
        <div>
          <p className="phead__eyebrow">{project.name}</p>
          <h1 className="phead__title">Roadmap</h1>
        </div>
        <div className="seg" role="group" aria-label="Filtrar tareas">
          <LayoutGroup id="roadmap-filter">
            {FILTERS.map((f) => (
              <button key={f.value} type="button" aria-pressed={filter === f.value} onClick={() => setFilter(f.value)}>
                {filter === f.value && <motion.span layoutId="pill" className="seg__pill" transition={{ type: 'spring', stiffness: 460, damping: 36 }} />}
                <span>{f.label}</span>
              </button>
            ))}
          </LayoutGroup>
        </div>
      </header>

      <div className="rsum">
        <div className="rsum__figure">
          <span className="rsum__pct">
            <CountUp value={summary.percent} />
            <small>%</small>
          </span>
          <span className="rsum__text">
            {summary.done} de {summary.total - summary.skipped} tareas{remainingMinutes > 0 ? ` · quedan unas ${weeks} ${weeks === 1 ? 'semana' : 'semanas'} a tu ritmo` : ' · roadmap completado'}
          </span>
        </div>
        {/* Una barra por fase, proporcional a su número de tareas. */}
        <div className="rsum__bars" aria-hidden="true">
          {phases.map((p) => {
            const s = byPhase.get(p.key)!;
            return (
              <div key={p.key} className="rsum__bar" style={{ flexGrow: s.total }}>
                <motion.i initial={{ scaleX: 0 }} animate={{ scaleX: s.percent / 100 }} transition={{ type: 'spring', stiffness: 70, damping: 20 }} />
                <span>{p.title}</span>
              </div>
            );
          })}
        </div>
      </div>

      {updateTask.error && <Alert tone="error">No se ha podido guardar el cambio: {toUserMessage(updateTask.error)}</Alert>}

      <ol className="rphases">
        {phases.map((phase, i) => {
          const s = byPhase.get(phase.key)!;
          const phaseItems = items.filter((it) => it.row.phase_key === phase.key);
          const visible = phaseItems.filter((it) => match(it.row.status));
          const complete = s.percent === 100;
          const isCollapsed = collapsed[phase.key] ?? (complete && phase.key !== next?.row.phase_key && filter === 'all');
          return (
            <motion.li key={phase.key} className="rphase" data-complete={complete} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE, delay: i * 0.07 }}>
              <span className="rphase__node" aria-hidden="true">
                {complete ? <Icon name="check" size={13} /> : String(i + 1).padStart(2, '0')}
              </span>
              <button type="button" className="rphase__head" aria-expanded={!isCollapsed} onClick={() => setCollapsed((c) => ({ ...c, [phase.key]: !isCollapsed }))}>
                <span className="rphase__text">
                  <span className="rphase__title">{phase.title}</span>
                  <span className="rphase__desc">{phase.description}</span>
                </span>
                <span className="rphase__count">
                  {s.done}/{s.total - s.skipped}
                </span>
                <motion.span className="rphase__chev" animate={{ rotate: isCollapsed ? 0 : 180 }} transition={{ duration: 0.25, ease: EASE }}>
                  <Icon name="chevron" size={16} />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.div className="rphase__body" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: EASE }}>
                    {visible.length > 0 ? (
                      <ul className="tlist">
                        <AnimatePresence initial={false} mode="popLayout">
                          {visible.map((item) => (
                            <TaskRow
                              key={item.row.id}
                              item={item}
                              projectId={project.id}
                              pending={updateTask.isPending && updateTask.variables?.taskId === item.row.id}
                              highlight={item.row.id === next?.row.id}
                              onToggle={(status) => updateTask.mutate({ taskId: item.row.id, patch: { status } })}
                            />
                          ))}
                        </AnimatePresence>
                      </ul>
                    ) : (
                      <p className="rphase__empty">{filter === 'done' ? 'Todavía no hay tareas hechas en esta fase.' : 'No queda nada pendiente en esta fase.'}</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
