"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Minus, Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ConBrillo, EnlaceBoton } from "./movimiento";
import { PuntoVivo, useAvisoDisponibilidad } from "./CabeceraCliente";

type Textos = {
  mesaPara: string;
  persona: string;
  personas: string;
  menos: string;
  mas: string;
  verHoras: string;
  grupo: string;
  datos: string;
};

/**
 * Primer paso real de la reserva en la portada: «Mesa para − 2 + personas». El número
 * rueda con el muelle y el botón abre el flujo con ese dato ya puesto.
 */
export function TarjetaReserva({ locale, maximo, textos }: { locale: string; maximo: number; textos: Textos }) {
  const [n, setN] = useState(2);
  const [dir, setDir] = useState(1);
  const aviso = useAvisoDisponibilidad(locale);
  const cambiar = (d: number) => {
    setDir(d);
    setN((v) => Math.min(maximo + 1, Math.max(1, v + d)));
  };
  const grupo = n > maximo;

  return (
    <ConBrillo className="rounded-[28px] bg-superficie p-1.5 shadow-elevada">
      <div className="rounded-[22px] border border-linea px-5 pb-5 pt-4 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <p className="text-[15px] font-medium text-suave">{textos.mesaPara}</p>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <div className="flex items-center gap-1">
              <BotonPaso etiqueta={textos.menos} onClick={() => cambiar(-1)} disabled={n <= 1}>
                <Minus className="size-4" strokeWidth={2} />
              </BotonPaso>
              <div className="relative h-14 w-16 overflow-hidden text-center" aria-live="polite" aria-atomic="true">
                <AnimatePresence initial={false} mode="popLayout" custom={dir}>
                  <motion.span
                    key={n}
                    custom={dir}
                    variants={{
                      entra: (d: number) => ({ y: d > 0 ? "70%" : "-70%", opacity: 0, filter: "blur(4px)" }),
                      quieto: { y: 0, opacity: 1, filter: "blur(0px)" },
                      sale: (d: number) => ({ y: d > 0 ? "-70%" : "70%", opacity: 0, filter: "blur(4px)" }),
                    }}
                    initial="entra"
                    animate="quieto"
                    exit="sale"
                    className="absolute inset-0 grid place-items-center text-5xl font-semibold tabular-nums tracking-[-0.04em]"
                  >
                    <span className="sr-only">
                      {textos.mesaPara} {grupo ? `+${maximo}` : n} {n === 1 ? textos.persona : textos.personas}
                    </span>
                    <span aria-hidden>{grupo ? `${maximo}+` : n}</span>
                  </motion.span>
                </AnimatePresence>
              </div>
              <BotonPaso etiqueta={textos.mas} onClick={() => cambiar(1)} disabled={grupo}>
                <Plus className="size-4" strokeWidth={2} />
              </BotonPaso>
            </div>
            <p className="min-w-20 text-right text-[15px] font-medium text-suave" aria-hidden>
              {n === 1 ? textos.persona : textos.personas}
            </p>
          </div>
        </div>

        <div className="mt-4">
          {grupo ? (
            <EnlaceBoton href="/comidas-de-grupo" tamano="lg" className="w-full">
              {textos.grupo}
              <ArrowRight className="size-4" strokeWidth={2} aria-hidden />
            </EnlaceBoton>
          ) : (
            <EnlaceBoton href={{ pathname: "/reservar", query: { comensales: n } }} tamano="lg" className="group w-full">
              {textos.verHoras}
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2} aria-hidden />
            </EnlaceBoton>
          )}
        </div>

        <p className="mt-4 flex items-center gap-2 text-[13px] font-medium text-suave">
          <PuntoVivo />
          <span>{aviso ?? textos.datos}</span>
        </p>
        {!grupo ? (
          <p className="mt-1 text-[13px] text-tenue">
            <Link href="/comidas-de-grupo" className="enlace">
              {textos.grupo}
            </Link>
          </p>
        ) : null}
      </div>
    </ConBrillo>
  );
}

function BotonPaso({ etiqueta, onClick, disabled, children }: { etiqueta: string; onClick: () => void; disabled: boolean; children: ReactNode }) {
  return (
    <motion.button
      type="button"
      aria-label={etiqueta}
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.92 }}
      className="grid size-11 place-items-center rounded-full bg-sutil text-texto transition-colors hover:bg-linea-fuerte disabled:opacity-35"
    >
      {children}
    </motion.button>
  );
}
