import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { Alert } from '@/components/ui/States';
import { toUserMessage } from '@/lib/errors';
import { getSupabase } from '@/lib/supabase';
import { AuthLayout } from './AuthLayout';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/app';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: authError } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (authError) {
      setError(toUserMessage(authError));
      return;
    }
    navigate(from, { replace: true });
  }

  return (
    <AuthLayout
      title="Inicia sesión"
      subtitle="Continúa donde lo dejaste."
      footer={
        <>
          ¿No tienes cuenta? <Link to="/signup">Crear cuenta</Link>
        </>
      }
    >
      <form className="auth__form" onSubmit={onSubmit} noValidate>
        {error && <Alert tone="error">{error}</Alert>}
        <TextField label="Correo electrónico" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint={<Link className="link" to="/forgot-password">¿Has olvidado tu contraseña?</Link>}
        />
        <Button type="submit" variant="primary" size="lg" block loading={loading} disabled={!email || !password}>
          Iniciar sesión
        </Button>
      </form>
    </AuthLayout>
  );
}
