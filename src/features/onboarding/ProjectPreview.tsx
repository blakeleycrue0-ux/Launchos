import { useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { scorePaths } from '@/content/guidance';
import { labels } from '@/content/options';
import { AVAILABLE_PATHS, getAvailablePath } from '@/content/paths';
import { estimateWeeks } from '@/domain/progress';
import { generateRoadmap, indexTemplates } from '@/domain/roadmap';
import type { AvailablePath } from '@/domain/types';
import { formatMinutes } from '@/lib/format';
import { AnimatedNumber } from './AnimatedNumber';
import type { Draft } from './steps';

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Modelo de la vista previa. El roadmap se calcula con la misma función que
 * crea el proyecto real (generateRoadmap). Mientras falten respuestas se usan
 * los supuestos más conservadores y se marca como provisional.
 */
export function usePreviewModel(draft: Draft, path: AvailablePath | undefined) {
  return useMemo(() => {
    if (!path) return null;
    const tasks = generateRoadmap(path, {
      experience: draft.experience ?? 'none',
      budget: draft.budget ?? 'zero',
      weeklyHours: draft.weeklyHours ?? 'h5_10',
      stage: draft.stage ?? 'idea',
      pathAnswers: draft.pathAnswers,
    });
    const index = indexTemplates(path);
    const phases = path.phases
      .map((phase) => ({
        key: phase.key,
        title: phase.title,
        tasks: tasks
          .filter((t) => t.phaseKey === phase.key)
          .map((t) => {
            const tpl = index.get(t.templateKey)!.template;
            return { key: t.templateKey, title: tpl.title, minutes: tpl.estimatedMinutes, done: t.status === 'done' };
          }),
      }))
      .filter((p) => p.tasks.length > 0);
    const all = phases.flatMap((p) => p.tasks);
    const pending = all.filter((t) => !t.done);
    const minutes = pending.reduce((acc, t) => acc + t.minutes, 0);
    const provisional =
      !draft.stage || !draft.experience || !draft.budget || !draft.weeklyHours || path.questions.some((q) => !draft.pathAnswers[q.key]);
    return {
      phases,
      total: all.length,
      done: all.length - pending.length,
      hours: Math.round(minutes / 60),
      weeks: draft.weeklyHours ? estimateWeeks(minutes, draft.weeklyHours) : null,
      first: pending[0] ?? null,
      provisional,
    };
  }, [draft.experience, draft.budget, draft.weeklyHours, draft.stage, draft.pathAnswers, path]);
}

export type PreviewModel = ReturnType<typeof usePreviewModel>;

function Value({ children }: { children: string | undefined }) {
  // key = valor: cada cambio vuelve a montar el nodo y dispara la entrada.
  return children ? (
    <motion.span
      key={children}
      className="pv-attr__value"
      initial={{ opacity: 0, y: 8, color: 'var(--blue-300)' }}
      animate={{ opacity: 1, y: 0, color: 'var(--on-dark)' }}
      transition={{ duration: 0.45, ease: EASE, color: { duration: 1.4 } }}
    >
      {children}
    </motion.span>
  ) : (
    <span className="pv-attr__value pv-attr__value--empty">Pendiente</span>
  );
}

export function ProjectPreview({ draft, path, model }: { draft: Draft; path: AvailablePath | undefined; model: PreviewModel }) {
  const name = draft.name.trim();
  const goal = draft.goal.trim();
  const guiding = draft.mode === 'guided' && !path;

  const attrs: { label: string; value: string | undefined }[] = [
    { label: 'Etapa', value: draft.stage && labels.stage(draft.stage) },
    { label: 'Experiencia', value: draft.experience && labels.experience(draft.experience) },
    { label: 'Presupuesto', value: draft.budget && labels.budget(draft.budget) },
    { label: 'Tiempo semanal', value: draft.weeklyHours && labels.weeklyHours(draft.weeklyHours) },
    ...(path?.questions ?? []).map((q) => ({
      label: q.label.replace(/^¿|\?$/g, ''),
      value: q.options.find((o) => o.value === draft.pathAnswers[q.key])?.label,
    })),
  ];

  return (
    <article className="pv" aria-label="Vista previa de tu proyecto">
      <header className="pv__head">
        <div className="pv__eyebrow">
          <span className="pv__dot" aria-hidden="true" />
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={path?.id ?? (guiding ? 'guiding' : 'none')}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: EASE }}
            >
              {path ? path.name : guiding ? 'Buscando tu camino' : 'Camino por elegir'}
            </motion.span>
          </AnimatePresence>
        </div>
        <h2 className="pv__title" data-empty={!name}>
          {name || 'Tu proyecto'}
        </h2>
        <AnimatePresence initial={false}>
          {goal && (
            <motion.p
              className="pv__goal"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              {goal}
            </motion.p>
          )}
        </AnimatePresence>
      </header>

      <dl className="pv__attrs">
        {attrs.map((a) => (
          <motion.div key={a.label} className="pv-attr" layout="position" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <dt>{a.label}</dt>
            <dd>
              <Value>{a.value}</Value>
            </dd>
          </motion.div>
        ))}
      </dl>

      {guiding && <Affinity draft={draft} />}

      {!path && !guiding && (
        <div className="pv__ghost" aria-hidden="true">
          {[72, 54, 64, 46].map((w, i) => (
            <div key={i} className="pv__ghost-row">
              <span>{String(i + 1).padStart(2, '0')}</span>
              <i style={{ width: `${w}%` }} />
            </div>
          ))}
          <p>Elige un camino y aquí aparecerá tu plan.</p>
        </div>
      )}

      {path && model && (
        <motion.div key={path.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
          <div className="pv__stats">
            <div>
              <span className="pv__figure">
                <AnimatedNumber value={model.total} />
              </span>
              <span className="pv__figure-label">tareas</span>
            </div>
            <div>
              <span className="pv__figure">
                <AnimatedNumber value={model.hours} />
                <small> h</small>
              </span>
              <span className="pv__figure-label">de trabajo</span>
            </div>
            <div>
              <span className="pv__figure" data-empty={model.weeks === null}>
                {model.weeks === null ? '—' : <AnimatedNumber value={model.weeks} />}
                {model.weeks !== null && <small> sem.</small>}
              </span>
              <span className="pv__figure-label">a tu ritmo</span>
            </div>
          </div>

          {model.first && (
            <div className="pv__first">
              <span className="pv__first-label">Empiezas por</span>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={model.first.key}
                  className="pv__first-row"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: EASE }}
                >
                  <strong>{model.first.title}</strong>
                  <span>{formatMinutes(model.first.minutes)}</span>
                </motion.div>
              </AnimatePresence>
            </div>
          )}

          <div className="pv__section-head">
            <span>Roadmap</span>
            <span className="pv__badge" data-final={!model.provisional}>
              {model.provisional ? 'Provisional · se ajusta al responder' : 'Ajustado a tus respuestas'}
            </span>
          </div>

          <ol className="pv__phases">
            {model.phases.map((phase, i) => (
              <motion.li
                key={phase.key}
                className="pv-phase"
                layout="position"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE, delay: 0.12 + i * 0.09 }}
              >
                <div className="pv-phase__head">
                  <span className="pv-phase__num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="pv-phase__title">{phase.title}</span>
                  <span className="pv-phase__count">
                    <AnimatedNumber value={phase.tasks.length} />
                  </span>
                </div>
                <ul className="pv-phase__tasks">
                  <AnimatePresence initial={false}>
                    {phase.tasks.map((task) => (
                      <motion.li
                        key={task.key}
                        className="pv-task"
                        data-done={task.done}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.35, ease: EASE }}
                      >
                        <span className="pv-task__mark" aria-hidden="true" />
                        <span className="pv-task__title">{task.title}</span>
                        {task.done && <span className="pv-task__tag">Ya hecha</span>}
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              </motion.li>
            ))}
          </ol>

        </motion.div>
      )}
    </article>
  );
}

/** Orientación: afinidad en directo con cada camino disponible. */
function Affinity({ draft }: { draft: Draft }) {
  const scores = scorePaths({
    ...draft.guidance,
    experience: draft.experience,
    budget: draft.budget,
    weeklyHours: draft.weeklyHours,
  });
  const max = Math.max(1, ...scores.map((s) => s.score));
  const answered = Object.values(draft.guidance).some(Boolean);
  const byId = new Map(scores.map((s) => [s.pathId, s.score]));
  const ordered = answered ? scores.map((s) => s.pathId) : AVAILABLE_PATHS.map((p) => p.id);

  return (
    <div className="pv__affinity">
      <div className="pv__section-head">
        <span>Afinidad con cada camino</span>
      </div>
      <ul>
        {ordered.map((id, i) => {
          const p = getAvailablePath(id)!;
          const score = Math.max(0, byId.get(id) ?? 0);
          return (
            <motion.li key={id} layout transition={{ duration: 0.5, ease: EASE }} data-top={answered && i === 0}>
              <div className="pv-aff__row">
                <span>{p.name}</span>
                <span className="pv-aff__tag">{answered && i === 0 ? 'Mejor encaje' : p.tagline}</span>
              </div>
              <div className="pv-aff__track">
                <motion.div
                  className="pv-aff__bar"
                  animate={{ width: `${answered ? Math.max(4, (score / max) * 100) : 4}%` }}
                  transition={{ duration: 0.6, ease: EASE }}
                />
              </div>
            </motion.li>
          );
        })}
      </ul>
      <p className="pv__hint">Se recalcula con cada respuesta.</p>
    </div>
  );
}
