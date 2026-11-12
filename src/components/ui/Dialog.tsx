import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Diálogo modal: centrado en escritorio y hoja inferior en móvil.
 * Usar dentro de <AnimatePresence> para animar la salida.
 */
export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const first = panel.current?.querySelector<HTMLElement>('input, select, textarea, button');
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && panel.current) {
        const items = [...panel.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, select, textarea')];
        const firstEl = items[0];
        const lastEl = items[items.length - 1];
        if (!firstEl || !lastEl) return;
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [onClose]);

  return createPortal(
    <div className="dialog" role="dialog" aria-modal="true" aria-label={title}>
      <motion.div className="dialog__backdrop" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} />
      <motion.div
        ref={panel}
        className="dialog__panel"
        initial={{ opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 360, damping: 34 } }}
        exit={{ opacity: 0, y: 20, transition: { duration: 0.2, ease: EASE } }}
      >
        <header className="dialog__head">
          <h2>{title}</h2>
          <button type="button" className="dialog__close" onClick={onClose}>
            Cerrar
          </button>
        </header>
        {children}
      </motion.div>
    </div>,
    document.body,
  );
}
