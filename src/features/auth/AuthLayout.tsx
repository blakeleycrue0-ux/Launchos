import type { ReactNode } from 'react';
import { MotionConfig, motion } from 'motion/react';
import { Logo } from '@/components/ui/Logo';
import { Planes } from '@/components/ui/Planes';
import { AVAILABLE_PATHS } from '@/content/paths';

const EASE = [0.22, 1, 0.36, 1] as const;

// Cifras reales del contenido disponible (no son datos de usuarios).
const TASKS = AVAILABLE_PATHS.reduce((n, p) => n + p.phases.reduce((m, ph) => m + ph.tasks.length, 0), 0);
const TOOLS = new Set(AVAILABLE_PATHS.flatMap((p) => p.phases.flatMap((ph) => ph.tasks.flatMap((t) => (t.tools ?? []).map((x) => x.name))))).size;

export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="auth">
        <div className="auth__left">
          <header className="auth__bar">
            <Logo to="/" size={22} />
          </header>
          <main className="auth__main" id="main">
            <motion.div className="auth__card" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: EASE }}>
              <h1 className="auth__title">{title}</h1>
              {subtitle && <p className="auth__subtitle">{subtitle}</p>}
              {children}
              {footer && <div className="auth__footer">{footer}</div>}
            </motion.div>
          </main>
          <p className="auth__legal">Tus proyectos solo son visibles para ti.</p>
        </div>
        <aside className="auth__right" aria-hidden="true">
          <Planes />
          <div className="auth__pitch">
            <motion.p className="auth__quote" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE, delay: 0.15 }}>
              Un plan claro para lo que quieres construir.
            </motion.p>
            <motion.dl className="auth__facts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, delay: 0.45 }}>
              <div>
                <dt>{AVAILABLE_PATHS.length}</dt>
                <dd>caminos disponibles</dd>
              </div>
              <div>
                <dt>{TASKS}</dt>
                <dd>tareas con instrucciones</dd>
              </div>
              <div>
                <dt>{TOOLS}</dt>
                <dd>herramientas explicadas</dd>
              </div>
            </motion.dl>
          </div>
        </aside>
      </div>
    </MotionConfig>
  );
}
