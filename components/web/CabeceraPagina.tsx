import type { ReactNode } from "react";

/** Título de las páginas interiores: grande, con tracking ajustado y entradilla en gris. */
export function CabeceraPagina({ titulo, intro, children, estrecha = false }: { titulo: string; intro?: string; children?: ReactNode; estrecha?: boolean }) {
  return (
    <header className={estrecha ? "mx-auto max-w-xl" : "mx-auto max-w-3xl"}>
      <h1 className="text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.02]">{titulo}</h1>
      {intro ? <p className="mt-4 text-lg leading-relaxed text-suave">{intro}</p> : null}
      {children}
    </header>
  );
}
