import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useOutlet, useParams } from 'react-router-dom';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Logo } from '@/components/ui/Logo';
import { getAvailablePath } from '@/content/paths';
import { useAuth } from '@/features/auth/AuthProvider';
import { useProfile, useProjects } from '@/features/projects/api';
import type { ProjectRow } from '@/lib/database.types';

const EASE = [0.22, 1, 0.36, 1] as const;

export function AppShell() {
  const { user } = useAuth();
  const { projectId: routeId } = useParams<{ projectId: string }>();
  const location = useLocation();
  const projects = useProjects();
  const profile = useProfile();

  const list = projects.data ?? [];
  const current = list.find((p) => p.id === routeId) ?? list.find((p) => p.id === profile.data?.active_project_id) ?? list[0];
  const base = current ? `/app/projects/${current.id}` : null;
  const inTask = location.pathname.includes('/tasks/');

  const items: { to: string; label: string; icon: IconName; end?: boolean; active?: boolean }[] = [
    ...(base
      ? [
          { to: base, label: 'Resumen', icon: 'overview' as const, end: true },
          { to: `${base}/roadmap`, label: 'Roadmap', icon: 'roadmap' as const, active: inTask },
          { to: `${base}/metrics`, label: 'Métricas', icon: 'chart' as const },
        ]
      : []),
    { to: '/app/projects', label: 'Proyectos', icon: 'folder', end: true },
    { to: '/app/account', label: 'Cuenta', icon: 'user' },
  ];

  const name = profile.data?.display_name?.trim() || user?.email?.split('@')[0] || '';

  return (
    <MotionConfig reducedMotion="user">
      <div className="shell">
        <a href="#main" className="skip-link">
          Ir al contenido
        </a>

        <aside className="side" aria-label="Navegación principal">
          <div className="side__brand">
            <Logo size={20} />
          </div>
          <ProjectSwitcher current={current} projects={list} loading={projects.isPending} />
          <nav className="side__nav" aria-label="Secciones">
            {items.map((it, i) => (
              <NavLink key={it.to} to={it.to} end={it.end} className="side__link" data-active={it.active || undefined} data-gap={i === (base ? 3 : 0) || undefined}>
                <Icon name={it.icon} size={18} />
                {it.label}
              </NavLink>
            ))}
          </nav>
          <Link to="/app/account" className="side__user">
            <span className="side__avatar" aria-hidden="true">
              {name.slice(0, 1).toUpperCase()}
            </span>
            <span className="side__user-text">
              <strong>{name}</strong>
              <span>{user?.email}</span>
            </span>
          </Link>
        </aside>

        <header className="mtop">
          <Logo size={20} />
          <ProjectSwitcher current={current} projects={list} loading={projects.isPending} compact />
        </header>

        <main className="main" id="main" tabIndex={-1}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={location.pathname} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } }} exit={{ opacity: 0, transition: { duration: 0.12 } }}>
              <FrozenOutlet />
            </motion.div>
          </AnimatePresence>
        </main>

        <nav className="tabs" aria-label="Secciones">
          {items.map((it) => (
            <NavLink key={it.to} to={it.to} end={it.end} className="tabs__link" data-active={it.active || undefined}>
              {({ isActive }) => (
                <>
                  {(isActive || it.active) && <motion.span layoutId="tab-pill" className="tabs__pill" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
                  <Icon name={it.icon} size={20} />
                  <span>{it.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </MotionConfig>
  );
}

/**
 * Conserva la pantalla con la que se montó: durante la animación de salida la
 * página saliente sigue mostrando su propio contenido y la nueva se monta una sola vez.
 */
function FrozenOutlet() {
  const outlet = useOutlet();
  const [frozen] = useState(outlet);
  return frozen;
}

function ProjectSwitcher({ current, projects, loading, compact }: { current: ProjectRow | undefined; projects: ProjectRow[]; loading: boolean; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (loading) return <div className="switch switch--loading" data-compact={compact} aria-hidden="true" />;

  return (
    <div className="switch" data-compact={compact} ref={ref}>
      <button type="button" className="switch__btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="switch__text">
          <span className="switch__label">{current ? getAvailablePath(current.path_id)?.name ?? 'Proyecto' : 'Sin proyectos'}</span>
          <strong>{current?.name ?? 'Crea tu primer proyecto'}</strong>
        </span>
        <motion.span className="switch__chev" animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25, ease: EASE }}>
          <Icon name="chevron" size={16} />
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="switch__menu" role="menu" initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2, ease: EASE }}>
            {projects.map((p) => (
              <Link key={p.id} to={`/app/projects/${p.id}`} role="menuitem" className="switch__item" data-current={p.id === current?.id}>
                <span>
                  <strong>{p.name}</strong>
                  <small>{getAvailablePath(p.path_id)?.name}</small>
                </span>
                {p.id === current?.id && <Icon name="check" size={15} />}
              </Link>
            ))}
            <Link to="/app/new" role="menuitem" className="switch__item switch__item--new">
              <Icon name="plus" size={15} /> Nuevo proyecto
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
