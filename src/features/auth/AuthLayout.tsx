import type { ReactNode } from 'react';
import { Logo } from '@/components/ui/Logo';

export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="auth">
      <header className="auth__header">
        <Logo to="/" />
      </header>
      <main className="auth__main" id="main">
        <div className="auth__card">
          <h1 className="auth__title">{title}</h1>
          {subtitle && <p className="auth__subtitle">{subtitle}</p>}
          {children}
          {footer && <div className="auth__footer">{footer}</div>}
        </div>
      </main>
      <p className="auth__legal">LaunchOS · Tus datos solo son visibles para ti.</p>
    </div>
  );
}
