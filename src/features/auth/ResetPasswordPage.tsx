import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { Alert } from '@/components/ui/States';
import { toUserMessage } from '@/lib/errors';
import { getSupabase } from '@/lib/supabase';
import { useAuth } from './AuthProvider';
import { AuthLayout } from './AuthLayout';
import { FullScreenLoader } from './RequireAuth';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { user, initializing, clearPasswordRecovery } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (initializing) return <FullScreenLoader />;

  if (!user) {
    return (
      <AuthLayout title="Enlace no válido" subtitle="El enlace ha caducado o ya se ha usado." footer={<Link to="/forgot-password">Solicitar un enlace nuevo</Link>}>
        {null}
      </AuthLayout>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.');
    if (password !== confirm) return setError('Las contraseñas no coinciden.');
    setLoading(true);
    const { error: updateError } = await getSupabase().auth.updateUser({ password });
    setLoading(false);
    if (updateError) return setError(toUserMessage(updateError));
    clearPasswordRecovery();
    navigate('/app', { replace: true });
  }

  return (
    <AuthLayout title="Nueva contraseña" subtitle="Elige una contraseña que no uses en otros sitios.">
      <form className="auth__form" onSubmit={onSubmit} noValidate>
        {error && <Alert tone="error">{error}</Alert>}
        <TextField label="Nueva contraseña" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} hint="Mínimo 8 caracteres." />
        <TextField label="Repite la contraseña" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <Button type="submit" variant="primary" size="lg" block loading={loading}>
          Guardar contraseña
        </Button>
      </form>
    </AuthLayout>
  );
}
