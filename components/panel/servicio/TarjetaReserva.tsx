"use client";

import Link from "next/link";
import { Accessibility, Baby, CakeSlice, ChefHat, GripVertical, PhoneCall, ShieldAlert, TriangleAlert } from "lucide-react";
import type { ReservaPanel } from "@/lib/panel/estados";
import { hora } from "@/lib/panel/estados";

export const textoEstado: Record<string, string> = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  reconfirmada: "Reconfirmada",
  sentada: "Sentada",
  finalizada: "Finalizada",
  cancelada: "Cancelada",
  no_presentada: "No presentada",
};

const colorEstado: Record<string, string> = {
  pendiente: "bg-azafran/30 text-brasa",
  confirmada: "bg-white text-tinta ring-1 ring-tinta/15",
  reconfirmada: "bg-huerta-claro text-huerta",
  sentada: "bg-pimenton text-white",
  finalizada: "bg-arroz-2 text-niebla",
  cancelada: "bg-arroz-2 text-niebla line-through",
  no_presentada: "bg-brasa text-arroz",
};

const origenes: Record<string, string> = { web: "Web", telefono: "Teléfono", puerta: "Sin reserva" };

type Props = {
  r: ReservaPanel;
  ahora: number;
  cortesiaMin: number;
  seleccionada: boolean;
  soloLectura: boolean;
  onAccion: (estado: "sentada" | "finalizada" | "no_presentada" | "cancelada" | "confirmada") => void;
  onSeleccionar: () => void;
  onEmpezarArrastre: (clientX: number, clientY: number) => void;
};

export function TarjetaReserva({ r, ahora, cortesiaMin, seleccionada, soloLectura, onAccion, onSeleccionar, onEmpezarArrastre }: Props) {
  const retraso = Math.round((ahora - Date.parse(r.inicio)) / 60_000);
  const esperando = r.estado === "confirmada" || r.estado === "reconfirmada";
  const tarde = esperando && retraso > cortesiaMin;
  const destacada = Boolean(r.alergias) || r.silla_ruedas;
  const inactiva = ["finalizada", "cancelada", "no_presentada"].includes(r.estado);

  return (
    <li
      className={`rounded-2xl bg-white p-3 ring-1 transition ${seleccionada ? "ring-4 ring-azafran-oscuro" : destacada ? "ring-2 ring-pimenton/60" : "ring-tinta/10"} ${inactiva ? "opacity-60" : ""}`}
      data-reserva={r.id}
    >
      <div className="flex items-start gap-2">
        {!inactiva && !soloLectura ? (
          <button
            type="button"
            className="-ml-1 grid h-11 w-8 shrink-0 cursor-grab touch-none place-items-center rounded-lg text-niebla hover:bg-arroz active:cursor-grabbing"
            aria-label={`Arrastrar ${r.nombre} a una mesa`}
            onPointerDown={(e) => {
              e.preventDefault();
              onEmpezarArrastre(e.clientX, e.clientY);
            }}
          >
            <GripVertical className="size-5" aria-hidden />
          </button>
        ) : null}
        <button type="button" onClick={onSeleccionar} className="min-w-0 flex-1 text-left" aria-pressed={seleccionada}>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-display text-xl tabular-nums">{hora(r.inicio)}</span>
            <span className="truncate text-base font-semibold">{r.nombre}</span>
            <span className="rounded-full bg-arroz px-2 py-0.5 text-sm font-bold tabular-nums">{r.comensales} pax</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${colorEstado[r.estado]}`}>{textoEstado[r.estado]}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-niebla">
            <span className={r.mesas.length ? "font-semibold text-tinta" : "font-semibold text-pimenton-oscuro"}>
              {r.mesas.length ? r.mesas.map((m) => m.nombre).join("+") : "Sin mesa"}
            </span>
            <span>{origenes[r.origen]}</span>
            {r.forzada ? <span className="font-semibold text-pimenton-oscuro">Forzada</span> : null}
            {r.plantones ? <span className="font-semibold text-pimenton-oscuro">{r.plantones} plantón{r.plantones > 1 ? "es" : ""}</span> : null}
          </div>
          {r.alergias ? (
            <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-pimenton-oscuro">
              <ShieldAlert className="size-4 shrink-0" aria-hidden /> Alergias: {r.alergias}
            </p>
          ) : null}
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm">
            {r.arroces.length ? (
              <span className="inline-flex items-center gap-1"><ChefHat className="size-4" aria-hidden /> {r.arroces.map((a) => `${a.nombre} (${a.raciones})`).join(", ")}</span>
            ) : null}
            {r.ocasion ? <span className="inline-flex items-center gap-1"><CakeSlice className="size-4" aria-hidden /> {r.ocasion}</span> : null}
            {r.tronas ? <span className="inline-flex items-center gap-1"><Baby className="size-4" aria-hidden /> {r.tronas} trona{r.tronas > 1 ? "s" : ""}</span> : null}
            {r.silla_ruedas ? <span className="inline-flex items-center gap-1 font-semibold"><Accessibility className="size-4" aria-hidden /> Silla de ruedas</span> : null}
            {r.sin_confirmar && esperando ? <span className="inline-flex items-center gap-1 font-semibold text-azafran-oscuro"><PhoneCall className="size-4" aria-hidden /> Sin confirmar: llamar</span> : null}
          </div>
          {r.notas ? <p className="mt-1 text-sm italic text-niebla">“{r.notas}”</p> : null}
          {tarde ? (
            <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-pimenton-oscuro">
              <TriangleAlert className="size-4" aria-hidden /> {retraso} min tarde: llamar ({r.telefono ?? "sin teléfono"}) o liberar
            </p>
          ) : null}
        </button>
      </div>

      {!soloLectura && !inactiva ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {r.estado === "pendiente" ? <Accion onClick={() => onAccion("confirmada")} principal>Aprobar</Accion> : null}
          {esperando ? <Accion onClick={() => onAccion("sentada")} principal>Sentar</Accion> : null}
          {r.estado === "sentada" ? <Accion onClick={() => onAccion("finalizada")} principal>Liberar</Accion> : null}
          {esperando && retraso > cortesiaMin ? <Accion onClick={() => onAccion("no_presentada")}>No presentada</Accion> : null}
          {r.estado !== "sentada" ? <Accion onClick={() => onAccion("cancelada")}>Cancelar</Accion> : null}
          <Link href={`/panel/reservas/${r.id}`} className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold underline underline-offset-4">Editar</Link>
        </div>
      ) : null}
      {!soloLectura && (r.estado === "finalizada" || r.estado === "no_presentada" || r.estado === "cancelada") ? (
        <div className="mt-2">
          <Accion onClick={() => onAccion(r.estado === "finalizada" ? "sentada" : "confirmada")}>Deshacer</Accion>
        </div>
      ) : null}
    </li>
  );
}

function Accion({ children, onClick, principal }: { children: React.ReactNode; onClick: () => void; principal?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 rounded-full px-4 text-sm font-semibold transition ${principal ? "bg-tinta text-arroz hover:bg-brasa" : "bg-arroz text-tinta ring-1 ring-tinta/10 hover:ring-tinta/30"}`}
    >
      {children}
    </button>
  );
}
