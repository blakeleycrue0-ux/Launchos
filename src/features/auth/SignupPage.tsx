import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { Alert } from '@/components/ui/States';
import { toUserMessage } from '@/lib/errors';
import { getSupabase } from '@/lib/supabase';
import { AuthLayout } from './AuthLayout';

const schema = z.object({
  name: z.string().trim().min(1, 'Escribe tu nombre').max(80, 'Máximo 80 caracteres'),
  email: z.string().trim().email('Escribe un correo válido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
});

type Errors = Partial<Record<keyof z.infer<typeof schema>, string>>;

export function SignupPage() {
  const navigate = useNavigate();
  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) next[issue.path[0] as keyof Errors] ??= issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    setLoading(true);
    const { data, error } = await getSupabase().auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { display_name: parsed.data.name },
        emailRedirectTo: `${window.location.origin}/app`,
      },
    });
    setLoading(false);
    if (error) {
      setFormError(toUserMessage(error));
      return;
    }
    if (data.session) {
      navigate('/app', { replace: true });
    } else {
      // El proyecto requiere confirmación por correo.
      setSentTo(parsed.data.email);
    }
  }

  if (sentTo) {
    return (
      <AuthLayout
        title="Revisa tu correo"
        subtitle={`Te hemos enviado un enlace de confirmación a ${sentTo}. Ábrelo para activar tu cuenta.`}
        footer={<Link to="/login">Volver a iniciar sesión</Link>}
      >
        <Alert>Si no lo ves en unos minutos, revisa la carpeta de spam.</Alert>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Crea tu cuenta"
      subtitle="Elige qué quieres construir y recibe un plan paso a paso."
      footer={
        <>
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </>
      }
    >
      <form className="auth__form" onSubmit={onSubmit} noValidate>
        {formError && <Alert tone="error">{formError}</Alert>}
        <TextField label="Nombre" autoComplete="name" value={values.name} error={errors.name} onChange={(e) => setValues({ ...values, name: e.target.value })} />
        <TextField label="Correo electrónico" type="email" autoComplete="email" value={values.email} error={errors.email} onChange={(e) => setValues({ ...values, email: e.target.value })} />
        <TextField
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          value={values.password}
          error={errors.password}
          hint="Mínimo 8 caracteres."
          onChange={(e) => setValues({ ...values, password: e.target.value })}
        />
        <Button type="submit" variant="primary" size="lg" block loading={loading}>
          Crear cuenta
        </Button>
      </form>
    </AuthLayout>
  );
}
