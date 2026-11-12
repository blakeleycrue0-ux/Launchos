import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { Icon } from '@/components/ui/Icon';
import { Logo } from '@/components/ui/Logo';
import { Spinner } from '@/components/ui/Spinner';
import { GUIDANCE_QUESTIONS, scorePaths } from '@/content/guidance';
import { BUDGET_OPTIONS, EXPERIENCE_OPTIONS, STAGE_OPTIONS, WEEKLY_HOURS_OPTIONS, labels } from '@/content/options';
import { AVAILABLE_PATHS, PLANNED_PATHS, getAvailablePath } from '@/content/paths';
import { useAuth } from '@/features/auth/AuthProvider';
import { useCreateProject, useProjects } from '@/features/projects/api';
import { toUserMessage } from '@/lib/errors';
import { ProjectPreview, usePreviewModel } from './ProjectPreview';
import { EMPTY_DRAFT, buildSteps, firstIncomplete, isStepComplete, type Draft, type StepId } from './steps';
import './onboarding.css';

const STORAGE_KEY = 'launchos:onboarding-v2';
const EASE = [0.22, 1, 0.36, 1] as const;
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
    const missing = firstIncomplete(steps, draft);
    if (missing) return goTo(missing);
    const { experience, budget, weeklyHours, stage } = draft;
    if (!path || !experience || !budget || !weeklyHours || !stage) return;
    try {
      const id = await createProject.mutateAsync({
        path,
        name: draft.name.trim(),
        goal: draft.goal.trim(),
        answers: { experience, budget, weeklyHours, stage },
        pathAnswers: draft.pathAnswers,
      });
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        /* sin almacenamiento */
      }
      navigate(`/app/projects/${id}`, { replace: true });
    } catch {
      /* el error se muestra desde el estado de la mutación */
    }
  }

  const complete = isStepComplete(current, draft);
  const isReview = current === 'review';

  function onSubmit(e: FormEvent) {
    e.preventDefault();
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
            <details className="onb-planned">
              <summary>{PLANNED_PATHS.length} caminos más en preparación</summary>
              <p>{PLANNED_PATHS.map((p) => p.name).join(' · ')}</p>
            </details>
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
                  <li key={r}>{r}</li>
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
          <div className="onb-field">
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
          </div>
        ),
      };
      break;
    case 'goal':
      view = {
        eyebrow: 'Tu proyecto',
        question: '¿Qué quieres conseguir en tres meses?',
        help: 'Opcional. Lo usamos para personalizar los prompts de tus tareas.',
        body: (
          <div className="onb-field">
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
          </div>
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
                <motion.div key={r.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE, delay: 0.06 + i * 0.035 }}>
                  <dt>{r.label}</dt>
                  <dd data-missing={!r.value}>{r.value ?? 'Pendiente'}</dd>
                  <button
                    type="button"
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
            {createProject.error && (
              <p className="onb-error" role="alert">
                {toUserMessage(createProject.error)}
              </p>
            )}
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
  const continueLabel = isReview ? 'Crear proyecto' : current === 'goal' && !draft.goal.trim() ? 'Saltar' : 'Continuar';
  const peek = path && model ? `${model.phases.length} fases · ${model.total} tareas` : draft.mode === 'guided' ? 'Buscando tu camino' : 'Elige un camino';

  return (
    <MotionConfig reducedMotion="user">
      <div className="onb">
        <form className="onb__left" onSubmit={onSubmit} noValidate>
          <header className="onb__bar">
            <Logo to={hasProjects ? '/app' : '/app/new'} size={22} />
            <div className="onb__bar-right">
              <span className="onb__count" aria-label={`Paso ${index + 1} de ${steps.length}`}>
                <b>{String(index + 1).padStart(2, '0')}</b> / {String(steps.length).padStart(2, '0')}
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
            <motion.div className="onb__progress-bar" animate={{ width: `${((index + 1) / steps.length) * 100}%` }} transition={{ duration: 0.6, ease: EASE }} />
          </div>

          <main className="onb__main" id="main">
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              <motion.div
                key={current}
                className="onb__step"
                custom={direction}
                variants={{
                  enter: (dir: number) => ({ opacity: 0, x: dir * 28 }),
                  center: { opacity: 1, x: 0 },
                  exit: (dir: number) => ({ opacity: 0, x: dir * -28 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.32, ease: EASE }}
              >
                <StepHeading eyebrow={view.eyebrow} question={view.question} help={view.help} focus={current !== 'name' && current !== 'goal'} />
                {view.body}
              </motion.div>
            </AnimatePresence>
          </main>

          <footer className="onb__foot">
            <button type="button" className="onb-peek" onClick={() => setSheetOpen(true)} aria-haspopup="dialog">
              <span className="onb-peek__dot" aria-hidden="true" />
              <span className="onb-peek__label">Vista previa</span>
              <span className="onb-peek__meta">{peek}</span>
              <Icon name="arrowRight" size={14} />
            </button>
            <div className="onb__actions">
              {index > 0 ? (
                <button type="button" className="onb-back" onClick={goBack}>
                  <Icon name="arrowLeft" /> Atrás
                </button>
              ) : (
                <span />
              )}
              <button type="submit" className="onb-next" disabled={(!isReview && !complete) || createProject.isPending} aria-busy={createProject.isPending || undefined}>
                {createProject.isPending && <Spinner />}
                {continueLabel}
                {!createProject.isPending && <Icon name="arrowRight" />}
              </button>
            </div>
          </footer>
        </form>

        <aside className="onb__right" aria-label="Vista previa en directo">
          <div className="onb-stage" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <div className="onb__right-scroll">
            <p className="onb__right-label">Vista previa en directo</p>
            <ProjectPreview draft={draft} path={path} model={model} />
          </div>
        </aside>

        <AnimatePresence>
          {sheetOpen && (
            <PreviewSheet onClose={() => setSheetOpen(false)}>
              <ProjectPreview draft={draft} path={path} model={model} />
            </PreviewSheet>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}

// ---------------------------------------------------------------------------

function StepHeading({ eyebrow, question, help, focus }: { eyebrow: string; question: string; help?: string; focus: boolean }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focus) ref.current?.focus({ preventScroll: true });
  }, [focus]);
  return (
    <header className="onb__heading">
      {eyebrow && <p className="onb__eyebrow">{eyebrow}</p>}
      <h1 id="onb-question" ref={ref} tabIndex={-1} className="onb__question">
        {question}
      </h1>
      {help && <p className="onb__help">{help}</p>}
    </header>
  );
}

/**
 * Lista de opciones como grupo de radio nativo.
 * - Clic o tecla numérica: selecciona y avanza.
 * - Flechas o espacio: solo selecciona (Enter continúa).
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'TEXTAREA' || tag === 'SELECT') return;
      const n = Number(e.key);
      const opt = Number.isInteger(n) && n >= 1 ? options[n - 1] : undefined;
      if (opt) {
        e.preventDefault();
        onSelectRef.current(opt.value, true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [options]);

  return (
    <div className="onb-choices" role="radiogroup" aria-labelledby={labelledBy}>
      {options.map((opt, i) => {
        const selected = value === opt.value;
        return (
          <motion.label
            key={opt.value}
            className="onb-choice"
            data-selected={selected}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, ease: EASE, delay: 0.06 + i * 0.05 }}
            whileTap={{ scale: 0.99 }}
            onClick={(e) => {
              // El clic real llega sobre la etiqueta; el del teclado, sobre el input.
              if ((e.target as HTMLElement).tagName !== 'INPUT') onSelect(opt.value, true);
            }}
          >
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
              <Icon name="check" size={13} />
            </span>
          </motion.label>
        );
      })}
    </div>
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
      <motion.div className="onb-sheet__backdrop" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} />
      <motion.div
        className="onb-sheet__panel"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.45, ease: EASE }}
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
