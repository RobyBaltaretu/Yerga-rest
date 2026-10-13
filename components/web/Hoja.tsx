"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";

/**
 * Hoja modal de la web: sube desde abajo en el móvil y aparece centrada en escritorio.
 * Escape y el fondo cierran; el foco entra y vuelve a donde estaba.
 */
export function Hoja({ titulo, abierta, onCerrar, cerrar, children }: { titulo: string; abierta: boolean; onCerrar: () => void; cerrar: string; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierta) return;
    const previo = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
      if (e.key === "Tab" && panel.current) {
        const focos = panel.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
        const primero = focos[0];
        const ultimo = focos[focos.length - 1];
        if (e.shiftKey && document.activeElement === primero) {
          e.preventDefault();
          ultimo?.focus();
        } else if (!e.shiftKey && document.activeElement === ultimo) {
          e.preventDefault();
          primero?.focus();
        }
      }
    };
    document.documentElement.style.overflow = "hidden";
    window.addEventListener("keydown", tecla);
    return () => {
      document.documentElement.style.overflow = "";
      window.removeEventListener("keydown", tecla);
      previo?.focus();
    };
  }, [abierta, onCerrar]);

  return (
    <AnimatePresence>
      {abierta ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={titulo}>
          <motion.button
            type="button"
            tabIndex={-1}
            aria-label={cerrar}
            onClick={onCerrar}
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px] dark:bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            ref={panel}
            tabIndex={-1}
            className="relative max-h-[90dvh] w-full overflow-y-auto rounded-t-[28px] bg-superficie p-6 shadow-flotante outline-none sm:max-w-lg sm:rounded-[28px]"
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.98, transition: { duration: 0.15 } }}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-linea-fuerte sm:hidden" aria-hidden />
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-2xl font-semibold tracking-[-0.025em]">{titulo}</h2>
              <button type="button" onClick={onCerrar} aria-label={cerrar} className="-mr-2 -mt-1 grid size-11 shrink-0 place-items-center rounded-full text-suave transition-colors hover:bg-sutil hover:text-texto">
                <X className="size-5" strokeWidth={1.75} />
              </button>
            </div>
            <div className="mt-4">{children}</div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
