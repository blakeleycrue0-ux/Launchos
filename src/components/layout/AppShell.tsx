import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Logo } from '@/components/ui/Logo';
import { getAvailablePath } from '@/content/paths';
import { useAuth } from '@/features/auth/AuthProvider';
import { useProjects } from '@/features/projects/api';

export function AppShell() {
  const { user, signOut } = useAuth();
  const projects = useProjects();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="shell">
      <a href="#main" className="skip-link">
        Ir al contenido
      </a>
      <header className="topbar">
        <Logo />
        <Button variant="ghost" size="sm" aria-label="Abrir menú" aria-expanded={open} aria-controls="sidebar" onClick={() => setOpen(true)}>
          <Icon name="menu" />
        </Button>
      </header>

      {open && <div className="sidebar-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />}

      <aside className="sidebar" id="sidebar" data-open={open} aria-label="Navegación principal">
        <div className="sidebar__brand">
          <Logo />
        </div>

        <nav className="sidebar__section" aria-label="General">
          <NavLink to="/app" end className="nav-link">
            Inicio
          </NavLink>
          <NavLink to="/app/projects" end className="nav-link">
            Proyectos
          </NavLink>
        </nav>

        <div className="sidebar__section">
          <span className="sidebar__label" id="projects-label">Tus proyectos</span>
          <nav aria-labelledby="projects-label" style={{ display: 'contents' }}>
            {projects.isPending && <span className="sidebar__user">Cargando…</span>}
            {projects.data?.map((p) => (
              <NavLink key={p.id} to={`/app/projects/${p.id}`} className="nav-link">
                <span className="nav-link__name">{p.name}</span>
                <span className="nav-link__meta">{getAvailablePath(p.path_id)?.name.split(' ')[0] ?? ''}</span>
              </NavLink>
            ))}
            <NavLink to="/app/new" className="nav-link">
              <Icon name="plus" size={14} />
              Nuevo proyecto
            </NavLink>
          </nav>
        </div>

        <div className="sidebar__footer">
          <span className="sidebar__user" title={user?.email}>
            {user?.email}
          </span>
          <Button
            variant="ghost"
            size="sm"
            loading={signingOut}
            onClick={async () => {
              setSigningOut(true);
              await signOut();
            }}
            style={{ justifyContent: 'flex-start' }}
          >
            Cerrar sesión
          </Button>
        </div>
      </aside>

      <main className="main" id="main" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
