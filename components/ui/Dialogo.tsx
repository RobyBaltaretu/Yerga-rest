"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/** Diálogo modal accesible: foco atrapado en el panel, Escape cierra. */
export function Dialogo({ titulo, abierto, onCerrar, children, ancho = "max-w-lg" }: { titulo: string; abierto: boolean; onCerrar: () => void; children: ReactNode; ancho?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const previo = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", tecla);
    return () => {
      window.removeEventListener("keydown", tecla);
      previo?.focus();
    };
  }, [abierto, onCerrar]);
  if (!abierto) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={titulo}>
      <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-black/40" onClick={onCerrar} tabIndex={-1} />
      <div ref={ref} tabIndex={-1} className={`relative max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl bg-arroz p-5 shadow-2xl outline-none sm:rounded-3xl ${ancho}`}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="font-display text-2xl">{titulo}</h2>
          <button type="button" onClick={onCerrar} className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-arroz-2" aria-label="Cerrar">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
