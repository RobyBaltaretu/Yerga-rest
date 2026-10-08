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
import { Boton } from "@/components/ui/Boton";
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
      <div className="rounded-3xl bg-white p-6 ring-1 ring-tinta/10">
        <p className="text-sm font-semibold uppercase tracking-widest text-pimenton-oscuro">
          {t(`gestion.estado.${reserva.estado}` as "gestion.estado.confirmada")}
        </p>
        <p className="mt-2 font-display text-3xl">{capitalizar(formatFecha(reserva.inicio, locale))}</p>
        <p className="mt-1 text-2xl tabular-nums">{formatHora(reserva.inicio)}</p>
        <p className="mt-2 text-niebla">
          {reserva.nombre} · {t("resumen.comensales", { n: reserva.comensales })}
          {reserva.zona ? ` · ${reserva.zona}` : ""}
        </p>
        {reserva.arroces.length ? (
          <p className="mt-2 text-sm">
            {t("resumen.arroz")}: {reserva.arroces.map((a) => `${tr(a.nombre, locale)} (${a.raciones})`).join(", ")}
          </p>
        ) : null}
        <a href={`/api/reserva/ics?codigo=${encodeURIComponent(reserva.codigo)}`} className="mt-4 inline-block text-sm font-semibold underline underline-offset-4">
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
              className={destacarConfirmar ? "ring-4 ring-azafran" : ""}
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
        <div className="rounded-2xl bg-white p-5 ring-1 ring-pimenton/40" role="alertdialog" aria-label={t("gestion.cancelar")}>
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
    <div className="space-y-6 rounded-3xl bg-white p-5 ring-1 ring-tinta/10">
      <div>
        <h2 className="font-display text-2xl">{t("comensales.titulo")}</h2>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {Array.from({ length: maxOnline }, (_, i) => i + 1).map((v) => (
            <button key={v} type="button" onClick={() => {
                setN(v);
                cargar(fecha, v);
              }} aria-pressed={n === v} className={`min-h-12 rounded-xl font-semibold ring-1 ${n === v ? "bg-pimenton text-white ring-pimenton" : "bg-arroz ring-tinta/10"}`}>
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
          <h2 className="font-display text-2xl">{t("horas.titulo")}</h2>
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
                    <button type="button" disabled={pendiente} onClick={() => elegir(h.inicio)} className="min-h-12 w-full rounded-xl bg-arroz font-semibold tabular-nums ring-1 ring-tinta/10 hover:bg-azafran/30">
                      {h.hora}
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </div>
      ) : null}
      {alternativas ? (
        <div className="rounded-2xl bg-pimenton/10 p-4" role="alert">
          <p className="font-semibold">{t("fallo.ocupada")}</p>
          {alternativas.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {alternativas.map((a) => (
                <button key={a.inicio} type="button" onClick={() => elegir(a.inicio)} className="min-h-11 rounded-full bg-white px-4 font-semibold ring-1 ring-tinta/20">
                  {a.hora}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {error ? <p className="font-medium text-pimenton-oscuro" role="alert">{t("errores.form")}</p> : null}
      <Boton variante="secundario" onClick={onCancelar}>{t("gestion.volver")}</Boton>
    </div>
  );
}
