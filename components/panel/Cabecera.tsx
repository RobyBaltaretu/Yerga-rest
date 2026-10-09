import type { ReactNode } from "react";

/** Cabecera común de las páginas del panel. */
export function Cabecera({ titulo, descripcion, acciones }: { titulo: string; descripcion?: ReactNode; acciones?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-tinta/10 px-4 pb-4 pt-6 sm:px-6">
      <div>
        <h1 className="font-display text-3xl">{titulo}</h1>
        {descripcion ? <p className="mt-1 text-sm text-niebla">{descripcion}</p> : null}
      </div>
      {acciones ? <div className="flex flex-wrap items-center gap-2 print:hidden">{acciones}</div> : null}
    </div>
  );
}
