import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, LayoutGroup, MotionConfig, motion, useInView, useScroll, useTransform } from 'motion/react';
import { AreaChart } from '@/components/charts/AreaChart';
import { CountUp } from '@/components/ui/CountUp';
import { Icon } from '@/components/ui/Icon';
import { Logo, LogoMark } from '@/components/ui/Logo';
import { STAGE_OPTIONS, WEEKLY_HOURS_OPTIONS } from '@/content/options';
import { AVAILABLE_PATHS, PLANNED_PATHS } from '@/content/paths';
import type { AvailablePath, Stage, WeeklyHours } from '@/domain/types';
import { useAuth } from '@/features/auth/AuthProvider';
import { ProjectPreview, usePreviewModel } from '@/features/onboarding/ProjectPreview';
import type { Draft } from '@/features/onboarding/steps';
import { formatMinutes } from '@/lib/format';
import '@/features/onboarding/onboarding.css';
import './landing.css';

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Opiniones de usuarios. Debe contener únicamente reseñas reales y verificables.
 * Mientras esté vacío, la sección lo dice con claridad en lugar de rellenar.
 */
const REVIEWS: { quote: string; name: string; context: string }[] = [];

// Datos reales del contenido (no de usuarios).
const PATH_STATS = AVAILABLE_PATHS.map((p) => {
  const tasks = p.phases.flatMap((ph) => ph.tasks);
  return { path: p, tasks: tasks.length, hours: Math.round(tasks.reduce((n, t) => n + t.estimatedMinutes, 0) / 60) };
});
const TOOLS = [...new Map(AVAILABLE_PATHS.flatMap((p) => p.phases.flatMap((ph) => ph.tasks.flatMap((t) => t.tools ?? []))).map((t) => [t.name, t])).values()];

/** Tarea real de cada camino que se enseña «por dentro». */
const SAMPLE_TASK: Record<string, string> = { faceless: 'faceless-niche', 'vinted-reselling': 'vinted-first-listings', 'apps-saas': 'saas-interviews' };
const DEMO_NAMES: Record<string, string> = { faceless: 'Historia en 10 minutos', 'vinted-reselling': 'Moda vintage', 'apps-saas': 'Reservas para fisios' };

// Serie inventada para enseñar cómo se ve una gráfica. Se etiqueta siempre como demostración.
const DEMO_SERIES = [18, 34, 52, 90, 131, 204, 290, 412].map((value, i) => ({ date: new Date(Date.UTC(2026, 0, 5 + i * 7)).toISOString().slice(0, 10), value }));

export function LandingPage() {
  const { user } = useAuth();
  const cta = user ? { to: '/app', label: 'Abrir LaunchOS' } : { to: '/signup', label: 'Crear mi plan' };

  return (
    <MotionConfig reducedMotion="user">
      <div className="lp">
        <a href="#contenido" className="skip-link">
          Ir al contenido
        </a>
        <Nav cta={cta} signedIn={Boolean(user)} />
        <main id="contenido">
          <Hero cta={cta} />
          <HowItWorks />
          <InsideTask />
          <Paths cta={cta} />
          <Results />
          <Tools />
          <Reviews />
          <Final cta={cta} />
        </main>
        <footer className="lp-foot">
          <Logo to="/" size={20} />
          <p>LaunchOS no sustituye a tus herramientas: te enseña a usarlas y ordena el trabajo.</p>
          <nav aria-label="Pie">
            <Link to="/login">Iniciar sesión</Link>
            <Link to="/signup">Crear cuenta</Link>
          </nav>
        </footer>
      </div>
    </MotionConfig>
  );
}

type Cta = { to: string; label: string };

// ---------------------------------------------------------------- utilidades

function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '0px 0px -12% 0px' }} transition={{ duration: 0.7, ease: EASE, delay }}>
      {children}
    </motion.div>
  );
}

/** Titular que emerge palabra a palabra desde una máscara al entrar en pantalla. */
function Headline({ text, as: Tag = 'h2', className, immediate }: { text: string; as?: 'h1' | 'h2'; className: string; immediate?: boolean }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' });
  const show = immediate || inView;
  return (
    <Tag ref={ref} className={className} aria-label={text}>
      {text.split(' ').map((word, i) => (
        <span key={i} aria-hidden="true">
          {i > 0 && ' '}
          <span className="lp-word">
            <motion.span initial={{ y: '110%' }} animate={show ? { y: 0 } : undefined} transition={{ duration: 0.8, ease: EASE, delay: 0.05 + i * 0.045 }}>
              {word}
            </motion.span>
          </span>
        </span>
      ))}
    </Tag>
  );
}

function Chips<T extends string>({ id, label, options, value, onChange }: { id: string; label: string; options: readonly { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="lp-chips" role="group" aria-label={label}>
      <span className="lp-chips__label">{label}</span>
      <div className="lp-chips__row">
        <LayoutGroup id={id}>
          {options.map((o) => (
            <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
              {value === o.value && <motion.span layoutId="chip" className="lp-chips__pill" transition={{ type: 'spring', stiffness: 460, damping: 36 }} />}
              <span>{o.label}</span>
            </button>
          ))}
        </LayoutGroup>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- secciones

function Nav({ cta, signedIn }: { cta: Cta; signedIn: boolean }) {
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <motion.header className="lp-nav" data-solid={solid} initial={{ y: -24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.7, ease: EASE }}>
      <Logo to="/" size={22} />
      <nav className="lp-nav__links" aria-label="Secciones">
        <a href="#como-funciona">Cómo funciona</a>
        <a href="#por-dentro">Por dentro</a>
        <a href="#caminos">Caminos</a>
        <a href="#resultados">Resultados</a>
      </nav>
      <div className="lp-nav__actions">
        {!signedIn && (
          <Link to="/login" className="lp-nav__login">
            Iniciar sesión
          </Link>
        )}
        <Link to={cta.to} className="lp-btn lp-btn--light lp-btn--sm">
          {cta.label}
        </Link>
      </div>
    </motion.header>
  );
}

function Hero({ cta }: { cta: Cta }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y1 = useTransform(scrollYProgress, [0, 1], [0, 160]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const y3 = useTransform(scrollYProgress, [0, 1], [0, 260]);

  const [pathId, setPathId] = useState(AVAILABLE_PATHS[0]!.id);
  const [stage, setStage] = useState<Stage>('idea');
  const [hours, setHours] = useState<WeeklyHours>('h5_10');
  const path = AVAILABLE_PATHS.find((p) => p.id === pathId)!;
  const draft = useMemo<Draft>(
    () => ({
      mode: 'direct',
      pathId,
      stage,
      weeklyHours: hours,
      experience: 'none',
      budget: 'low',
      pathAnswers: Object.fromEntries(path.questions.map((q) => [q.key, q.options[q.options.length - 1]!.value])),
      name: DEMO_NAMES[pathId] ?? '',
      goal: '',
      guidance: {},
    }),
    [pathId, stage, hours, path],
  );
  const model = usePreviewModel(draft, path);

  return (
    <section className="lp-hero" ref={ref}>
      <div className="lp-hero__planes" aria-hidden="true">
        <motion.i style={{ y: y1 }} />
        <motion.i style={{ y: y2 }} />
        <motion.i style={{ y: y3 }} />
      </div>
      <div className="lp-hero__copy">
        <motion.p className="lp-eyebrow" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}>
          Para quien quiere lanzar su primer proyecto digital
        </motion.p>
        <Headline as="h1" className="lp-hero__title" text="Deja de buscar por dónde empezar." immediate />
        <motion.p className="lp-hero__sub" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE, delay: 0.5 }}>
          Elige qué quieres construir y LaunchOS lo convierte en un plan: fases, tareas concretas, las herramientas que necesitas y un prompt preparado para cada paso.
        </motion.p>
        <motion.div className="lp-hero__cta" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE, delay: 0.62 }}>
          <Link to={cta.to} className="lp-btn lp-btn--light">
            {cta.label} <Icon name="arrowRight" />
          </Link>
          <a href="#como-funciona" className="lp-btn lp-btn--ghost">
            Ver cómo funciona
          </a>
        </motion.div>
      </div>

      <motion.div className="lp-demo" initial={{ opacity: 0, y: 48 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: EASE, delay: 0.7 }}>
        <div className="lp-demo__controls">
          <p className="lp-demo__tag">
            <span aria-hidden="true" /> Demostración interactiva
          </p>
          <h2 className="lp-demo__title">Cambia las respuestas y mira cómo se reorganiza el plan.</h2>
          <Chips id="demo-path" label="Qué quieres construir" options={AVAILABLE_PATHS.map((p) => ({ value: p.id, label: p.name }))} value={pathId} onChange={setPathId} />
          <Chips id="demo-stage" label="En qué punto estás" options={STAGE_OPTIONS} value={stage} onChange={setStage} />
          <Chips id="demo-hours" label="Horas a la semana" options={WEEKLY_HOURS_OPTIONS} value={hours} onChange={setHours} />
          <p className="lp-demo__note">Es el mismo cálculo que usa la aplicación. El nombre del proyecto es un ejemplo.</p>
        </div>
        <div className="lp-demo__preview">
          <ProjectPreview draft={draft} path={path} model={model} />
        </div>
      </motion.div>
    </section>
  );
}

function HowItWorks() {
  const sample = AVAILABLE_PATHS[0]!.phases[0]!.tasks[1]!;
  return (
    <section className="lp-sec lp-sec--light" id="como-funciona">
      <div className="lp-wrap">
        <p className="lp-eyebrow lp-eyebrow--ink">Cómo funciona</p>
        <Headline className="lp-h2" text="Tres pasos. El primero dura dos minutos." />

        <div className="lp-steps">
          <Reveal className="lp-step">
            <div className="lp-step__copy">
              <span className="lp-step__num">01</span>
              <h3>Cuéntanos de dónde partes</h3>
              <p>Qué quieres construir, cuánta experiencia tienes, con qué presupuesto cuentas y cuántas horas puedes dedicarle. Diez preguntas, una por pantalla.</p>
            </div>
            <div className="lp-step__visual lp-visual-choices" aria-hidden="true">
              <span className="lp-mini-eyebrow">Tu situación</span>
              <strong>¿En qué punto estás?</strong>
              {STAGE_OPTIONS.map((o, i) => (
                <motion.div key={o.value} data-on={i === 1} initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, ease: EASE, delay: 0.15 + i * 0.09 }}>
                  <span>{o.label}</span>
                  <i />
                </motion.div>
              ))}
            </div>
          </Reveal>

          <Reveal className="lp-step lp-step--flip">
            <div className="lp-step__copy">
              <span className="lp-step__num">02</span>
              <h3>Sigue un plan que cabe en tu semana</h3>
              <p>Cada tarea dice qué hacer, cuánto se tarda y cómo saber que has terminado. LaunchOS te enseña siempre la siguiente, para que no tengas que decidir por dónde seguir.</p>
            </div>
            <div className="lp-step__visual lp-visual-next" aria-hidden="true">
              <span className="lp-mini-eyebrow">Próxima acción</span>
              <strong>{sample.title}</strong>
              <p>{sample.summary}</p>
              <div className="lp-visual-next__row">
                <span>{formatMinutes(sample.estimatedMinutes)}</span>
                <span>{sample.steps.length} pasos</span>
                {sample.tools && <span>{sample.tools.length} herramientas</span>}
              </div>
              <div className="lp-visual-next__bar">
                <motion.i initial={{ scaleX: 0 }} whileInView={{ scaleX: 0.34 }} viewport={{ once: true }} transition={{ duration: 1.4, ease: EASE, delay: 0.3 }} />
              </div>
            </div>
          </Reveal>

          <Reveal className="lp-step">
            <div className="lp-step__copy">
              <span className="lp-step__num">03</span>
              <h3>Mide lo que consigues</h3>
              <p>Anota tus cifras cuando quieras: seguidores, ventas, usuarios o ingresos, según tu camino. Verás la evolución en una gráfica y sabrás si lo que haces funciona.</p>
            </div>
            <div className="lp-step__visual lp-visual-chart">
              <span className="lp-mini-eyebrow">Seguidores · datos de demostración</span>
              <InViewChart />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function InViewChart() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -15% 0px' });
  return (
    <div ref={ref} style={{ minHeight: 200 }}>
      {inView && <AreaChart points={DEMO_SERIES} height={230} label="Seguidores (datos de demostración)" formatValue={(v) => String(Math.round(v))} formatDate={(d) => new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(new Date(`${d}T00:00:00`))} />}
    </div>
  );
}

function InsideTask() {
  const [pathId, setPathId] = useState(AVAILABLE_PATHS[0]!.id);
  const path = AVAILABLE_PATHS.find((p) => p.id === pathId)!;
  const task = path.phases.flatMap((ph) => ph.tasks).find((t) => t.key === SAMPLE_TASK[path.id]) ?? path.phases[0]!.tasks[0]!;
  const prompt = task.prompts?.[0];
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(t);
  }, [copied]);

  return (
    <section className="lp-sec lp-sec--dark" id="por-dentro">
      <div className="lp-sec__planes" aria-hidden="true">
        <i />
        <i />
      </div>
      <div className="lp-wrap">
        <p className="lp-eyebrow">Por dentro de una tarea</p>
        <Headline className="lp-h2" text="Instrucciones que se pueden seguir, no consejos." />
        <Reveal>
          <p className="lp-lead">Esto es una tarea real de LaunchOS, tal como la verás dentro. Cambia de camino para ver otra.</p>
          <Chips id="task-path" label="Camino" options={AVAILABLE_PATHS.map((p) => ({ value: p.id, label: p.name }))} value={pathId} onChange={setPathId} />
        </Reveal>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={task.key} className="lp-task" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.45, ease: EASE }}>
            <div className="lp-task__main">
              <h3>{task.title}</h3>
              <p className="lp-task__summary">{task.summary}</p>
              <ol>
                {task.steps.map((s, i) => (
                  <motion.li key={s} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, ease: EASE, delay: 0.1 + i * 0.06 }}>
                    {s}
                  </motion.li>
                ))}
              </ol>
              <div className="lp-task__done">
                <span>Sabrás que has terminado cuando</span>
                {task.doneWhen}
              </div>
            </div>
            <div className="lp-task__side">
              {task.tools && (
                <div>
                  <span className="lp-mini-eyebrow">Herramientas</span>
                  <ul className="lp-task__tools">
                    {task.tools.map((t) => (
                      <li key={t.name}>
                        <strong>{t.name}</strong>
                        <span>{t.purpose}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {prompt && (
                <div className="lp-prompt">
                  <div className="lp-prompt__head">
                    <span>{prompt.title}</span>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(prompt.body.replace(/\{\{projectName\}\}/g, '[nombre del proyecto]').replace(/\{\{goal\}\}/g, '[tu objetivo]'));
                          setCopied(true);
                        } catch {
                          /* portapapeles no disponible */
                        }
                      }}
                    >
                      <Icon name={copied ? 'check' : 'copy'} size={14} /> {copied ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                  <pre>{prompt.body.replace(/\{\{projectName\}\}/g, '[nombre del proyecto]').replace(/\{\{goal\}\}/g, '[tu objetivo]')}</pre>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

function Paths({ cta }: { cta: Cta }) {
  return (
    <section className="lp-sec lp-sec--light" id="caminos">
      <div className="lp-wrap">
        <p className="lp-eyebrow lp-eyebrow--ink">Caminos</p>
        <Headline className="lp-h2" text="Tres caminos listos. Los demás, cuando estén bien hechos." />
        <ul className="lp-paths">
          {PATH_STATS.map(({ path, tasks, hours }, i) => (
            <PathRow key={path.id} path={path} tasks={tasks} hours={hours} index={i} cta={cta} />
          ))}
        </ul>
        <Reveal className="lp-planned">
          <span className="lp-mini-eyebrow lp-mini-eyebrow--ink">En preparación</span>
          <p>{PLANNED_PATHS.map((p) => p.name).join(' · ')}</p>
        </Reveal>
      </div>
    </section>
  );
}

function PathRow({ path, tasks, hours, index, cta }: { path: AvailablePath; tasks: number; hours: number; index: number; cta: Cta }) {
  return (
    <motion.li className="lp-path" initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '0px 0px -10% 0px' }} transition={{ duration: 0.7, ease: EASE, delay: index * 0.08 }}>
      <span className="lp-path__num">{String(index + 1).padStart(2, '0')}</span>
      <div className="lp-path__main">
        <h3>{path.name}</h3>
        <p>{path.description}</p>
        <p className="lp-path__metrics">Medirás: {path.metrics.map((m) => m.label).join(' · ')}.</p>
      </div>
      <dl className="lp-path__stats">
        <div>
          <dt>{path.phases.length}</dt>
          <dd>fases</dd>
        </div>
        <div>
          <dt>{tasks}</dt>
          <dd>tareas como máximo</dd>
        </div>
        <div>
          <dt>{hours} h</dt>
          <dd>de trabajo guiado</dd>
        </div>
      </dl>
      <Link to={cta.to} className="lp-path__go" aria-label={`${cta.label}: ${path.name}`}>
        <Icon name="arrowRight" size={20} />
      </Link>
    </motion.li>
  );
}

function Results() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -20% 0px' });
  const last = DEMO_SERIES[DEMO_SERIES.length - 1]!.value;
  const first = DEMO_SERIES[0]!.value;
  return (
    <section className="lp-sec lp-sec--gray" id="resultados">
      <div className="lp-wrap lp-results">
        <div>
          <p className="lp-eyebrow lp-eyebrow--ink">Resultados</p>
          <Headline className="lp-h2" text="Tus cifras, no promesas." />
          <Reveal>
            <p className="lp-lead lp-lead--ink">LaunchOS no promete ingresos ni seguidores. Te da un sitio donde anotar lo que consigues y ver, semana a semana, si el trabajo se nota.</p>
            <ul className="lp-ticks">
              <li>Registras un valor en diez segundos.</li>
              <li>Cada camino mide lo que importa en él.</li>
              <li>El historial es tuyo y puedes corregirlo.</li>
            </ul>
          </Reveal>
        </div>
        <div className="lp-results__panel" ref={ref}>
          <div className="lp-results__head">
            <span className="lp-mini-eyebrow lp-mini-eyebrow--ink">Seguidores · datos de demostración</span>
            <div className="lp-results__figure">
              <strong>{inView ? <CountUp value={last} duration={1400} /> : first}</strong>
              <span>
                +{last - first} en {DEMO_SERIES.length - 1} semanas
              </span>
            </div>
          </div>
          {inView && <AreaChart points={DEMO_SERIES} height={280} label="Seguidores (datos de demostración)" formatValue={(v) => String(Math.round(v))} formatDate={(d) => new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(new Date(`${d}T00:00:00`))} />}
        </div>
      </div>
    </section>
  );
}

function Tools() {
  const half = Math.ceil(TOOLS.length / 2);
  const rows = [TOOLS.slice(0, half), TOOLS.slice(half)];
  return (
    <section className="lp-sec lp-sec--light lp-tools">
      <div className="lp-wrap">
        <p className="lp-eyebrow lp-eyebrow--ink">Herramientas</p>
        <Headline className="lp-h2" text="Aprende a usar lo que ya existe." />
        <Reveal>
          <p className="lp-lead lp-lead--ink">LaunchOS no intenta sustituirlas ni está integrado con ellas: en cada tarea te dice cuál usar, para qué y si tiene coste.</p>
        </Reveal>
      </div>
      <div className="lp-marquee" aria-hidden="true">
        {rows.map((row, r) => (
          <div key={r} className="lp-marquee__track" data-reverse={r === 1}>
            {[...row, ...row].map((t, i) => (
              <span key={i}>{t.name}</span>
            ))}
          </div>
        ))}
      </div>
      <p className="visually-hidden">Herramientas que aparecen en las tareas: {TOOLS.map((t) => t.name).join(', ')}.</p>
    </section>
  );
}

function Reviews() {
  return (
    <section className="lp-sec lp-sec--light lp-reviews" aria-labelledby="opiniones">
      <div className="lp-wrap">
        {REVIEWS.length > 0 ? (
          <>
            <p className="lp-eyebrow lp-eyebrow--ink" id="opiniones">
              Opiniones
            </p>
            <ul className="lp-reviews__list">
              {REVIEWS.map((r) => (
                <li key={r.name}>
                  <blockquote>{r.quote}</blockquote>
                  <strong>{r.name}</strong>
                  <span>{r.context}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <Reveal className="lp-honest">
            <LogoMark size={28} />
            <h2 id="opiniones">Todavía no hay opiniones que enseñarte.</h2>
            <p>LaunchOS acaba de empezar. Cuando las primeras personas lo hayan usado de verdad, sus opiniones estarán aquí. Hasta entonces, lo más honesto es que lo pruebes.</p>
            <ul>
              <li>Tus proyectos solo son visibles para ti.</li>
              <li>Puedes borrar un proyecto y sus datos cuando quieras.</li>
            </ul>
          </Reveal>
        )}
      </div>
    </section>
  );
}

function Final({ cta }: { cta: Cta }) {
  return (
    <section className="lp-sec lp-sec--dark lp-final">
      <div className="lp-sec__planes" aria-hidden="true">
        <i />
        <i />
      </div>
      <div className="lp-wrap">
        <Headline className="lp-final__title" text="Tu primer paso tarda dos minutos." />
        <Reveal delay={0.2}>
          <Link to={cta.to} className="lp-btn lp-btn--light lp-btn--lg">
            {cta.label} <Icon name="arrowRight" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
