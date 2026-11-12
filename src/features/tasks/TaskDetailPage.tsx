import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { LayoutGroup, motion } from 'motion/react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { TextAreaField } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Alert, EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { fillPrompt } from '@/domain/roadmap';
import type { ExternalTool, TaskPrompt, TaskStatus } from '@/domain/types';
import { toUserMessage } from '@/lib/errors';
import { formatDate, formatMinutes } from '@/lib/format';
import { useUpdateTask } from '@/features/projects/api';
import { useProjectWorkspace } from '@/features/projects/useProjectWorkspace';

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'Pendiente' },
  { value: 'in_progress', label: 'En curso' },
  { value: 'done', label: 'Hecha' },
  { value: 'skipped', label: 'Omitida' },
];

const PRICING_LABEL: Record<ExternalTool['pricing'], string> = {
  free: 'Gratis',
  freemium: 'Plan gratuito',
  paid: 'De pago',
};

export function TaskDetailPage() {
  const { projectId, taskId } = useParams<{ projectId: string; taskId: string }>();
  const ws = useProjectWorkspace(projectId);
  const update = useUpdateTask(projectId ?? '');

  if (ws.isPending) return <div className="page"><LoadingState label="Cargando tarea" /></div>;
  if (ws.error) return <div className="page"><ErrorState error={ws.error} onRetry={ws.refetch} /></div>;
  const project = ws.project.data;
  const items = ws.data?.items ?? [];
  const index = items.findIndex((i) => i.row.id === taskId);
  const item = items[index];

  if (!project || !item) {
    return (
      <div className="page">
        <EmptyState
          title="Tarea no encontrada"
          description="Puede que el enlace no sea correcto o que la tarea ya no exista."
          actions={<ButtonLink to={project ? `/app/projects/${project.id}` : '/app'}>Volver al proyecto</ButtonLink>}
        />
      </div>
    );
  }

  const { row, template, phase } = item;
  const prev = items[index - 1];
  const next = items[index + 1];
  const base = `/app/projects/${project.id}`;
  const vars = { projectName: project.name, goal: project.goal };
  const fallbacks = { goal: '[tu objetivo]', projectName: '[nombre del proyecto]' };

  return (
    <div className="page page--narrow">
      <ButtonLink to={`${base}/roadmap`} variant="ghost" size="sm" className="backlink">
        <Icon name="arrowLeft" size={14} /> Roadmap
      </ButtonLink>

      <header className="thead">
        <p className="phead__eyebrow">
          {phase.title} · Tarea {index + 1} de {items.length}
        </p>
        <h1 className="thead__title">{template.title}</h1>
        <p className="thead__desc">{template.summary}</p>
        <div className="thead__meta">
          <span className="tag">{formatMinutes(template.estimatedMinutes)}</span>
          {row.completed_at && row.status === 'done' && <span className="tag tag--success">Completada el {formatDate(row.completed_at)}</span>}
          {row.started_at && row.status === 'in_progress' && <span className="tag tag--accent">Empezada el {formatDate(row.started_at)}</span>}
        </div>
      </header>

      <div className="task-status-bar">
        <div className="seg" role="group" aria-label="Estado de la tarea">
          <LayoutGroup id="task-status">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                aria-pressed={row.status === opt.value}
                disabled={update.isPending}
                onClick={() => row.status !== opt.value && update.mutate({ taskId: row.id, patch: { status: opt.value } })}
              >
                {row.status === opt.value && <motion.span layoutId="pill" className="seg__pill" transition={{ type: 'spring', stiffness: 460, damping: 36 }} />}
                <span>{opt.label}</span>
              </button>
            ))}
          </LayoutGroup>
        </div>
        {update.isPending && <span className="field__hint">Guardando…</span>}
      </div>
      {update.error && <Alert tone="error">No se ha podido guardar: {toUserMessage(update.error)}</Alert>}

      <section className="task-section" aria-labelledby="steps-title">
        <h2 id="steps-title" className="block__title">
          Pasos
        </h2>
        <ol className="steps">
          {template.steps.map((s, i) => (
            <motion.li key={s} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.08 + i * 0.05 }}>
              {s}
            </motion.li>
          ))}
        </ol>
      </section>

      <section className="task-section">
        <div className="done-when">
          <span className="done-when__label">Sabrás que has terminado cuando</span>
          <p>{template.doneWhen}</p>
        </div>
      </section>

      {template.tools && template.tools.length > 0 && (
        <section className="task-section" aria-labelledby="tools-title">
          <h2 id="tools-title" className="block__title">
            Herramientas
          </h2>
          <ul className="tool-list">
            {template.tools.map((tool) => (
              <li key={tool.url + tool.name}>
                <a href={tool.url} target="_blank" rel="noopener noreferrer" className="tool">
                  <span className="tool__body">
                    <span className="tool__name">
                      {tool.name}
                      <span className="visually-hidden"> (se abre en una pestaña nueva)</span>
                    </span>
                    <span className="tool__purpose">{tool.purpose}</span>
                  </span>
                  <span className="tag">{PRICING_LABEL[tool.pricing]}</span>
                  <Icon name="external" size={14} />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {template.prompts && template.prompts.length > 0 && (
        <section className="task-section" aria-labelledby="prompts-title">
          <h2 id="prompts-title" className="block__title">
            Prompts
          </h2>
          <p className="field__hint" style={{ marginBottom: 'var(--space-3)' }}>
            Cópialos en tu asistente de IA y sustituye lo que aparece entre corchetes.
          </p>
          <div className="stack-md">
            {template.prompts.map((p) => (
              <PromptBlock key={p.title} prompt={p} text={fillPrompt(p.body, vars, fallbacks)} />
            ))}
          </div>
        </section>
      )}

      {template.tips && template.tips.length > 0 && (
        <section className="task-section" aria-labelledby="tips-title">
          <h2 id="tips-title" className="block__title">
            Consejos
          </h2>
          <ul className="tips">
            {template.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="task-section" aria-labelledby="notes-title">
        <h2 id="notes-title" className="visually-hidden">
          Notas
        </h2>
        <NotesEditor key={row.id} initial={row.notes ?? ''} saving={update.isPending} onSave={(notes) => update.mutateAsync({ taskId: row.id, patch: { notes: notes.trim() || null } })} />
      </section>

      <nav className="task-nav" aria-label="Navegación entre tareas">
        {prev ? (
          <ButtonLink to={`${base}/tasks/${prev.row.id}`} variant="ghost">
            <Icon name="arrowLeft" /> <span className="task-nav__label">{prev.template.title}</span>
          </ButtonLink>
        ) : (
          <span />
        )}
        {next && (
          <ButtonLink to={`${base}/tasks/${next.row.id}`} variant="ghost">
            <span className="task-nav__label">{next.template.title}</span> <Icon name="arrowRight" />
          </ButtonLink>
        )}
      </nav>
    </div>
  );
}

function PromptBlock({ prompt, text }: { prompt: TaskPrompt; text: string }) {
  const [copied, setCopied] = useState<'idle' | 'ok' | 'error'>('idle');
  useEffect(() => {
    if (copied === 'idle') return;
    const t = window.setTimeout(() => setCopied('idle'), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);

  return (
    <div className="prompt-block">
      <div className="prompt-block__head">
        <span>{prompt.title}</span>
        <Button
          size="sm"
          variant="ghost"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setCopied('ok');
            } catch {
              setCopied('error');
            }
          }}
        >
          <Icon name={copied === 'ok' ? 'check' : 'copy'} size={14} />
          {copied === 'ok' ? 'Copiado' : copied === 'error' ? 'No se pudo copiar' : 'Copiar'}
        </Button>
      </div>
      <pre className="prompt-block__body">{text}</pre>
    </div>
  );
}

function NotesEditor({ initial, saving, onSave }: { initial: string; saving: boolean; onSave: (notes: string) => Promise<unknown> }) {
  const [value, setValue] = useState(initial);
  const [savedValue, setSavedValue] = useState(initial);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const dirty = value !== savedValue;

  return (
    <div className="stack-sm">
      <TextAreaField
        label="Tus notas"
        value={value}
        maxLength={5000}
        rows={5}
        placeholder="Enlaces, decisiones, ideas… Solo tú puedes verlas."
        onChange={(e) => {
          setValue(e.target.value);
          setStatus('idle');
        }}
      />
      <div className="row-actions">
        <Button
          size="sm"
          disabled={!dirty}
          loading={saving && dirty}
          onClick={async () => {
            try {
              await onSave(value);
              setSavedValue(value);
              setStatus('saved');
            } catch {
              setStatus('error');
            }
          }}
        >
          Guardar notas
        </Button>
        {status === 'saved' && !dirty && <span className="field__hint">Guardado</span>}
        {status === 'error' && <span className="field__error">No se han podido guardar las notas.</span>}
        {dirty && <span className="field__hint">Cambios sin guardar</span>}
      </div>
    </div>
  );
}
