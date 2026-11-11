import type { ReactNode } from 'react';
import { toUserMessage } from '@/lib/errors';
import { Button } from './Button';
import { Spinner } from './Spinner';

export function EmptyState({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="state">
      <h2 className="state__title">{title}</h2>
      {description && <p className="state__desc">{description}</p>}
      {actions && <div className="state__actions">{actions}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, title = 'No se ha podido cargar' }: { error: unknown; onRetry?: () => void; title?: string }) {
  return (
    <div className="state" role="alert">
      <h2 className="state__title">{title}</h2>
      <p className="state__desc">{toUserMessage(error)}</p>
      {onRetry && (
        <div className="state__actions">
          <Button onClick={onRetry}>Reintentar</Button>
        </div>
      )}
    </div>
  );
}

export function LoadingState({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="state" style={{ color: 'var(--color-text-tertiary)' }}>
      <Spinner label={label} />
    </div>
  );
}

export function Skeleton({ height = 16, width = '100%', style }: { height?: number; width?: number | string; style?: React.CSSProperties }) {
  return <div className="skeleton" style={{ height, width, ...style }} aria-hidden="true" />;
}

export function Alert({ tone = 'neutral', children }: { tone?: 'neutral' | 'error' | 'success'; children: ReactNode }) {
  return (
    <div className={`alert${tone !== 'neutral' ? ` alert--${tone}` : ''}`} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}
