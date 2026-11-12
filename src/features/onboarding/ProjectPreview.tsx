import { useEffect, useId, useMemo, useRef } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { scorePaths } from '@/content/guidance';
import { labels } from '@/content/options';
import { AVAILABLE_PATHS, getAvailablePath } from '@/content/paths';
import { estimateWeeks } from '@/domain/progress';
import { generateRoadmap, indexTemplates } from '@/domain/roadmap';
import type { AvailablePath } from '@/domain/types';
import { formatMinutes } from '@/lib/format';
import { AnimatedNumber } from './AnimatedNumber';
import { EASE, SPRING, SPRING_SOFT } from './motion';
import type { Draft } from './steps';

/** Estado del guardado: la vista previa solo celebra cuando Supabase ha confirmado. */
export type SavePhase = 'idle' | 'saving' | 'done';

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

interface Props {
  draft: Draft;
  path: AvailablePath | undefined;
  model: PreviewModel;
  /** Dato que el usuario está respondiendo ahora mismo (para señalarlo en la vista previa). */
  activeKey?: string;
  phase?: SavePhase;
}

export function ProjectPreview({ draft, path, model, activeKey, phase = 'idle' }: Props) {
  const groupId = useId();
  const name = draft.name.trim();
  const goal = draft.goal.trim();
  const guiding = draft.mode === 'guided' && !path;

  const attrs: { id: string; label: string; value: string | undefined }[] = [
    { id: 'stage', label: 'Etapa', value: draft.stage && labels.stage(draft.stage) },
    { id: 'experience', label: 'Experiencia', value: draft.experience && labels.experience(draft.experience) },
    { id: 'budget', label: 'Presupuesto', value: draft.budget && labels.budget(draft.budget) },
    { id: 'weeklyHours', label: 'Tiempo semanal', value: draft.weeklyHours && labels.weeklyHours(draft.weeklyHours) },
    ...(path?.questions ?? []).map((q) => ({
      id: `q:${q.key}`,
      label: q.label.replace(/^¿|\?$/g, ''),
      value: q.options.find((o) => o.value === draft.pathAnswers[q.key])?.label,
    })),
  ];

  // Cuánto del plan está definido: camino + nombre + datos que alimentan el roadmap.
  const answered = (path ? 1 : 0) + (name ? 1 : 0) + attrs.filter((a) => a.value).length;
  const total = 2 + 4 + (path?.questions.length ?? 2);
  const completeness = Math.round((answered / total) * 100);

  return (
    <LayoutGroup id={groupId}>
      <article className="pv" data-phase={phase} aria-label="Vista previa de tu proyecto">
        {/* Destello del contorno con cada decisión: la vista previa «acusa recibo». */}
        <motion.span key={`${path?.id}-${answered}`} className="pv__pulse" aria-hidden="true" initial={{ opacity: answered ? 1 : 0 }} animate={{ opacity: 0 }} transition={{ duration: 1.2, ease: 'easeOut' }} />

        <header className="pv__head">
          <div className="pv__topline">
            <div className="pv__eyebrow">
              <span className="pv__dot" aria-hidden="true" />
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={path?.id ?? (guiding ? 'guiding' : 'none')}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.28, ease: EASE }}
                >
                  {path ? path.name : guiding ? 'Buscando tu camino' : 'Camino por elegir'}
                </motion.span>
              </AnimatePresence>
            </div>
            <BuildStatus completeness={completeness} phase={phase} />
          </div>
          <Title name={name} typing={activeKey === 'name' && phase === 'idle'} />
          <AnimatePresence initial={false}>
            {goal && (
              <motion.p
                className="pv__goal"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.4, ease: EASE }}
              >
                {goal}
              </motion.p>
            )}
          </AnimatePresence>
        </header>

        <dl className="pv__attrs">
          {attrs.map((a) => {
            const active = activeKey === a.id && phase === 'idle';
            return (
              <motion.div key={a.id} className="pv-attr" data-active={active} layout="position" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }}>
                {active && <motion.i layoutId="pv-cursor" className="pv-attr__cursor" transition={SPRING} aria-hidden="true" />}
                <dt>{a.label}</dt>
                <dd>
                  {a.value ? (
                    // key = valor: cada cambio vuelve a montar el nodo y dispara la entrada.
                    <motion.span
                      key={a.value}
                      className="pv-attr__value"
                      initial={{ opacity: 0, y: 10, color: '#a3adf0' }}
                      animate={{ opacity: 1, y: 0, color: '#ffffff' }}
                      transition={{ ...SPRING, color: { duration: 1.4, ease: 'easeOut' } }}
                    >
                      {a.value}
                    </motion.span>
                  ) : (
                    <span className="pv-attr__value pv-attr__value--empty">{active ? 'Eligiendo' : 'Pendiente'}</span>
                  )}
                </dd>
              </motion.div>
            );
          })}
        </dl>

        {guiding && <Affinity draft={draft} />}

        {!path && !guiding && (
          <div className="pv__ghost" aria-hidden="true">
            {[72, 54, 64, 46].map((w, i) => (
              <div key={i} className="pv__ghost-row">
                <span>{String(i + 1).padStart(2, '0')}</span>
                <i style={{ width: `${w}%`, animationDelay: `${i * 0.18}s` }} />
              </div>
            ))}
            <p>Elige un camino y aquí aparecerá tu plan.</p>
          </div>
        )}

        {path && model && <Roadmap key={path.id} model={model} phase={phase} />}
      </article>
    </LayoutGroup>
  );
}

// ---------------------------------------------------------------------------

/** Anillo de construcción: muestra cuánto del plan está definido y el estado del guardado. */
function BuildStatus({ completeness, phase }: { completeness: number; phase: SavePhase }) {
  const label = phase === 'saving' ? 'Guardando proyecto' : phase === 'done' ? 'Proyecto creado' : completeness >= 100 ? 'Plan completo' : null;
  return (
    <div className="pv-build" data-phase={phase} data-full={completeness >= 100}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={label ?? 'pct'} className="pv-build__label" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22, ease: EASE }}>
          {label ?? (
            <>
              Plan al <AnimatedNumber value={completeness} /> %
            </>
          )}
        </motion.span>
      </AnimatePresence>
      <svg className="pv-build__ring" width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
        <circle cx="11" cy="11" r="8.5" fill="none" stroke="rgb(255 255 255 / 0.14)" strokeWidth="2" />
        <motion.circle
          cx="11"
          cy="11"
          r="8.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          transform="rotate(-90 11 11)"
          initial={false}
          animate={{ pathLength: phase === 'saving' ? 0.28 : phase === 'done' ? 1 : Math.max(0.02, completeness / 100) }}
          transition={SPRING_SOFT}
        />
        {phase === 'done' && (
          <motion.path d="M7 11.3l2.7 2.7L15 8.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.35, ease: EASE, delay: 0.25 }} />
        )}
      </svg>
    </div>
  );
}

/** Nombre del proyecto: mientras se escribe, cada letra entra y un cursor marca la posición. */
function Title({ name, typing }: { name: string; typing: boolean }) {
  if (!name) {
    return (
      <h2 className="pv__title" data-empty="true">
        {typing && <span className="pv__caret" aria-hidden="true" />}
        Tu proyecto
      </h2>
    );
  }
  let i = 0;
  return (
    <h2 className="pv__title" aria-label={name}>
      <span aria-hidden="true">
        {name.split(/(\s+)/).map((word, wi) =>
          /^\s+$/.test(word) ? (
            ' '
          ) : (
            <span key={wi} className="pv__word">
              {[...word].map((ch) => {
                const k = i++;
                return (
                  <motion.span key={k} className="pv__char" initial={typing ? { opacity: 0, y: '0.3em' } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.26, ease: EASE }}>
                    {ch}
                  </motion.span>
                );
              })}
            </span>
          ),
        )}
        {typing && <span className="pv__caret" aria-hidden="true" />}
      </span>
    </h2>
  );
}

function Roadmap({ model, phase }: { model: NonNullable<PreviewModel>; phase: SavePhase }) {
  // La primera vez las fases y tareas entran en cascada; después, al instante.
  const booted = useRef(false);
  useEffect(() => {
    const t = window.setTimeout(() => (booted.current = true), 1400);
    return () => window.clearTimeout(t);
  }, []);
  let taskIndex = 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <div className="pv__stats">
        {[
          { label: 'tareas', node: <AnimatedNumber value={model.total} />, unit: null, empty: false },
          { label: 'de trabajo', node: <AnimatedNumber value={model.hours} />, unit: ' h', empty: false },
          { label: 'a tu ritmo', node: model.weeks === null ? '—' : <AnimatedNumber value={model.weeks} />, unit: model.weeks === null ? null : ' sem.', empty: model.weeks === null },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE, delay: 0.08 + i * 0.07 }}>
            <span className="pv__figure" data-empty={s.empty}>
              {s.node}
              {s.unit && <small>{s.unit}</small>}
            </span>
            <span className="pv__figure-label">{s.label}</span>
          </motion.div>
        ))}
      </div>

      {model.first && (
        <motion.div className="pv__first" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE, delay: 0.28 }}>
          <span className="pv__first-label">Empiezas por</span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={model.first.key}
              className="pv__first-row"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.26, ease: EASE }}
            >
              <strong>{model.first.title}</strong>
              <span>{formatMinutes(model.first.minutes)}</span>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}

      <div className="pv__section-head">
        <span>Roadmap</span>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={String(model.provisional)} className="pv__badge" data-final={!model.provisional} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }}>
            {model.provisional ? 'Provisional · se ajusta al responder' : 'Ajustado a tus respuestas'}
          </motion.span>
        </AnimatePresence>
      </div>

      <ol className="pv__phases">
        {/* Raíl que se dibuja de arriba abajo y une las fases. */}
        <motion.i className="pv__rail" aria-hidden="true" initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 1.1, ease: EASE, delay: 0.35 }} />
        {model.phases.map((ph, i) => (
          <motion.li
            key={ph.key}
            className="pv-phase"
            layout="position"
            style={{ ['--i' as string]: i }}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: EASE, delay: 0.38 + i * 0.13, layout: SPRING }}
          >
            <div className="pv-phase__head">
              <span className="pv-phase__num">
                <AnimatePresence mode="wait" initial={false}>
                  {phase === 'done' ? (
                    <motion.svg key="ok" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ ...SPRING, delay: 0.1 + i * 0.13 }}>
                      <circle cx="7" cy="7" r="7" fill="var(--blue-500)" />
                      <motion.path d="M4 7.2l2 2 4-4.2" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3, ease: EASE, delay: 0.2 + i * 0.13 }} />
                    </motion.svg>
                  ) : (
                    <motion.span key="n" exit={{ opacity: 0, scale: 0.6 }} transition={{ duration: 0.15, delay: i * 0.13 }}>
                      {String(i + 1).padStart(2, '0')}
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
              <span className="pv-phase__title">{ph.title}</span>
              <span className="pv-phase__count">
                <AnimatedNumber value={ph.tasks.length} />
              </span>
            </div>
            <ul className="pv-phase__tasks">
              <AnimatePresence initial>
                {ph.tasks.map((task) => {
                  const delay = booted.current ? 0 : 0.55 + i * 0.13 + taskIndex * 0.035;
                  taskIndex++;
                  return (
                    <motion.li
                      key={task.key}
                      className="pv-task"
                      data-done={task.done}
                      initial={{ opacity: 0, height: 0, x: -12 }}
                      animate={{ opacity: 1, height: 'auto', x: 0, transition: { duration: 0.45, ease: EASE, delay } }}
                      exit={{ opacity: 0, height: 0, x: 12, transition: { duration: 0.32, ease: EASE } }}
                    >
                      <span className="pv-task__mark" aria-hidden="true" />
                      <span className="pv-task__title">{task.title}</span>
                      <AnimatePresence initial={false}>
                        {task.done && (
                          <motion.span className="pv-task__tag" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: EASE }}>
                            Ya hecha
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          </motion.li>
        ))}
      </ol>
    </motion.div>
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
    <motion.div className="pv__affinity" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}>
      <div className="pv__section-head">
        <span>Afinidad con cada camino</span>
      </div>
      <ul>
        {ordered.map((id, i) => {
          const p = getAvailablePath(id)!;
          const score = Math.max(0, byId.get(id) ?? 0);
          const top = answered && i === 0;
          return (
            <motion.li key={id} layout transition={SPRING} data-top={top}>
              <div className="pv-aff__row">
                <span>{p.name}</span>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span key={top ? 'top' : 'tag'} className="pv-aff__tag" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                    {top ? 'Mejor encaje' : p.tagline}
                  </motion.span>
                </AnimatePresence>
              </div>
              <div className="pv-aff__track">
                {/* scaleX en lugar de width: solo transform, sin recalcular el layout. */}
                <motion.div className="pv-aff__bar" initial={false} animate={{ scaleX: answered ? Math.max(0.04, score / max) : 0.04 }} transition={SPRING_SOFT} />
              </div>
            </motion.li>
          );
        })}
      </ul>
      <p className="pv__hint">Se recalcula con cada respuesta.</p>
    </motion.div>
  );
}
