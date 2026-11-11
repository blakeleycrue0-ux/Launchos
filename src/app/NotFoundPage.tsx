import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/States';

export function NotFoundPage() {
  return (
    <div className="fullscreen-center">
      <EmptyState title="Página no encontrada" description="La dirección no existe o se ha movido." actions={<ButtonLink to="/app">Ir al inicio</ButtonLink>} />
    </div>
  );
}
