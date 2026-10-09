"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { cargarDias, type DiaDisponible } from "@/app/[locale]/reservar/acciones";
import { capitalizar, intlLocale, sumarDias } from "@/lib/format";

type Props = {
  locale: string;
  comensales: number;
  hoy: string; // YYYY-MM-DD local
  maxDias: number;
  seleccion: string | null;
  onElegir: (fecha: string) => void;
};

function primerDiaMes(fecha: string) {
  return `${fecha.slice(0, 7)}-01`;
}

function sumarMeses(fecha: string, n: number) {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 10);
}

function ultimoDiaMes(fecha: string) {
  return sumarDias(sumarMeses(fecha, 1), -1);
}

/** Calendario mensual (lunes primero) con los días cerrados o completos desactivados. */
export function Calendario({ locale, comensales, hoy, maxDias, seleccion, onElegir }: Props) {
  const t = useTranslations("reserva.calendario");
  const ultimo = sumarDias(hoy, maxDias);
  const [mes, setMes] = useState(primerDiaMes(seleccion ?? hoy));
  const [dias, setDias] = useState<Record<string, DiaDisponible["estado"]>>({});
  const [cargando, startTransition] = useTransition();

  useEffect(() => {
    const desde = mes < hoy ? hoy : mes;
    const fin = ultimoDiaMes(mes);
    const hasta = fin > ultimo ? ultimo : fin;
    if (hasta < desde) return;
    startTransition(async () => {
      const res = await cargarDias(desde, hasta, comensales);
      setDias((prev) => ({ ...prev, ...Object.fromEntries(res.map((d) => [`${comensales}:${d.fecha}`, d.estado])) }));
    });
  }, [mes, comensales, hoy, ultimo]);

  const celdas = useMemo(() => {
    const inicio = new Date(`${mes}T12:00:00Z`);
    const desfase = (inicio.getUTCDay() + 6) % 7; // lunes = 0
    const total = Number(ultimoDiaMes(mes).slice(8, 10));
    return [
      ...Array.from({ length: desfase }, () => null),
      ...Array.from({ length: total }, (_, i) => sumarDias(mes, i)),
    ];
  }, [mes]);

  const fmtMes = new Intl.DateTimeFormat(intlLocale(locale), { month: "long", year: "numeric", timeZone: "UTC" });
  const fmtDiaSemana = new Intl.DateTimeFormat(intlLocale(locale), { weekday: "narrow", timeZone: "UTC" });
  const fmtLargo = new Intl.DateTimeFormat(intlLocale(locale), { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  const cabecera = Array.from({ length: 7 }, (_, i) => fmtDiaSemana.format(new Date(Date.UTC(2024, 0, 1 + i))));

  const puedeAtras = mes > primerDiaMes(hoy);
  const puedeAdelante = sumarMeses(mes, 1) <= ultimo;

  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-tinta/10" aria-busy={cargando}>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMes(sumarMeses(mes, -1))}
          disabled={!puedeAtras}
          aria-label={t("anterior")}
          className="grid size-11 place-items-center rounded-full hover:bg-arroz disabled:opacity-30"
        >
          ‹
        </button>
        <p className="font-display text-lg" aria-live="polite">
          {capitalizar(fmtMes.format(new Date(`${mes}T12:00:00Z`)))}
        </p>
        <button
          type="button"
          onClick={() => setMes(sumarMeses(mes, 1))}
          disabled={!puedeAdelante}
          aria-label={t("siguiente")}
          className="grid size-11 place-items-center rounded-full hover:bg-arroz disabled:opacity-30"
        >
          ›
        </button>
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase text-niebla" aria-hidden>
        {cabecera.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <ul className="mt-1 grid grid-cols-7 gap-1" role="list">
        {celdas.map((fecha, i) => {
          if (!fecha) return <li key={`v${i}`} aria-hidden />;
          const estado = dias[`${comensales}:${fecha}`];
          const fuera = fecha < hoy || fecha > ultimo;
          const desactivado = fuera || estado === "cerrado" || estado === "completo" || !estado;
          const elegido = seleccion === fecha;
          const motivo = fuera ? "" : estado === "cerrado" ? t("cerrado") : estado === "completo" ? t("completo") : "";
          return (
            <li key={fecha}>
              <button
                type="button"
                disabled={desactivado}
                onClick={() => onElegir(fecha)}
                aria-pressed={elegido}
                aria-label={`${fmtLargo.format(new Date(`${fecha}T12:00:00Z`))}${motivo ? ` · ${motivo}` : ""}`}
                data-estado={estado ?? (fuera ? "fuera" : "cargando")}
                data-fecha={fecha}
                className={[
                  "relative grid aspect-square w-full min-h-11 place-items-center rounded-xl text-base tabular-nums transition-colors",
                  elegido
                    ? "bg-pimenton font-bold text-white"
                    : desactivado
                      ? "text-niebla/60"
                      : "bg-arroz font-semibold text-tinta hover:bg-azafran/30",
                  !fuera && (estado === "cerrado" || estado === "completo") ? "line-through decoration-2" : "",
                  !estado && !fuera ? "animate-pulse" : "",
                ].join(" ")}
              >
                {Number(fecha.slice(8, 10))}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-niebla">{cargando ? t("cargando") : t("leyenda")}</p>
    </div>
  );
}
