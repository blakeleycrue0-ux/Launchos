import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { TextAreaField, TextField } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { OptionGroup } from '@/components/ui/OptionGroup';
import { Alert } from '@/components/ui/States';
import { GUIDANCE_QUESTIONS, scorePaths, type GuidanceAnswers } from '@/content/guidance';
import { BUDGET_OPTIONS, EXPERIENCE_OPTIONS, STAGE_OPTIONS, WEEKLY_HOURS_OPTIONS } from '@/content/options';
import { AVAILABLE_PATHS, PLANNED_PATHS, getAvailablePath } from '@/content/paths';
import { estimateWeeks } from '@/domain/progress';
import { generateRoadmap, indexTemplates } from '@/domain/roadmap';
import type { AvailablePath, Budget, Experience, PathAnswers, Stage, WeeklyHours } from '@/domain/types';
import { toUserMessage } from '@/lib/errors';
import { formatMinutes } from '@/lib/format';
import { useCreateProject, useProjects } from '@/features/projects/api';

type Step = 'path' | 'guidance' | 'situation' | 'path-questions' | 'details';

interface Draft {
  pathId?: string;
  experience?: Experience;
  budget?: Budget;
  weeklyHours?: WeeklyHours;
  stage?: Stage;
  pathAnswers: PathAnswers;
  name: string;
  goal: string;
  guidance: Partial<GuidanceAnswers>;
}

const DRAFT_KEY = 'launchos:onboarding-draft';
const emptyDraft: Draft = { pathAnswers: {}, name: '', goal: '', guidance: {} };

function loadDraft(): Draft {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? { ...emptyDraft, ...(JSON.parse(raw) as Partial<Draft>) } : emptyDraft;
  } catch {
    return emptyDraft;
  }
}

const STEP_ORDER: Step[] = ['path', 'situation', 'path-questions', 'details'];
const STEP_LABEL: Record<Step, string> = {
  path: 'Camino',
  guidance: 'Orientación',
  situation: 'Tu situación',
  'path-questions': 'Detalles del camino',
  details: 'Tu proyecto',
};

export function OnboardingPage() {
  const navigate = useNavigate();
  const projects = useProjects();
  const createProject = useCreateProject();
  const [step, setStep] = useState<Step>('path');
  const [draft, setDraft] = useState<Draft>(loadDraft);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const isFirstProject = projects.data?.length === 0;
  const path = draft.pathId ? getAvailablePath(draft.pathId) : undefined;

  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* almacenamiento no disponible: el borrador simplemente no se conserva */
    }
  }, [draft]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const update = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  function go(next: Step) {
    setStep(next);
    window.scrollTo({ top: 0 });
  }

  const stepIndex = STEP_ORDER.indexOf(step === 'guidance' ? 'path' : step);

  return (
    <div className="page page--narrow">
      <div className="onboarding__progress" aria-hidden="true">
        {STEP_ORDER.map((s, i) => (
          <span key={s} className="onboarding__dot" data-active={i <= stepIndex} />
        ))}
      </div>
      <p className="page-header__eyebrow">
        Paso {stepIndex + 1} de {STEP_ORDER.length} · {STEP_LABEL[step]}
      </p>

      {step === 'path' && (
        <PathStep
          headingRef={headingRef}
          welcome={isFirstProject}
          selected={draft.pathId}
          onSelect={(id) => {
            update({ pathId: id, pathAnswers: id === draft.pathId ? draft.pathAnswers : {} });
            go('situation');
          }}
          onGuidance={() => go('guidance')}
        />
      )}

      {step === 'guidance' && (
        <GuidanceStep
          headingRef={headingRef}
          answers={draft.guidance}
          onChange={(guidance) => update({ guidance })}
          onBack={() => go('path')}
          onChoose={(pathId, g) => {
            update({
              pathId,
              pathAnswers: pathId === draft.pathId ? draft.pathAnswers : {},
              experience: g.experience,
              budget: g.budget,
              weeklyHours: g.weeklyHours,
            });
            go('situation');
          }}
        />
      )}

      {step === 'situation' && path && (
        <SituationStep
          headingRef={headingRef}
          draft={draft}
          onChange={update}
          onBack={() => go('path')}
          onNext={() => go(path.questions.length > 0 ? 'path-questions' : 'details')}
        />
      )}

      {step === 'path-questions' && path && (
        <PathQuestionsStep
          headingRef={headingRef}
          path={path}
          answers={draft.pathAnswers}
          onChange={(pathAnswers) => update({ pathAnswers })}
          onBack={() => go('situation')}
          onNext={() => go('details')}
        />
      )}

      {step === 'details' && path && (
        <DetailsStep
          headingRef={headingRef}
          path={path}
          draft={draft}
          onChange={update}
          onBack={() => go(path.questions.length > 0 ? 'path-questions' : 'situation')}
          submitting={createProject.isPending}
          error={createProject.error ? toUserMessage(createProject.error) : null}
          onSubmit={async () => {
            const { experience, budget, weeklyHours, stage } = draft;
            if (!experience || !budget || !weeklyHours || !stage) return;
            const id = await createProject.mutateAsync({
              path,
              name: draft.name.trim(),
              goal: draft.goal.trim(),
              answers: { experience, budget, weeklyHours, stage },
              pathAnswers: draft.pathAnswers,
            });
            try {
              sessionStorage.removeItem(DRAFT_KEY);
            } catch {
              /* sin almacenamiento */
            }
            navigate(`/app/projects/${id}`, { replace: true });
          }}
        />
      )}

      {/* Si se recarga con un camino que ya no existe, volvemos al inicio. */}
      {step !== 'path' && step !== 'guidance' && !path && (
        <Alert tone="error">
          El camino seleccionado no está disponible.{' '}
          <button className="link" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }} onClick={() => go('path')}>
            Elegir otro
          </button>
        </Alert>
      )}
    </div>
  );
}

type HeadingRef = React.RefObject<HTMLHeadingElement | null>;

function StepHeading({ headingRef, title, description }: { headingRef: HeadingRef; title: string; description?: string }) {
  return (
    <header style={{ marginBottom: 'var(--space-8)' }}>
      <h1 ref={headingRef} tabIndex={-1} className="page-header__title" style={{ outline: 'none' }}>
        {title}
      </h1>
      {description && <p className="page-header__desc">{description}</p>}
    </header>
  );
}

function StepActions({ onBack, children }: { onBack?: () => void; children: React.ReactNode }) {
  return (
    <div className="onboarding__actions">
      {onBack ? (
        <Button variant="ghost" onClick={onBack}>
          <Icon name="arrowLeft" /> Atrás
        </Button>
      ) : (
        <span />
      )}
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------

function PathStep({
  headingRef,
  welcome,
  selected,
  onSelect,
  onGuidance,
}: {
  headingRef: HeadingRef;
  welcome: boolean;
  selected?: string;
  onSelect: (id: string) => void;
  onGuidance: () => void;
}) {
  return (
    <>
      <StepHeading
        headingRef={headingRef}
        title={welcome ? '¿Qué quieres construir?' : 'Nuevo proyecto'}
        description={
          welcome
            ? 'Elige un camino y LaunchOS creará un roadmap con tareas concretas adaptado a tu situación.'
            : 'Elige el camino de tu nuevo proyecto.'
        }
      />
      <div className="path-grid">
        {AVAILABLE_PATHS.map((p) => (
          <button key={p.id} type="button" className="path-card" data-selected={selected === p.id} onClick={() => onSelect(p.id)}>
            <span className="path-card__name">{p.name}</span>
            <span className="path-card__tagline">{p.tagline}</span>
            <ul className="path-card__list">
              {p.idealFor.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <span className="path-card__cta">
              Elegir <Icon name="arrowRight" size={14} />
            </span>
          </button>
        ))}
        <button type="button" className="path-card path-card--outline" onClick={onGuidance}>
          <span className="path-card__name">No lo tengo claro</span>
          <span className="path-card__tagline">Responde 6 preguntas y te recomendaremos el camino que mejor encaja contigo.</span>
          <span className="path-card__cta">
            Ayúdame a elegir <Icon name="arrowRight" size={14} />
          </span>
        </button>
      </div>

      <section className="planned" aria-labelledby="planned-title">
        <h2 id="planned-title" className="planned__title">
          En preparación
        </h2>
        <p className="planned__desc">Estos caminos todavía no tienen roadmap. Los iremos activando por fases.</p>
        <ul className="planned__list">
          {PLANNED_PATHS.map((p) => (
            <li key={p.id}>{p.name}</li>
          ))}
        </ul>
      </section>
    </>
  );
}

// ---------------------------------------------------------------------------

const GUIDANCE_PROFILE_QUESTIONS = [
  { key: 'experience', label: '¿Cuánta experiencia tienes?', options: EXPERIENCE_OPTIONS },
  { key: 'budget', label: '¿Con qué presupuesto cuentas?', options: BUDGET_OPTIONS },
  { key: 'weeklyHours', label: '¿Cuánto tiempo puedes dedicar a la semana?', options: WEEKLY_HOURS_OPTIONS },
] as const;

function GuidanceStep({
  headingRef,
  answers,
  onChange,
  onBack,
  onChoose,
}: {
  headingRef: HeadingRef;
  answers: Partial<GuidanceAnswers>;
  onChange: (a: Partial<GuidanceAnswers>) => void;
  onBack: () => void;
  onChoose: (pathId: string, answers: GuidanceAnswers) => void;
}) {
  const allKeys = [...GUIDANCE_QUESTIONS.map((q) => q.key), ...GUIDANCE_PROFILE_QUESTIONS.map((q) => q.key)];
  const complete = allKeys.every((k) => answers[k] !== undefined);
  const scores = complete ? scorePaths(answers as GuidanceAnswers) : null;
  const top = scores?.[0];
  const topPath = top ? getAvailablePath(top.pathId) : undefined;

  return (
    <>
      <StepHeading headingRef={headingRef} title="Encontremos tu camino" description="No hay respuestas correctas. Contesta pensando en tu situación actual." />
      <div className="stack-lg">
        {GUIDANCE_QUESTIONS.map((q) => (
          <OptionGroup
            key={q.key}
            legend={q.label}
            name={q.key}
            options={q.options}
            value={answers[q.key]}
            onChange={(v) => onChange({ ...answers, [q.key]: v })}
          />
        ))}
        {GUIDANCE_PROFILE_QUESTIONS.map((q) => (
          <OptionGroup
            key={q.key}
            legend={q.label}
            name={`g-${q.key}`}
            options={q.options}
            value={answers[q.key]}
            onChange={(v) => onChange({ ...answers, [q.key]: v })}
          />
        ))}
      </div>

      {scores && topPath && top && (
        <section className="card recommendation" aria-live="polite">
          <div className="card__body">
            <p className="page-header__eyebrow">Recomendación</p>
            <h2 className="recommendation__title">{topPath.name}</h2>
            <p className="page-header__desc">{topPath.description}</p>
            {top.reasons.length > 0 && (
              <ul className="recommendation__reasons">
                {top.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            )}
            <div className="recommendation__actions">
              <Button variant="primary" onClick={() => onChoose(topPath.id, answers as GuidanceAnswers)}>
                Empezar con {topPath.name}
              </Button>
              {scores.slice(1).map((s) => {
                const alt = getAvailablePath(s.pathId);
                return alt ? (
                  <Button key={s.pathId} variant="secondary" onClick={() => onChoose(alt.id, answers as GuidanceAnswers)}>
                    Prefiero {alt.name}
                  </Button>
                ) : null;
              })}
            </div>
          </div>
        </section>
      )}

      <StepActions onBack={onBack}>
        {!complete && <span className="field__hint">Responde todas las preguntas para ver tu recomendación.</span>}
      </StepActions>
    </>
  );
}

// ---------------------------------------------------------------------------

function SituationStep({
  headingRef,
  draft,
  onChange,
  onBack,
  onNext,
}: {
  headingRef: HeadingRef;
  draft: Draft;
  onChange: (p: Partial<Draft>) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const complete = draft.experience && draft.budget && draft.weeklyHours && draft.stage;
  return (
    <>
      <StepHeading headingRef={headingRef} title="Cuéntanos tu situación" description="Usaremos estas respuestas para adaptar las tareas, las herramientas y el ritmo del roadmap." />
      <div className="stack-lg">
        <OptionGroup legend="¿En qué punto estás?" name="stage" options={STAGE_OPTIONS} value={draft.stage} onChange={(stage) => onChange({ stage })} />
        <OptionGroup legend="¿Cuánta experiencia tienes?" name="experience" options={EXPERIENCE_OPTIONS} value={draft.experience} onChange={(experience) => onChange({ experience })} />
        <OptionGroup legend="¿Con qué presupuesto cuentas?" name="budget" options={BUDGET_OPTIONS} value={draft.budget} onChange={(budget) => onChange({ budget })} />
        <OptionGroup
          legend="¿Cuánto tiempo puedes dedicar a la semana?"
          name="weeklyHours"
          options={WEEKLY_HOURS_OPTIONS}
          value={draft.weeklyHours}
          onChange={(weeklyHours) => onChange({ weeklyHours })}
        />
      </div>
      <StepActions onBack={onBack}>
        <Button variant="primary" disabled={!complete} onClick={onNext}>
          Continuar <Icon name="arrowRight" />
        </Button>
      </StepActions>
    </>
  );
}

// ---------------------------------------------------------------------------

function PathQuestionsStep({
  headingRef,
  path,
  answers,
  onChange,
  onBack,
  onNext,
}: {
  headingRef: HeadingRef;
  path: AvailablePath;
  answers: PathAnswers;
  onChange: (a: PathAnswers) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const complete = path.questions.every((q) => answers[q.key]);
  return (
    <>
      <StepHeading headingRef={headingRef} title={path.name} description="Unas preguntas específicas de este camino." />
      <div className="stack-lg">
        {path.questions.map((q) => (
          <OptionGroup key={q.key} legend={q.label} name={q.key} options={q.options} value={answers[q.key]} onChange={(v) => onChange({ ...answers, [q.key]: v })} />
        ))}
      </div>
      <StepActions onBack={onBack}>
        <Button variant="primary" disabled={!complete} onClick={onNext}>
          Continuar <Icon name="arrowRight" />
        </Button>
      </StepActions>
    </>
  );
}

// ---------------------------------------------------------------------------

function DetailsStep({
  headingRef,
  path,
  draft,
  onChange,
  onBack,
  onSubmit,
  submitting,
  error,
}: {
  headingRef: HeadingRef;
  path: AvailablePath;
  draft: Draft;
  onChange: (p: Partial<Draft>) => void;
  onBack: () => void;
  onSubmit: () => Promise<void>;
  submitting: boolean;
  error: string | null;
}) {
  const [nameError, setNameError] = useState<string | null>(null);
  const { experience, budget, weeklyHours, stage } = draft;
  const ready = experience && budget && weeklyHours && stage;

  const preview = useMemo(() => {
    if (!ready) return null;
    const tasks = generateRoadmap(path, { experience, budget, weeklyHours, stage, pathAnswers: draft.pathAnswers });
    const index = indexTemplates(path);
    const pending = tasks.filter((t) => t.status !== 'done');
    const minutes = pending.reduce((acc, t) => acc + (index.get(t.templateKey)?.template.estimatedMinutes ?? 0), 0);
    const phases = path.phases.filter((ph) => tasks.some((t) => t.phaseKey === ph.key));
    return {
      total: tasks.length,
      autoDone: tasks.length - pending.length,
      minutes,
      weeks: estimateWeeks(minutes, weeklyHours),
      phases,
      first: pending[0] ? index.get(pending[0].templateKey)?.template : undefined,
    };
  }, [ready, path, experience, budget, weeklyHours, stage, draft.pathAnswers]);

  async function handle(e: FormEvent) {
    e.preventDefault();
    const name = draft.name.trim();
    if (!name) return setNameError('Ponle un nombre a tu proyecto');
    if (name.length > 80) return setNameError('Máximo 80 caracteres');
    setNameError(null);
    try {
      await onSubmit();
    } catch {
      /* el error se muestra desde el estado de la mutación */
    }
  }

  return (
    <form onSubmit={handle} noValidate>
      <StepHeading headingRef={headingRef} title="Ponle nombre a tu proyecto" description="Podrás cambiarlo más adelante." />
      <div className="stack-md">
        <TextField
          label="Nombre del proyecto"
          placeholder={path.id === 'faceless' ? 'Ej.: Canal de historia en 10 minutos' : path.id === 'vinted-reselling' ? 'Ej.: Reventa de moda vintage' : 'Ej.: Gestor de reservas para fisioterapeutas'}
          value={draft.name}
          maxLength={80}
          error={nameError}
          onChange={(e) => onChange({ name: e.target.value })}
        />
        <TextAreaField
          label="Objetivo (opcional)"
          placeholder="¿Qué quieres conseguir en los próximos 3 meses?"
          value={draft.goal}
          maxLength={500}
          rows={3}
          onChange={(e) => onChange({ goal: e.target.value })}
          hint="Lo usaremos para personalizar los prompts de las tareas."
        />
      </div>

      {preview && (
        <section className="card" style={{ marginTop: 'var(--space-8)' }} aria-label="Resumen del roadmap">
          <div className="card__header">
            <h2 className="card__title">Tu roadmap</h2>
            <span className="badge">{path.name}</span>
          </div>
          <div className="card__body stack-md">
            <dl className="stats">
              <div>
                <dt>Tareas</dt>
                <dd>{preview.total}</dd>
              </div>
              <div>
                <dt>Trabajo estimado</dt>
                <dd>{formatMinutes(preview.minutes)}</dd>
              </div>
              <div>
                <dt>A tu ritmo</dt>
                <dd>≈ {preview.weeks} {preview.weeks === 1 ? 'semana' : 'semanas'}</dd>
              </div>
            </dl>
            <ol className="phase-preview">
              {preview.phases.map((ph) => (
                <li key={ph.key}>
                  <strong>{ph.title}</strong>
                  <span>{ph.description}</span>
                </li>
              ))}
            </ol>
            {preview.autoDone > 0 && (
              <p className="field__hint">
                Hemos marcado {preview.autoDone} {preview.autoDone === 1 ? 'tarea' : 'tareas'} como completadas porque ya has superado esa etapa. Podrás reabrirlas.
              </p>
            )}
            {preview.first && (
              <p className="field__hint">
                Primera tarea: <strong style={{ color: 'var(--color-text)' }}>{preview.first.title}</strong>
              </p>
            )}
          </div>
        </section>
      )}

      {error && (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      <StepActions onBack={onBack}>
        <Button type="submit" variant="primary" size="lg" loading={submitting}>
          Crear proyecto
        </Button>
      </StepActions>
    </form>
  );
}
