"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  cancelarReserva,
  cargarHoras,
  modificarReserva,
  reconfirmarReserva,
  retener,
  type Alternativa,
  type HoraDisponible,
} from "@/app/[locale]/reservar/acciones";
import { capitalizar, formatFecha, formatHora } from "@/lib/format";
import { tr } from "@/lib/i18n";
import { Boton } from "@/components/web/movimiento";
import { Calendario } from "./Calendario";

export type ReservaCliente = {
  id: string;
  codigo: string;
  nombre: string;
  inicio: string;
  fin: string;
  comensales: number;
  estado: string;
  zona: string | null;
  reconfirmada: boolean;
  puede_cambiar: boolean;
  arroces: { plato_id: string; raciones: number; nombre: Record<string, string> }[];
};

/** Página personal del cliente: ver, confirmar, cambiar o cancelar su reserva. */
export function GestionReserva({
  locale,
  reserva,
  telefono,
  hoy,
  maxDias,
  maxOnline,
  destacarConfirmar,
}: {
  locale: string;
  reserva: ReservaCliente;
  telefono: string;
  hoy: string;
  maxDias: number;
  maxOnline: number;
  destacarConfirmar: boolean;
}) {
  const t = useTranslations("reserva");
  const router = useRouter();
  const [modo, setModo] = useState<"ver" | "cancelar" | "cambiar">("ver");
  const [aviso, setAviso] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();
  const activa = ["pendiente", "confirmada", "reconfirmada"].includes(reserva.estado);

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-3xl bg-superficie p-6 shadow-tarjeta">
        <p className="text-[13px] font-medium text-acento">
          {t(`gestion.estado.${reserva.estado}` as "gestion.estado.confirmada")}
        </p>
        <p className="mt-2 text-[1.75rem] font-semibold leading-tight tracking-[-0.03em]">{capitalizar(formatFecha(reserva.inicio, locale))}</p>
        <p className="mt-1 text-2xl font-medium tabular-nums tracking-[-0.02em]">{formatHora(reserva.inicio)}</p>
        <p className="mt-2 text-niebla">
          {reserva.nombre} · {t("resumen.comensales", { n: reserva.comensales })}
          {reserva.zona ? ` · ${reserva.zona}` : ""}
        </p>
        {reserva.arroces.length ? (
          <p className="mt-2 text-sm">
            {t("resumen.arroz")}: {reserva.arroces.map((a) => `${tr(a.nombre, locale)} (${a.raciones})`).join(", ")}
          </p>
        ) : null}
        <a href={`/api/reserva/ics?codigo=${encodeURIComponent(reserva.codigo)}`} className="enlace mt-4 inline-block text-[14px] font-medium">
          {t("ok.calendario")}
        </a>
      </div>

      {aviso ? (
        <p className="rounded-2xl bg-huerta-claro p-4 font-medium" role="status">{aviso}</p>
      ) : null}

      {activa && !reserva.puede_cambiar ? (
        <p className="rounded-2xl bg-arroz-2 p-4">{t("gestion.fueraPlazo", { horas: 3, telefono })}</p>
      ) : null}

      {activa && reserva.puede_cambiar && modo === "ver" ? (
        <div className="flex flex-col gap-3">
          {reserva.estado === "confirmada" && !reserva.reconfirmada ? (
            <Boton
              cargando={pendiente}
              className={destacarConfirmar ? "ring-2 ring-acento ring-offset-2 ring-offset-fondo" : ""}
              onClick={() =>
                startTransition(async () => {
                  const r = await reconfirmarReserva(reserva.codigo);
                  if (r.ok) {
                    setAviso(t("gestion.reconfirmada"));
                    router.refresh();
                  }
                })
              }
            >
              {t("gestion.confirmar")}
            </Boton>
          ) : null}
          <Boton variante="secundario" onClick={() => setModo("cambiar")}>{t("gestion.cambiar")}</Boton>
          <Boton variante="peligro" onClick={() => setModo("cancelar")}>{t("gestion.cancelar")}</Boton>
        </div>
      ) : null}

      {modo === "cancelar" ? (
        <div className="rounded-3xl border border-peligro/25 bg-superficie p-5 shadow-elevada" role="alertdialog" aria-label={t("gestion.cancelar")}>
          <p>{t("gestion.cancelarSeguro")}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Boton
              cargando={pendiente}
              onClick={() =>
                startTransition(async () => {
                  const r = await cancelarReserva(reserva.codigo);
                  setModo("ver");
                  if (r.ok) {
                    setAviso(t("gestion.cancelada"));
                    router.refresh();
                  } else setAviso(t("gestion.fueraPlazo", { horas: 3, telefono }));
                })
              }
            >
              {t("gestion.siCancelar")}
            </Boton>
            <Boton variante="secundario" onClick={() => setModo("ver")}>{t("gestion.noCancelar")}</Boton>
          </div>
        </div>
      ) : null}

      {modo === "cambiar" ? (
        <Cambiar
          locale={locale}
          reserva={reserva}
          hoy={hoy}
          maxDias={maxDias}
          maxOnline={maxOnline}
          onCancelar={() => setModo("ver")}
          onHecho={() => {
            setModo("ver");
            setAviso(t("gestion.cambiada"));
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function Cambiar({
  locale,
  reserva,
  hoy,
  maxDias,
  maxOnline,
  onCancelar,
  onHecho,
}: {
  locale: string;
  reserva: ReservaCliente;
  hoy: string;
  maxDias: number;
  maxOnline: number;
  onCancelar: () => void;
  onHecho: () => void;
}) {
  const t = useTranslations("reserva");
  const [n, setN] = useState(reserva.comensales);
  const [fecha, setFecha] = useState<string | null>(null);
  const [horas, setHoras] = useState<HoraDisponible[] | null>(null);
  const [alternativas, setAlternativas] = useState<Alternativa[] | null>(null);
  const [error, setError] = useState(false);
  const [pendiente, startTransition] = useTransition();

  const cargar = (f: string | null, personas: number) => {
    if (!f) return;
    setHoras(null);
    startTransition(async () => setHoras(await cargarHoras(f, personas, reserva.codigo)));
  };

  const elegir = (inicio: string) =>
    startTransition(async () => {
      setError(false);
      const ret = await retener({ inicio, comensales: n, codigo: reserva.codigo });
      if (!ret.ok) {
        setAlternativas(ret.alternativas ?? []);
        return;
      }
      const r = await modificarReserva({
        codigo: reserva.codigo,
        token: ret.token,
        inicio,
        comensales: n,
        // Los arroces encargados se mantienen si siguen cuadrando con las personas.
        arroces: reserva.arroces.reduce((s, a) => s + a.raciones, 0) <= n ? reserva.arroces.map(({ plato_id, raciones }) => ({ plato_id, raciones })) : [],
      });
      if (r.ok) onHecho();
      else if (r.alternativas) setAlternativas(r.alternativas);
      else setError(true);
    });

  return (
    <div className="space-y-6 rounded-3xl bg-superficie p-5 shadow-tarjeta">
      <div>
        <h2 className="text-xl font-semibold tracking-[-0.02em]">{t("comensales.titulo")}</h2>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {Array.from({ length: maxOnline }, (_, i) => i + 1).map((v) => (
            <button key={v} type="button" onClick={() => {
                setN(v);
                cargar(fecha, v);
              }} aria-pressed={n === v} className={`min-h-12 rounded-2xl font-medium tabular-nums transition-[background-color,transform] duration-150 active:scale-[0.96] ${n === v ? "bg-texto text-invertido" : "bg-sutil hover:bg-linea-fuerte"}`}>
              {v}
            </button>
          ))}
        </div>
      </div>
      <Calendario locale={locale} comensales={n} hoy={hoy} maxDias={maxDias} seleccion={fecha} onElegir={(f) => {
        setFecha(f);
        cargar(f, n);
      }} />
      {fecha ? (
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.02em]">{t("horas.titulo")}</h2>
          {!horas ? (
            <p className="mt-2 animate-pulse text-niebla">{t("calendario.cargando")}</p>
          ) : horas.filter((h) => h.disponible).length === 0 ? (
            <p className="mt-2">{t("horas.ninguna", { n })}</p>
          ) : (
            <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4" aria-label={t("horas.titulo")}>
              {horas
                .filter((h) => h.disponible)
                .map((h) => (
                  <li key={h.inicio}>
                    <button type="button" disabled={pendiente} onClick={() => elegir(h.inicio)} className="min-h-12 w-full rounded-2xl bg-sutil font-medium tabular-nums transition-[background-color,transform] duration-150 hover:bg-linea-fuerte active:scale-[0.96]">
                      {h.hora}
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </div>
      ) : null}
      {alternativas ? (
        <div className="rounded-2xl border border-peligro/25 bg-peligro/[0.06] p-4" role="alert">
          <p className="font-semibold">{t("fallo.ocupada")}</p>
          {alternativas.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {alternativas.map((a) => (
                <button key={a.inicio} type="button" onClick={() => elegir(a.inicio)} className="min-h-11 rounded-full bg-superficie px-4 font-medium tabular-nums shadow-tarjeta">
                  {a.hora}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {error ? <p className="font-medium text-peligro" role="alert">{t("errores.form")}</p> : null}
      <Boton variante="secundario" onClick={onCancelar}>{t("gestion.volver")}</Boton>
    </div>
  );
}
