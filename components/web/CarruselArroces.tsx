"use client";

import { useCallback, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { PaellaMini } from "./PaellaMini";
import { Hoja } from "./Hoja";
import { EnlaceBoton, muelle } from "./movimiento";

export type ArrozWeb = {
  slug: string;
  nombre: string;
  descripcion: string;
  ingredientes: string[];
  alergenos: string[];
  precio: string;
  minimo: string;
};

/** Escaparate de arroces: cada paella se eleva y gira con el muelle; al pulsar, su ficha. */
export function CarruselArroces({
  arroces,
  textos,
}: {
  arroces: ArrozWeb[];
  textos: { ingredientes: string; alergenos: string; sinAlergenos: string; reservarCon: string; verMas: string; cerrar: string };
}) {
  const [abierto, setAbierto] = useState<ArrozWeb | null>(null);
  const cerrar = useCallback(() => setAbierto(null), []);

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" aria-label="Arroces">
        {arroces.map((a) => (
          <li key={a.slug}>
            <motion.button
              type="button"
              onClick={() => setAbierto(a)}
              aria-label={textos.verMas.replace("{nombre}", a.nombre)}
              initial="reposo"
              whileHover="encima"
              whileFocus="encima"
              whileTap={{ scale: 0.98 }}
              variants={{ reposo: { y: 0 }, encima: { y: -3 } }}
              transition={muelle}
              className="group flex h-full w-full flex-col rounded-3xl bg-superficie p-2 text-left shadow-tarjeta transition-shadow duration-300 hover:shadow-elevada"
            >
              <span className="grid aspect-square place-items-center rounded-[20px] bg-sutil p-[12%]">
                <motion.span className="block w-full" variants={{ reposo: { rotate: 0, scale: 1 }, encima: { rotate: 8, scale: 1.03 } }} transition={muelle}>
                  <PaellaMini slug={a.slug} nombre={a.nombre} className="w-full drop-shadow-[0_12px_14px_rgba(0,0,0,0.16)]" />
                </motion.span>
              </span>
              <span className="flex flex-1 flex-col px-2.5 pb-2.5 pt-3.5">
                <span className="text-[17px] font-semibold leading-snug tracking-[-0.015em]">{a.nombre}</span>
                <span className="mt-1 text-[13px] text-suave">{a.precio}</span>
                <span className="mt-auto pt-1 text-[13px] text-tenue">{a.minimo}</span>
              </span>
            </motion.button>
          </li>
        ))}
      </ul>

      <Hoja titulo={abierto?.nombre ?? ""} abierta={Boolean(abierto)} onCerrar={cerrar} cerrar={textos.cerrar}>
        {abierto ? (
          <div>
            <div className="grid place-items-center rounded-[20px] bg-sutil py-6">
              <PaellaMini slug={abierto.slug} nombre={abierto.nombre} className="w-44 drop-shadow-[0_12px_14px_rgba(0,0,0,0.16)]" />
            </div>
            <p className="mt-5 leading-relaxed">{abierto.descripcion}</p>
            <dl className="mt-5 divide-y divide-linea border-y border-linea text-[15px]">
              {abierto.ingredientes.length ? (
                <div className="grid gap-1 py-3 sm:grid-cols-[8rem_1fr]">
                  <dt className="text-suave">{textos.ingredientes}</dt>
                  <dd>{abierto.ingredientes.join(", ")}</dd>
                </div>
              ) : null}
              <div className="grid gap-1 py-3 sm:grid-cols-[8rem_1fr]">
                <dt className="text-suave">{textos.alergenos}</dt>
                <dd>{abierto.alergenos.length ? abierto.alergenos.join(", ") : textos.sinAlergenos}</dd>
              </div>
            </dl>
            <p className="mt-4 flex items-baseline justify-between gap-4 text-[15px]">
              <span className="text-suave">{abierto.minimo}</span>
              <span className="font-semibold tabular-nums">{abierto.precio}</span>
            </p>
            <EnlaceBoton href="/reservar" tamano="lg" className="mt-6 w-full">
              {textos.reservarCon}
              <ArrowRight className="size-4" strokeWidth={2} aria-hidden />
            </EnlaceBoton>
          </div>
        ) : null}
      </Hoja>
    </>
  );
}
