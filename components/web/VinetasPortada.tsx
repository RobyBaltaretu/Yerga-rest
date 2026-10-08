"use client";

import { useSyncExternalStore } from "react";
import { Paella } from "./Paella";

function suscribir(cb: () => void) {
  const mq = matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

const hacenFalta = () => matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("ligera");

/**
 * Las cinco escenas como viñetas estáticas. Solo se dibujan para quien no ve la
 * animación (movimiento reducido o modo ligero): así no pesan en la carga de los demás.
 */
export function VinetasPortada({ escenas, textos }: { escenas: string[]; textos: string[] }) {
  const mostrar = useSyncExternalStore(suscribir, hacenFalta, () => false);
  return (
    <ol className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
      {escenas.map((nombre, i) => (
        <li key={nombre} className="flex flex-col items-center">
          {mostrar ? <Paella escena={i} nGranos={36} nBrasas={12} id={`v${i}`} etiqueta={`${nombre}: ${textos[i]}`} className="w-full max-w-48" /> : <div className="aspect-square w-full max-w-48" />}
          <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-azafran">{String(i + 1).padStart(2, "0")} · {nombre}</p>
          <p className="mt-1 text-sm text-arroz/80">{textos[i]}</p>
        </li>
      ))}
    </ol>
  );
}
