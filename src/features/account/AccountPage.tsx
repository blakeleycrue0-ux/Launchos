import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { Alert, ErrorState, Skeleton } from '@/components/ui/States';
import { toUserMessage } from '@/lib/errors';
import { formatDate } from '@/lib/format';
import { getSupabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/AuthProvider';
import { useProfile, useUpdateProfile } from '@/features/projects/api';

export function AccountPage() {
  const { user, signOut } = useAuth();
  const profile = useProfile();
  const updateProfile = useUpdateProfile();
  const [name, setName] = useState('');
  const [savedName, setSavedName] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pwState, setPwState] = useState<{ status: 'idle' | 'saving' | 'saved' | 'error'; message?: string }>({ status: 'idle' });
  const [leaving, setLeaving] = useState(false);

  const stored = profile.data?.display_name ?? '';
  useEffect(() => setName(stored), [stored]);

  async function onSaveName(e: FormEvent) {
    e.preventDefault();
    setSavedName(false);
    try {
      await updateProfile.mutateAsync(name);
      setSavedName(true);
    } catch {
      /* el error se muestra desde la mutación */
    }
  }

  async function onChangePassword(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setPwState({ status: 'error', message: 'La contraseña debe tener al menos 8 caracteres.' });
    if (password !== confirm) return setPwState({ status: 'error', message: 'Las contraseñas no coinciden.' });
    setPwState({ status: 'saving' });
    const { error } = await getSupabase().auth.updateUser({ password });
    if (error) return setPwState({ status: 'error', message: toUserMessage(error) });
    setPassword('');
    setConfirm('');
    setPwState({ status: 'saved' });
  }

  return (
    <div className="page page--narrow">
      <header className="phead">
        <div>
          <p className="phead__eyebrow">LaunchOS</p>
          <h1 className="phead__title">Cuenta</h1>
        </div>
      </header>

      <section className="block" aria-labelledby="acc-profile">
        <header className="block__head">
          <h2 id="acc-profile" className="block__title">
            Perfil
          </h2>
        </header>
        {profile.isPending ? (
          <Skeleton height={120} />
        ) : profile.error ? (
          <ErrorState error={profile.error} onRetry={() => profile.refetch()} />
        ) : (
          <form className="stack-md" onSubmit={onSaveName}>
            {updateProfile.error && <Alert tone="error">{toUserMessage(updateProfile.error)}</Alert>}
            {savedName && name === stored && <Alert tone="success">Nombre guardado.</Alert>}
            <TextField label="Nombre" value={name} maxLength={80} autoComplete="name" onChange={(e) => setName(e.target.value)} />
            <TextField label="Correo electrónico" value={user?.email ?? ''} readOnly hint={user?.created_at ? `Cuenta creada el ${formatDate(user.created_at)}.` : undefined} />
            <div className="row-actions">
              <Button type="submit" variant="primary" loading={updateProfile.isPending} disabled={name.trim() === stored.trim()}>
                Guardar nombre
              </Button>
            </div>
          </form>
        )}
      </section>

      <section className="block" aria-labelledby="acc-password">
        <header className="block__head">
          <h2 id="acc-password" className="block__title">
            Contraseña
          </h2>
        </header>
        <form className="stack-md" onSubmit={onChangePassword} noValidate>
          {pwState.status === 'error' && <Alert tone="error">{pwState.message}</Alert>}
          {pwState.status === 'saved' && <Alert tone="success">Contraseña actualizada.</Alert>}
          <div className="form-row">
            <TextField label="Nueva contraseña" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} hint="Mínimo 8 caracteres." />
            <TextField label="Repite la contraseña" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <div className="row-actions">
            <Button type="submit" loading={pwState.status === 'saving'} disabled={!password || !confirm}>
              Cambiar contraseña
            </Button>
          </div>
        </form>
      </section>

      <section className="block" aria-labelledby="acc-session">
        <header className="block__head">
          <h2 id="acc-session" className="block__title">
            Sesión
          </h2>
        </header>
        <p className="quiet__text">Tus proyectos se guardan en tu cuenta: al volver a entrar seguirás donde lo dejaste.</p>
        <div className="row-actions" style={{ marginTop: 16 }}>
          <Button
            loading={leaving}
            onClick={async () => {
              setLeaving(true);
              await signOut();
            }}
          >
            Cerrar sesión
          </Button>
        </div>
      </section>
    </div>
  );
}
