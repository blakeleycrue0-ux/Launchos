import { useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { Alert } from '@/components/ui/States';
import type { AvailablePath } from '@/domain/types';
import { toUserMessage } from '@/lib/errors';
import { todayIso } from '@/lib/format';
import { useAddMetricEntry } from './api';

export function MetricEntryForm({ projectId, path, onDone }: { projectId: string; path: AvailablePath; onDone: () => void }) {
  const add = useAddMetricEntry(projectId);
  const selectId = useId();
  const [metricKey, setMetricKey] = useState(path.metrics[0]?.key ?? '');
  const [value, setValue] = useState('');
  const [recordedOn, setRecordedOn] = useState(todayIso());
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const def = path.metrics.find((m) => m.key === metricKey);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = Number(value.replace(',', '.'));
    if (value.trim() === '' || !Number.isFinite(parsed) || parsed < 0) return setError('Introduce un número igual o mayor que 0.');
    if (!recordedOn || recordedOn > todayIso()) return setError('La fecha no puede ser futura.');
    try {
      await add.mutateAsync({ metricKey, value: parsed, recordedOn, note });
      onDone();
    } catch {
      /* se muestra abajo */
    }
  }

  return (
    <form className="stack-md" onSubmit={onSubmit} noValidate>
      {(error || add.error) && <Alert tone="error">{error ?? toUserMessage(add.error)}</Alert>}
      <div className="field">
        <label className="field__label" htmlFor={selectId}>
          Métrica
        </label>
        <select id={selectId} className="select" value={metricKey} onChange={(e) => setMetricKey(e.target.value)}>
          {path.metrics.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>
        {def && <span className="field__hint">{def.help}</span>}
      </div>
      <div className="form-row">
        <TextField
          label={def?.unit === 'currency' ? 'Valor (€)' : 'Valor'}
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="0"
        />
        <TextField label="Fecha" type="date" value={recordedOn} max={todayIso()} onChange={(e) => setRecordedOn(e.target.value)} />
      </div>
      <TextField label="Nota (opcional)" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
      <div className="row-actions">
        <Button type="submit" variant="primary" size="sm" loading={add.isPending}>
          Guardar registro
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
