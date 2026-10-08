import { useId } from "react";

/**
 * Palabra en valenciano con su traducción al pasar el ratón o al enfocarla con el
 * teclado: enseña el vocabulario sin excluir a nadie.
 */
export function Termino({ va, traduccion, oscuro = false }: { va: string; traduccion: string; oscuro?: boolean }) {
  const id = useId();
  return (
    <span className="group relative inline-block">
      <span tabIndex={0} lang="ca-ES-valencia" aria-describedby={id} className={`cursor-help border-b border-dotted ${oscuro ? "border-arroz/60" : "border-tinta/50"} font-semibold outline-none focus-visible:ring-2 focus-visible:ring-azafran`}>
        {va}
      </span>
      <span id={id} role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-tinta px-2 py-1 text-xs font-normal text-arroz opacity-0 shadow-lg transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
        {traduccion}
      </span>
    </span>
  );
}
