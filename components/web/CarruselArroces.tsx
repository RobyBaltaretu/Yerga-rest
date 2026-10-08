"use client";

import { useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { PaellaMini } from "./PaellaMini";
import { Dialogo } from "@/components/ui/Dialogo";

export type ArrozWeb = {
  slug: string;
  nombre: string;
  descripcion: string;
  ingredientes: string[];
  alergenos: string[];
  precio: string;
  minimo: string;
};

/** Carrusel de paellas cenitales que giran al pasar; cada una se abre con su detalle. */
export function CarruselArroces({
  arroces,
  textos,
}: {
  arroces: ArrozWeb[];
  textos: { ingredientes: string; alergenos: string; sinAlergenos: string; reservarCon: string; verMas: string; anterior: string; siguiente: string };
}) {
  const pista = useRef<HTMLUListElement>(null);
  const [abierto, setAbierto] = useState<ArrozWeb | null>(null);
  const mover = (dir: number) => pista.current?.scrollBy({ left: dir * pista.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <div className="relative">
      <ul ref={pista} className="flex snap-x snap-mandatory gap-6 overflow-x-auto px-4 pb-6 [scrollbar-width:none] sm:px-[max(1rem,calc((100vw-72rem)/2))]" aria-label="Arroces">
        {arroces.map((a) => (
          <li key={a.slug} className="w-[72vw] max-w-72 shrink-0 snap-center">
            <button
              type="button"
              onClick={() => setAbierto(a)}
              className="cursor-cuchara group w-full text-left"
              aria-label={textos.verMas.replace("{nombre}", a.nombre)}
            >
              <PaellaMini slug={a.slug} nombre={a.nombre} className="paella-gira mx-auto w-full transition-transform duration-500 group-hover:rotate-12" />
              <p className="mt-4 font-display text-2xl">{a.nombre}</p>
              <p className="mt-1 text-sm text-niebla">{a.minimo} · {a.precio}</p>
            </button>
          </li>
        ))}
      </ul>
      <div className="mx-auto hidden max-w-6xl justify-end gap-2 px-4 sm:flex">
        <button type="button" onClick={() => mover(-1)} aria-label={textos.anterior} className="grid size-11 place-items-center rounded-full bg-white ring-1 ring-tinta/15">‹</button>
        <button type="button" onClick={() => mover(1)} aria-label={textos.siguiente} className="grid size-11 place-items-center rounded-full bg-white ring-1 ring-tinta/15">›</button>
      </div>

      <Dialogo titulo={abierto?.nombre ?? ""} abierto={Boolean(abierto)} onCerrar={() => setAbierto(null)}>
        {abierto ? (
          <div className="space-y-4">
            <PaellaMini slug={abierto.slug} nombre={abierto.nombre} className="mx-auto w-48" />
            <p>{abierto.descripcion}</p>
            {abierto.ingredientes.length ? (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-widest text-niebla">{textos.ingredientes}</h3>
                <p className="mt-1">{abierto.ingredientes.join(" · ")}</p>
              </div>
            ) : null}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-widest text-niebla">{textos.alergenos}</h3>
              <p className="mt-1">{abierto.alergenos.length ? abierto.alergenos.join(" · ") : textos.sinAlergenos}</p>
            </div>
            <p className="text-sm font-semibold">{abierto.minimo} · {abierto.precio}</p>
            <Link href="/reservar" className="inline-flex min-h-12 items-center rounded-full bg-pimenton px-6 font-semibold text-white">{textos.reservarCon}</Link>
          </div>
        ) : null}
      </Dialogo>
    </div>
  );
}
