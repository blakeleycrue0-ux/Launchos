import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { Alert } from '@/components/ui/States';
import { toUserMessage } from '@/lib/errors';
import { getSupabase } from '@/lib/supabase';
import { AuthLayout } from './AuthLayout';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: resetError } = await getSupabase().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (resetError) setError(toUserMessage(resetError));
    else setSent(true);
  }

  return (
    <AuthLayout
      title="Recupera tu contraseña"
      subtitle="Te enviaremos un enlace para crear una nueva."
      footer={<Link to="/login">Volver a iniciar sesión</Link>}
    >
      {sent ? (
        <Alert tone="success">Si existe una cuenta con ese correo, recibirás un enlace en unos minutos.</Alert>
      ) : (
        <form className="auth__form" onSubmit={onSubmit} noValidate>
          {error && <Alert tone="error">{error}</Alert>}
          <TextField label="Correo electrónico" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" variant="primary" size="lg" block loading={loading} disabled={!email}>
            Enviar enlace
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
