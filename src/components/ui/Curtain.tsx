import { useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { LogoMark } from "./Logo";
import "./curtain.css";

/**
 * Cortina de transición a pantalla completa. Vive fuera del router para
 * cubrir un cambio de ruta: se muestra, se navega por debajo y se levanta.
 * Solo debe mostrarse cuando la operación que anuncia ya está confirmada.
 */
interface CurtainState {
  open: boolean;
  eyebrow: string;
  title: string;
  meta: string;
  /** Punto desde el que crece la cortina (porcentaje del ancho ya oscuro a la derecha). */
  from: "right" | "bottom";
}

let state: CurtainState = {
  open: false,
  eyebrow: "",
  title: "",
  meta: "",
  from: "right",
};
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const curtain = {
  show(payload: Omit<CurtainState, "open">) {
    state = { ...payload, open: true };
    emit();
  },
  hide() {
    state = { ...state, open: false };
    emit();
  },
};

const EASE = [0.22, 1, 0.36, 1] as const;
const reduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function Curtain() {
  const s = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
  );
  const simple = reduced();
  const hidden = simple
    ? { opacity: 0 }
    : {
        clipPath:
          s.from === "right" ? "inset(0% 0% 0% 46%)" : "inset(100% 0% 0% 0%)",
      };
  const shown = simple ? { opacity: 1 } : { clipPath: "inset(0% 0% 0% 0%)" };
  const lifted = simple ? { opacity: 0 } : { y: "-100%" };

  return (
    <AnimatePresence>
      {s.open && (
        <motion.div
          className="curtain"
          role="status"
          aria-live="polite"
          initial={hidden}
          animate={shown}
          exit={lifted}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <div className="curtain__planes" aria-hidden="true">
            <i />
            <i />
          </div>
          <div className="curtain__content">
            <motion.div
              className="curtain__mark"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 22,
                delay: 0.35,
              }}
            >
              <LogoMark size={44} />
            </motion.div>
            <motion.p
              className="curtain__eyebrow"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE, delay: 0.5 }}
            >
              {s.eyebrow}
            </motion.p>
            <h2 className="curtain__title" aria-label={s.title}>
              {s.title.split(" ").map((word, i) => (
                <span key={i} aria-hidden="true">
                  {i > 0 && " "}
                  <span className="curtain__word">
                    <motion.span
                      initial={{ y: "110%" }}
                      animate={{ y: 0 }}
                      transition={{
                        duration: 0.7,
                        ease: EASE,
                        delay: 0.55 + i * 0.05,
                      }}
                    >
                      {word}
                    </motion.span>
                  </span>
                </span>
              ))}
            </h2>
            <motion.p
              className="curtain__meta"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.95 }}
            >
              {s.meta}
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
