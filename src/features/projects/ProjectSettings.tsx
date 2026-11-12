import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { TextAreaField, TextField } from '@/components/ui/Field';
import { Alert } from '@/components/ui/States';
import type { ProjectRow } from '@/lib/database.types';
import { toUserMessage } from '@/lib/errors';
import { useDeleteProject, useUpdateProject } from './api';

export function ProjectSettings({ project }: { project: ProjectRow }) {
  const navigate = useNavigate();
  const update = useUpdateProject(project.id);
  const remove = useDeleteProject();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const [goal, setGoal] = useState(project.goal ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saved, setSaved] = useState(false);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await update.mutateAsync({ name: name.trim(), goal: goal.trim() || null });
    setEditing(false);
    setSaved(true);
  }

  return (
    <section className="block" aria-labelledby="settings-title">
      <header className="block__head">
        <h2 id="settings-title" className="block__title">
          Ajustes del proyecto
        </h2>
      </header>
      <div className="stack-md">
        {update.error && <Alert tone="error">{toUserMessage(update.error)}</Alert>}
        {remove.error && <Alert tone="error">{toUserMessage(remove.error)}</Alert>}
        {saved && !editing && <Alert tone="success">Cambios guardados.</Alert>}

        {editing ? (
          <form className="stack-md" onSubmit={onSave}>
            <TextField label="Nombre" value={name} maxLength={80} required onChange={(e) => setName(e.target.value)} error={name.trim() ? null : 'El nombre es obligatorio'} />
            <TextAreaField label="Objetivo" value={goal} maxLength={500} rows={3} onChange={(e) => setGoal(e.target.value)} />
            <div className="row-actions">
              <Button type="submit" variant="primary" size="sm" loading={update.isPending} disabled={!name.trim()}>
                Guardar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  setName(project.name);
                  setGoal(project.goal ?? '');
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <div className="row-actions">
            <Button size="sm" onClick={() => { setSaved(false); setEditing(true); }}>
              Editar nombre y objetivo
            </Button>
            <Button
              size="sm"
              loading={update.isPending}
              onClick={() => update.mutate({ status: project.status === 'paused' ? 'active' : 'paused' })}
            >
              {project.status === 'paused' ? 'Reanudar proyecto' : 'Pausar proyecto'}
            </Button>
          </div>
        )}

        <div className="danger-zone">
          {confirmDelete ? (
            <div className="stack-sm">
              <p className="field__hint" style={{ color: 'var(--color-danger)' }}>
                Se eliminarán el proyecto, sus tareas y sus métricas. Esta acción no se puede deshacer.
              </p>
              <div className="row-actions">
                <Button
                  size="sm"
                  variant="danger"
                  loading={remove.isPending}
                  onClick={() => remove.mutate(project.id, { onSuccess: () => navigate('/app', { replace: true }) })}
                >
                  Eliminar definitivamente
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)} style={{ color: 'var(--color-danger)' }}>
              Eliminar proyecto
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
