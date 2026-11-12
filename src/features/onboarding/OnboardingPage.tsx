import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, LayoutGroup, MotionConfig, motion, useMotionValue, useSpring, useTransform, type MotionValue, type Variants } from 'motion/react';
import { curtain } from '@/components/ui/Curtain';
import { Icon } from '@/components/ui/Icon';
import { Logo } from '@/components/ui/Logo';
import { GUIDANCE_QUESTIONS, scorePaths } from '@/content/guidance';
import { BUDGET_OPTIONS, EXPERIENCE_OPTIONS, STAGE_OPTIONS, WEEKLY_HOURS_OPTIONS, labels } from '@/content/options';
import { AVAILABLE_PATHS, PLANNED_PATHS, getAvailablePath } from '@/content/paths';
import { useAuth } from '@/features/auth/AuthProvider';
import { useCreateProject, useProjects } from '@/features/projects/api';
import { toUserMessage } from '@/lib/errors';
import { EASE, EASE_IN, SPRING, SPRING_SOFT, prefersReducedMotion, sleep } from './motion';
import { ProjectPreview, usePreviewModel, type SavePhase } from './ProjectPreview';
import { EMPTY_DRAFT, buildSteps, firstIncomplete, isStepComplete, type Draft, type StepId } from './steps';
import './onboarding.css';

const STORAGE_KEY = 'launchos:onboarding-v2';
const GUIDE = '__guide';

interface Stored {
  draft: Draft;
  step: StepId;
}

function load(): Stored {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Stored>;
      if (parsed.draft) return { draft: { ...EMPTY_DRAFT, ...parsed.draft }, step: parsed.step ?? 'path' };
    }
  } catch {
    /* almacenamiento no disponible */
  }
  return { draft: EMPTY_DRAFT, step: 'path' };
}

interface ChoiceOption {
  value: string;
  label: string;
  description?: string;
  meta?: string;
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const projects = useProjects();
  const createProject = useCreateProject();

  const initial = useMemo(load, []);
  const [draft, setDraft] = useState<Draft>(initial.draft);
  const [stepId, setStepId] = useState<StepId>(initial.step);
  const [direction, setDirection] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [phase, setPhase] = useState<SavePhase>('idle');

  const path = draft.pathId ? getAvailablePath(draft.pathId) : undefined;
  const steps = useMemo(() => buildSteps(draft, path), [draft, path]);
  const model = usePreviewModel(draft, path);

  // Si el paso guardado ya no existe en el flujo actual, se vuelve al inicio.
  const index = Math.max(0, steps.indexOf(stepId));
  const current = steps[index] ?? 'path';

  const stepsRef = useRef(steps);
  const currentRef = useRef(current);
  const draftRef = useRef(draft);
  /** true cuando se llega a un paso desde «Cambiar» en la revisión: al responder se vuelve a ella. */
  const returnToReview = useRef(false);
  stepsRef.current = steps;
  currentRef.current = current;
  draftRef.current = draft;
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ draft, step: current } satisfies Stored));
    } catch {
      /* sin almacenamiento: el borrador no se conserva al recargar */
    }
  }, [draft, current]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const goTo = useCallback((target: StepId, dir?: number) => {
    window.clearTimeout(timer.current);
    const list = stepsRef.current;
    setDirection(dir ?? (list.indexOf(target) >= list.indexOf(currentRef.current) ? 1 : -1));
    setStepId(target);
    window.scrollTo({ top: 0 });
  }, []);

  const goNext = useCallback(() => {
    const list = stepsRef.current;
    if (returnToReview.current && firstIncomplete(list, draftRef.current) === null) {
      returnToReview.current = false;
      return goTo('review', 1);
    }
    const next = list[list.indexOf(currentRef.current) + 1];
    if (next) goTo(next, 1);
  }, [goTo]);

  const goBack = useCallback(() => {
    const list = stepsRef.current;
    const prev = list[list.indexOf(currentRef.current) - 1];
    if (prev) goTo(prev, -1);
  }, [goTo]);

  /** Guarda una respuesta y, si viene de un clic, avanza tras una breve pausa. */
  const pick = useCallback(
    (patch: (d: Draft) => Draft, advance: boolean) => {
      setDraft(patch);
      if (advance) {
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(goNext, 280);
      }
    },
    [goNext],
  );

  async function submit() {
    if (phase !== 'idle') return;
    const missing = firstIncomplete(steps, draft);
    if (missing) return goTo(missing);
    const { experience, budget, weeklyHours, stage } = draft;
    if (!path || !model || !experience || !budget || !weeklyHours || !stage) return;
    const name = draft.name.trim();
    setPhase('saving');
    let id: string;
    try {
      id = await createProject.mutateAsync({
        path,
        name,
        goal: draft.goal.trim(),
        answers: { experience, budget, weeklyHours, stage },
        pathAnswers: draft.pathAnswers,
      });
    } catch {
      // Sin confirmación no hay celebración: se vuelve al estado normal y el
      // error (estado de la mutación) se muestra junto al botón para reintentar.
      setPhase('idle');
      return;
    }
    // A partir de aquí Supabase ha confirmado que el proyecto existe.
    setPhase('done');
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* sin almacenamiento */
    }
    const calm = prefersReducedMotion();
    const desktop = window.matchMedia('(min-width: 901px)').matches;
    await sleep(calm ? 300 : desktop ? 1150 : 650); // la vista previa termina de construirse
    curtain.show({
      eyebrow: 'Proyecto creado',
      title: name,
      meta: `${model.total} tareas en ${model.phases.length} fases${model.first ? ` · empiezas por «${model.first.title}»` : ''}`,
      from: desktop ? 'right' : 'bottom',
    });
    await sleep(calm ? 1200 : 2100);
    navigate(`/app/projects/${id}`, { replace: true });
    await sleep(650); // el dashboard se monta bajo la cortina antes de levantarla
    curtain.hide();
  }

  const complete = isStepComplete(current, draft);
  const isReview = current === 'review';

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (phase !== 'idle') return;
    if (isReview) void submit();
    else if (complete) goNext();
  }

  // ---------------------------------------------------------------- pasos
  const pathChange = (id: string) => (d: Draft): Draft => ({ ...d, pathId: id, pathAnswers: id === d.pathId ? d.pathAnswers : {} });

  let view: { eyebrow: string; question: string; help?: string; body: ReactNode };

  switch (current) {
    case 'path': {
      const options: ChoiceOption[] = [
        ...AVAILABLE_PATHS.map((p) => ({
          value: p.id,
          label: p.name,
          description: p.tagline,
          meta: `${p.phases.length} fases · hasta ${p.phases.reduce((n, ph) => n + ph.tasks.length, 0)} tareas`,
        })),
        { value: GUIDE, label: 'No lo tengo claro', description: 'Responde tres preguntas más y te recomendamos uno.' },
      ];
      view = {
        eyebrow: projects.data?.length === 0 ? 'Bienvenido a LaunchOS' : 'Nuevo proyecto',
        question: '¿Qué quieres construir?',
        help: 'Elige un camino. Tu plan se va montando mientras respondes.',
        body: (
          <>
            <ChoiceList
              labelledBy="onb-question"
              name="path"
              options={options}
              value={draft.mode === 'guided' ? GUIDE : draft.pathId}
              onSelect={(v, adv) =>
                pick(
                  (d) =>
                    v === GUIDE
                      ? d.mode === 'guided'
                        ? d
                        : { ...d, mode: 'guided', pathId: undefined, pathAnswers: {} }
                      : { ...pathChange(v)(d), mode: 'direct' },
                  adv,
                )
              }
            />
            <motion.details className="onb-planned" variants={ITEM}>
              <summary>{PLANNED_PATHS.length} caminos más en preparación</summary>
              <p>{PLANNED_PATHS.map((p) => p.name).join(' · ')}</p>
            </motion.details>
          </>
        ),
      };
      break;
    }
    case 'g-motivation':
    case 'g-strength':
    case 'g-exposure': {
      const key = current.slice(2) as 'motivation' | 'strength' | 'exposure';
      const q = GUIDANCE_QUESTIONS.find((g) => g.key === key)!;
      view = {
        eyebrow: 'Orientación',
        question: q.label,
        help: 'No hay respuestas correctas. Piensa en tu situación de hoy.',
        body: (
          <ChoiceList
            labelledBy="onb-question"
            name={key}
            options={q.options}
            value={draft.guidance[key]}
            onSelect={(v, adv) => pick((d) => ({ ...d, guidance: { ...d.guidance, [key]: v } }), adv)}
          />
        ),
      };
      break;
    }
    case 'g-result': {
      const scores = scorePaths({ ...draft.guidance, experience: draft.experience, budget: draft.budget, weeklyHours: draft.weeklyHours });
      const top = scores[0]!;
      const topPath = getAvailablePath(top.pathId)!;
      view = {
        eyebrow: 'Nuestra recomendación',
        question: `Te encaja ${topPath.name}.`,
        help: topPath.description,
        body: (
          <>
            {top.reasons.length > 0 && (
              <ul className="onb-reasons">
                {top.reasons.map((r) => (
                  <motion.li key={r} variants={ITEM}>
                    {r}
                  </motion.li>
                ))}
              </ul>
            )}
            <ChoiceList
              labelledBy="onb-question"
              name="recommended"
              options={scores.map((s, i) => {
                const p = getAvailablePath(s.pathId)!;
                return { value: p.id, label: p.name, description: p.tagline, meta: i === 0 ? 'Recomendado' : undefined };
              })}
              value={draft.pathId}
              onSelect={(v, adv) => pick(pathChange(v), adv)}
            />
          </>
        ),
      };
      break;
    }
    case 'stage':
      view = {
        eyebrow: 'Tu situación',
        question: '¿En qué punto estás?',
        help: 'Así sabremos qué tareas puedes saltarte.',
        body: <ChoiceList labelledBy="onb-question" name="stage" options={STAGE_OPTIONS} value={draft.stage} onSelect={(v, adv) => pick((d) => ({ ...d, stage: v as Draft['stage'] }), adv)} />,
      };
      break;
    case 'experience':
      view = {
        eyebrow: 'Tu situación',
        question: '¿Cuánta experiencia tienes?',
        help: 'Si empiezas de cero, añadimos las bases.',
        body: (
          <ChoiceList labelledBy="onb-question" name="experience" options={EXPERIENCE_OPTIONS} value={draft.experience} onSelect={(v, adv) => pick((d) => ({ ...d, experience: v as Draft['experience'] }), adv)} />
        ),
      };
      break;
    case 'budget':
      view = {
        eyebrow: 'Tu situación',
        question: '¿Con qué presupuesto cuentas?',
        help: 'Te recomendaremos herramientas que encajen.',
        body: <ChoiceList labelledBy="onb-question" name="budget" options={BUDGET_OPTIONS} value={draft.budget} onSelect={(v, adv) => pick((d) => ({ ...d, budget: v as Draft['budget'] }), adv)} />,
      };
      break;
    case 'weeklyHours':
      view = {
        eyebrow: 'Tu situación',
        question: '¿Cuántas horas a la semana?',
        help: 'Con esto calculamos cuánto durará tu plan.',
        body: (
          <ChoiceList
            labelledBy="onb-question"
            name="weeklyHours"
            options={WEEKLY_HOURS_OPTIONS}
            value={draft.weeklyHours}
            onSelect={(v, adv) => pick((d) => ({ ...d, weeklyHours: v as Draft['weeklyHours'] }), adv)}
          />
        ),
      };
      break;
    case 'name':
      view = {
        eyebrow: 'Tu proyecto',
        question: '¿Cómo se llama tu proyecto?',
        help: 'Podrás cambiarlo cuando quieras.',
        body: (
          <motion.div className="onb-field" variants={ITEM}>
            <input
              className="onb-input"
              aria-labelledby="onb-question"
              autoFocus
              autoComplete="off"
              maxLength={80}
              placeholder={path?.id === 'faceless' ? 'Historia en 10 minutos' : path?.id === 'vinted-reselling' ? 'Moda vintage' : 'Reservas para fisios'}
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            />
            <span className="onb-field__count">{draft.name.length}/80</span>
          </motion.div>
        ),
      };
      break;
    case 'goal':
      view = {
        eyebrow: 'Tu proyecto',
        question: '¿Qué quieres conseguir en tres meses?',
        help: 'Opcional. Lo usamos para personalizar los prompts de tus tareas.',
        body: (
          <motion.div className="onb-field" variants={ITEM}>
            <textarea
              className="onb-input onb-input--area"
              aria-labelledby="onb-question"
              autoFocus
              rows={3}
              maxLength={500}
              placeholder="Publicar doce vídeos y llegar a mil seguidores"
              value={draft.goal}
              onChange={(e) => setDraft((d) => ({ ...d, goal: e.target.value }))}
            />
            <span className="onb-field__count">{draft.goal.length}/500</span>
          </motion.div>
        ),
      };
      break;
    case 'review': {
      const rows: { label: string; value: string | undefined; step: StepId }[] = [
        { label: 'Camino', value: path?.name, step: draft.mode === 'guided' ? 'g-result' : 'path' },
        { label: 'Nombre', value: draft.name.trim() || undefined, step: 'name' },
        { label: 'Objetivo', value: draft.goal.trim() || 'Sin objetivo', step: 'goal' },
        { label: 'Etapa', value: draft.stage && labels.stage(draft.stage), step: 'stage' },
        { label: 'Experiencia', value: draft.experience && labels.experience(draft.experience), step: 'experience' },
        { label: 'Presupuesto', value: draft.budget && labels.budget(draft.budget), step: 'budget' },
        { label: 'Tiempo semanal', value: draft.weeklyHours && labels.weeklyHours(draft.weeklyHours), step: 'weeklyHours' },
        ...(path?.questions ?? []).map((q) => ({
          label: q.label.replace(/^¿|\?$/g, ''),
          value: q.options.find((o) => o.value === draft.pathAnswers[q.key])?.label,
          step: `q:${q.key}` as StepId,
        })),
      ];
      view = {
        eyebrow: 'Último paso',
        question: 'Tu plan está listo.',
        help: model
          ? `${model.total} tareas en ${model.phases.length} fases${model.done > 0 ? `, ${model.done} ya marcadas como hechas por tu etapa` : ''}. Revisa tus respuestas y crea el proyecto.`
          : undefined,
        body: (
          <>
            <dl className="onb-review">
              {rows.map((r, i) => (
                <motion.div key={r.label} variants={ITEM} custom={i}>
                  <dt>{r.label}</dt>
                  <dd data-missing={!r.value}>{r.value ?? 'Pendiente'}</dd>
                  <button
                    type="button"
                    disabled={phase !== 'idle'}
                    onClick={() => {
                      returnToReview.current = true;
                      goTo(r.step);
                    }}
                    aria-label={`Cambiar ${r.label.toLowerCase()}`}
                  >
                    Cambiar
                  </button>
                </motion.div>
              ))}
            </dl>
            <AnimatePresence>
              {createProject.error && phase === 'idle' && (
                <motion.p className="onb-error" role="alert" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: EASE }}>
                  {toUserMessage(createProject.error)} Tus respuestas siguen guardadas: puedes volver a intentarlo.
                </motion.p>
              )}
            </AnimatePresence>
          </>
        ),
      };
      break;
    }
    default: {
      const q = path?.questions.find((x) => `q:${x.key}` === current);
      view = q
        ? {
            eyebrow: path!.name,
            question: q.label,
            help: q.help,
            body: (
              <ChoiceList
                labelledBy="onb-question"
                name={q.key}
                options={q.options}
                value={draft.pathAnswers[q.key]}
                onSelect={(v, adv) => pick((d) => ({ ...d, pathAnswers: { ...d.pathAnswers, [q.key]: v } }), adv)}
              />
            ),
          }
        : { eyebrow: '', question: 'Elige primero un camino.', body: null };
    }
  }

  const hasProjects = (projects.data?.length ?? 0) > 0;
  const busy = phase !== 'idle';
  const nextLabel = phase === 'saving' ? 'Creando proyecto' : phase === 'done' ? 'Proyecto creado' : isReview ? 'Crear proyecto' : current === 'goal' && !draft.goal.trim() ? 'Saltar' : 'Continuar';
  const peek = path && model ? `${model.phases.length} fases · ${model.total} tareas` : draft.mode === 'guided' ? 'Buscando tu camino' : 'Elige un camino';
  const ratio = (index + 1) / steps.length;
  const activeKey = current === 'name' || current === 'goal' || current.startsWith('q:') || ['stage', 'experience', 'budget', 'weeklyHours'].includes(current) ? current : undefined;

  return (
    <MotionConfig reducedMotion="user">
      <div className="onb" data-phase={phase}>
        <form className="onb__left" onSubmit={onSubmit} noValidate>
          <header className="onb__bar">
            <Logo to={hasProjects ? '/app' : '/app/new'} size={22} />
            <div className="onb__bar-right">
              <span className="onb__count" aria-label={`Paso ${index + 1} de ${steps.length}`}>
                <span className="onb__count-roll">
                  <AnimatePresence mode="popLayout" custom={direction} initial={false}>
                    <motion.b
                      key={index}
                      custom={direction}
                      variants={{ enter: (d: number) => ({ y: `${d * 100}%`, opacity: 0 }), center: { y: 0, opacity: 1 }, exit: (d: number) => ({ y: `${d * -100}%`, opacity: 0 }) }}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.4, ease: EASE }}
                    >
                      {String(index + 1).padStart(2, '0')}
                    </motion.b>
                  </AnimatePresence>
                </span>{' '}
                / {String(steps.length).padStart(2, '0')}
              </span>
              {hasProjects ? (
                <Link to="/app" className="onb__exit">
                  Salir
                </Link>
              ) : (
                <button type="button" className="onb__exit" onClick={() => void signOut()}>
                  Cerrar sesión
                </button>
              )}
            </div>
          </header>
          <div className="onb__progress" role="progressbar" aria-label="Progreso del cuestionario" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={index + 1}>
            {/* scaleX con muelle: avanza de forma continua y solo anima transform. */}
            <motion.div className="onb__progress-bar" initial={false} animate={{ scaleX: ratio }} transition={SPRING_SOFT} />
          </div>

          <main className="onb__main" id="main" inert={busy}>
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              <motion.div key={current} className="onb__step" custom={direction} variants={STEP} initial="enter" animate="center" exit="exit">
                <StepHeading eyebrow={view.eyebrow} question={view.question} help={view.help} focus={current !== 'name' && current !== 'goal'} />
                {view.body}
              </motion.div>
            </AnimatePresence>
          </main>

          <footer className="onb__foot">
            <motion.button type="button" className="onb-peek" onClick={() => setSheetOpen(true)} aria-haspopup="dialog" whileTap={{ scale: 0.98 }} transition={SPRING}>
              <span className="onb-peek__dot" aria-hidden="true" />
              <span className="onb-peek__label">Vista previa</span>
              <span className="onb-peek__meta">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span key={peek} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} transition={{ duration: 0.3, ease: EASE }}>
                    {peek}
                  </motion.span>
                </AnimatePresence>
              </span>
              <Icon name="arrowRight" size={14} />
            </motion.button>
            <div className="onb__actions">
              <AnimatePresence initial={false}>
                {index > 0 && !busy && (
                  <motion.button type="button" className="onb-back" onClick={goBack} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} whileTap={{ scale: 0.96 }} transition={{ duration: 0.25, ease: EASE }}>
                    <Icon name="arrowLeft" /> Atrás
                  </motion.button>
                )}
              </AnimatePresence>
              <motion.button
                type="submit"
                className="onb-next"
                data-phase={phase}
                disabled={(!isReview && !complete) || busy}
                aria-busy={phase === 'saving' || undefined}
                layout
                whileTap={busy ? undefined : { scale: 0.97 }}
                transition={SPRING}
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span key={nextLabel} className="onb-next__inner" initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }} transition={{ duration: 0.28, ease: EASE }}>
                    {phase === 'saving' && <span className="onb-next__spinner" aria-hidden="true" />}
                    {phase === 'done' && (
                      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                        <motion.path d="M4 9.4l3.2 3.2L14 5.8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.35, ease: EASE, delay: 0.1 }} />
                      </svg>
                    )}
                    {nextLabel}
                    {phase === 'idle' && <Icon name="arrowRight" />}
                  </motion.span>
                </AnimatePresence>
              </motion.button>
            </div>
          </footer>
        </form>

        <aside className="onb__right" aria-label="Vista previa en directo">
          <Stage progress={ratio} />
          <div className="onb__right-scroll">
            <p className="onb__right-label">Vista previa en directo</p>
            <ProjectPreview draft={draft} path={path} model={model} activeKey={activeKey} phase={phase} />
          </div>
        </aside>

        <AnimatePresence>
          {sheetOpen && (
            <PreviewSheet onClose={() => setSheetOpen(false)}>
              <ProjectPreview draft={draft} path={path} model={model} activeKey={activeKey} phase={phase} />
            </PreviewSheet>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}

// ---------------------------------------------------------------- movimiento

/** Paso completo: sale rápido hacia un lado y el siguiente entra en cascada. */
const STEP: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 44 }),
  center: { opacity: 1, x: 0, transition: { duration: 0.5, ease: EASE, staggerChildren: 0.045, delayChildren: 0.04 } },
  exit: (dir: number) => ({ opacity: 0, x: dir * -44, transition: { duration: 0.2, ease: EASE_IN } }),
};
/** Elementos del paso (ayuda, opciones, campos): suben y aparecen. */
const ITEM: Variants = {
  enter: { opacity: 0, y: 18 },
  center: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};
/** Palabras del titular: emergen desde una máscara. */
const WORD: Variants = {
  enter: { y: '108%' },
  center: { y: 0, transition: { duration: 0.7, ease: EASE } },
};

// ---------------------------------------------------------------------------

function StepHeading({ eyebrow, question, help, focus }: { eyebrow: string; question: string; help?: string; focus: boolean }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focus) ref.current?.focus({ preventScroll: true });
  }, [focus]);
  return (
    <header className="onb__heading">
      {eyebrow && (
        <motion.p className="onb__eyebrow" variants={ITEM}>
          {eyebrow}
        </motion.p>
      )}
      <h1 id="onb-question" ref={ref} tabIndex={-1} className="onb__question" aria-label={question}>
        {question.split(' ').map((word, i) => (
          <span key={i} aria-hidden="true">
            {i > 0 && ' '}
            <span className="onb__word">
              <motion.span variants={WORD}>{word}</motion.span>
            </span>
          </span>
        ))}
      </h1>
      {help && (
        <motion.p className="onb__help" variants={ITEM}>
          {help}
        </motion.p>
      )}
    </header>
  );
}

/**
 * Lista de opciones como grupo de radio nativo.
 * - Clic o tecla numérica: selecciona y avanza.
 * - Flechas o espacio: solo selecciona (Enter continúa).
 * El relleno azul es un único elemento compartido que se desliza de una opción a otra.
 */
function ChoiceList<T extends string>({
  labelledBy,
  name,
  options,
  value,
  onSelect,
}: {
  labelledBy: string;
  name: string;
  options: readonly (ChoiceOption & { value: T })[];
  value: T | undefined;
  onSelect: (value: T, advance: boolean) => void;
}) {
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  // Tras elegir con clic o número, el resto se atenúa mientras se avanza.
  const [committed, setCommitted] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'TEXTAREA' || tag === 'SELECT') return;
      const n = Number(e.key);
      const opt = Number.isInteger(n) && n >= 1 ? options[n - 1] : undefined;
      if (opt) {
        e.preventDefault();
        setCommitted(true);
        onSelectRef.current(opt.value, true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [options]);

  return (
    <LayoutGroup id={`choices-${name}`}>
      <div className="onb-choices" role="radiogroup" aria-labelledby={labelledBy} data-committed={committed}>
        {options.map((opt, i) => {
          const selected = value === opt.value;
          return (
            <motion.label
              key={opt.value}
              className="onb-choice"
              data-selected={selected}
              variants={ITEM}
              whileTap={{ scale: 0.985 }}
              onClick={(e) => {
                // El clic real llega sobre la etiqueta; el del teclado, sobre el input.
                if ((e.target as HTMLElement).tagName !== 'INPUT') {
                  setCommitted(true);
                  onSelect(opt.value, true);
                }
              }}
            >
              {selected && <motion.span layoutId="fill" className="onb-choice__fill" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={SPRING} aria-hidden="true" />}
              <input type="radio" name={`onb-${name}`} value={opt.value} checked={selected} onChange={() => onSelect(opt.value, false)} />
              <span className="onb-choice__key" aria-hidden="true">
                {i + 1}
              </span>
              <span className="onb-choice__text">
                <span className="onb-choice__label">{opt.label}</span>
                {opt.description && <span className="onb-choice__desc">{opt.description}</span>}
              </span>
              {opt.meta && <span className="onb-choice__meta">{opt.meta}</span>}
              <span className="onb-choice__check" aria-hidden="true">
                {selected && (
                  <svg width="14" height="14" viewBox="0 0 14 14">
                    <motion.path d="M3 7.3l2.6 2.6L11 4.4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.28, ease: EASE, delay: 0.06 }} />
                  </svg>
                )}
              </span>
            </motion.label>
          );
        })}
      </div>
    </LayoutGroup>
  );
}

/**
 * Fondo de la columna oscura: tres planos inclinados (eco del símbolo) en capas.
 * - Deriva ambiental muy lenta (CSS, solo transform).
 * - Se desplazan a distinta velocidad al avanzar pasos y, con ratón, al mover el puntero.
 */
function Stage({ progress }: { progress: number }) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 36, damping: 18 });
  const sy = useSpring(my, { stiffness: 36, damping: 18 });
  const p = useSpring(progress, { stiffness: 50, damping: 20 });
  useEffect(() => p.set(progress), [p, progress]);

  useEffect(() => {
    if (prefersReducedMotion() || !window.matchMedia('(pointer: fine)').matches) return;
    const onMove = (e: PointerEvent) => {
      mx.set(e.clientX / window.innerWidth - 0.5);
      my.set(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [mx, my]);

  return (
    <div className="onb-stage" aria-hidden="true">
      <Plane n={1} sx={sx} sy={sy} p={p} depth={14} travel={[-26, 34]} />
      <Plane n={2} sx={sx} sy={sy} p={p} depth={-22} travel={[30, -44]} />
      <Plane n={3} sx={sx} sy={sy} p={p} depth={38} travel={[-48, -70]} />
    </div>
  );
}

function Plane({ n, sx, sy, p, depth, travel }: { n: number; sx: MotionValue<number>; sy: MotionValue<number>; p: MotionValue<number>; depth: number; travel: [number, number] }) {
  const x = useTransform([sx, p] as MotionValue<number>[], ([m, k]: number[]) => (m ?? 0) * depth + (k ?? 0) * travel[0]);
  const y = useTransform([sy, p] as MotionValue<number>[], ([m, k]: number[]) => (m ?? 0) * depth + (k ?? 0) * travel[1]);
  return (
    <motion.div className={`onb-plane onb-plane--${n}`} style={{ x, y }}>
      <i />
    </motion.div>
  );
}

/** Hoja inferior (móvil) con la vista previa. No altera el progreso. */
function PreviewSheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div className="onb-sheet" role="dialog" aria-modal="true" aria-label="Vista previa de tu proyecto">
      <motion.div className="onb-sheet__backdrop" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} />
      <motion.div
        className="onb-sheet__panel"
        initial={{ y: '100%' }}
        animate={{ y: 0, transition: { type: 'spring', stiffness: 330, damping: 36, mass: 0.9 } }}
        exit={{ y: '100%', transition: { duration: 0.32, ease: EASE_IN } }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={(_e, info) => {
          if (info.offset.y > 110 || info.velocity.y > 600) onClose();
        }}
      >
        <div className="onb-sheet__grip" aria-hidden="true" />
        <div className="onb-sheet__head">
          <span>Vista previa en directo</span>
          <button ref={closeRef} type="button" onClick={onClose}>
            Cerrar
          </button>
        </div>
        <div className="onb-sheet__body">{children}</div>
      </motion.div>
    </div>
  );
}
