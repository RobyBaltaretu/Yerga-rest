"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ReservaPanel } from "@/lib/panel/estados";
import { cambiarEstado, modificarReserva } from "@/app/panel/acciones";
import { Boton } from "@/components/ui/Boton";
import { AreaTexto, Campo, Casilla } from "@/components/ui/Campo";
import { textoEstado } from "@/components/panel/servicio/TarjetaReserva";

const motivos: Record<string, string> = {
  fuera_de_horario: "fuera del horario de reservas",
  bloqueado: "día o turno bloqueado",
  tope_franja: "se supera el tope de la franja",
  sin_mesa: "no queda mesa libre a esa hora",
  mesa_ocupada: "la mesa está ocupada",
  transicion: "ese cambio de estado no es posible",
};

const transiciones: Record<string, { estado: Parameters<typeof cambiarEstado>[1]; texto: string }[]> = {
  pendiente: [{ estado: "confirmada", texto: "Aprobar" }, { estado: "cancelada", texto: "Rechazar" }],
  confirmada: [{ estado: "reconfirmada", texto: "Marcar confirmada por el cliente" }, { estado: "sentada", texto: "Sentar" }, { estado: "no_presentada", texto: "No presentada" }, { estado: "cancelada", texto: "Cancelar" }],
  reconfirmada: [{ estado: "sentada", texto: "Sentar" }, { estado: "no_presentada", texto: "No presentada" }, { estado: "cancelada", texto: "Cancelar" }],
  sentada: [{ estado: "finalizada", texto: "Liberar mesa" }, { estado: "confirmada", texto: "Deshacer sentar" }],
  finalizada: [{ estado: "sentada", texto: "Reabrir" }],
  cancelada: [{ estado: "confirmada", texto: "Recuperar" }],
  no_presentada: [{ estado: "sentada", texto: "Ha llegado" }, { estado: "confirmada", texto: "Recuperar" }],
};

export function EditarReserva({ reserva: r, fecha: f0, hora: h0 }: { reserva: ReservaPanel; fecha: string; hora: string }) {
  const router = useRouter();
  const [d, setD] = useState({
    fecha: f0,
    hora: h0,
    comensales: r.comensales,
    duracion_min: r.duracion_min,
    nombre: r.nombre,
    telefono: r.telefono ?? "",
    correo: r.correo ?? "",
    alergias: r.alergias ?? "",
    ocasion: r.ocasion ?? "",
    notas: r.notas ?? "",
    notas_internas: r.notas_internas ?? "",
    tronas: r.tronas,
    silla_ruedas: r.silla_ruedas,
  });
  const [msg, setMsg] = useState<{ ok: boolean; texto: string; forzar?: boolean } | null>(null);
  const [pendiente, startTransition] = useTransition();

  const guardar = (forzar = false) =>
    startTransition(async () => {
      const res = await modificarReserva(r.id, { ...d }, forzar);
      if (res.ok) {
        setMsg({ ok: true, texto: res.aviso === "sin_mesa" ? "Guardado (sin mesa asignada)" : "Guardado" });
        router.refresh();
      } else setMsg({ ok: false, texto: `No se ha guardado: ${motivos[res.motivo ?? ""] ?? res.motivo}`, forzar: res.puede_forzar });
    });

  const estado = (e: Parameters<typeof cambiarEstado>[1]) =>
    startTransition(async () => {
      const res = await cambiarEstado(r.id, e);
      setMsg(res.ok ? { ok: true, texto: `Estado: ${textoEstado[e]}` } : { ok: false, texto: motivos[res.motivo ?? ""] ?? "No se ha podido" });
      router.refresh();
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-tinta px-3 py-1.5 text-sm font-semibold text-arroz">{textoEstado[r.estado]}</span>
        {(transiciones[r.estado] ?? []).map((t) => (
          <button key={t.estado} type="button" disabled={pendiente} onClick={() => estado(t.estado)} className="min-h-11 rounded-full bg-white px-4 text-sm font-semibold ring-1 ring-tinta/15 hover:ring-tinta/40">
            {t.texto}
          </button>
        ))}
      </div>

      <form
        className="space-y-5 rounded-3xl bg-white p-5 ring-1 ring-tinta/10"
        onSubmit={(e) => {
          e.preventDefault();
          guardar();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-4">
          <Campo id="e-fecha" type="date" etiqueta="Día" value={d.fecha} onChange={(e) => setD({ ...d, fecha: e.target.value })} />
          <Campo id="e-hora" type="time" step={300} etiqueta="Hora" value={d.hora} onChange={(e) => setD({ ...d, hora: e.target.value })} />
          <Campo id="e-n" type="number" min={1} max={200} etiqueta="Personas" value={d.comensales} onChange={(e) => setD({ ...d, comensales: Number(e.target.value) })} />
          <Campo id="e-dur" type="number" min={15} step={15} etiqueta="Duración (min)" value={d.duracion_min} onChange={(e) => setD({ ...d, duracion_min: Number(e.target.value) })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo id="e-nombre" etiqueta="Nombre" value={d.nombre} onChange={(e) => setD({ ...d, nombre: e.target.value })} />
          <Campo id="e-tel" type="tel" etiqueta="Teléfono" value={d.telefono} onChange={(e) => setD({ ...d, telefono: e.target.value })} />
          <Campo id="e-correo" type="email" etiqueta="Correo" value={d.correo} onChange={(e) => setD({ ...d, correo: e.target.value })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo id="e-alergias" etiqueta="Alergias" value={d.alergias} onChange={(e) => setD({ ...d, alergias: e.target.value })} />
          <Campo id="e-ocasion" etiqueta="Ocasión" value={d.ocasion} onChange={(e) => setD({ ...d, ocasion: e.target.value })} />
          <Campo id="e-tronas" type="number" min={0} max={6} etiqueta="Tronas" value={d.tronas} onChange={(e) => setD({ ...d, tronas: Number(e.target.value) })} />
        </div>
        <Casilla id="e-silla" etiqueta="Silla de ruedas" checked={d.silla_ruedas} onChange={(e) => setD({ ...d, silla_ruedas: e.target.checked })} />
        <AreaTexto id="e-notas" etiqueta="Notas del cliente" value={d.notas} onChange={(e) => setD({ ...d, notas: e.target.value })} />
        <AreaTexto id="e-internas" etiqueta="Notas internas (no las ve el cliente)" value={d.notas_internas} onChange={(e) => setD({ ...d, notas_internas: e.target.value })} />
        {msg ? (
          <div className={`flex flex-wrap items-center justify-between gap-2 rounded-xl p-3 text-sm font-semibold ${msg.ok ? "bg-huerta-claro text-huerta" : "bg-pimenton/15 text-pimenton-oscuro"}`} role="status">
            {msg.texto}
            {msg.forzar ? <Boton type="button" onClick={() => guardar(true)}>Forzar (queda registrado)</Boton> : null}
          </div>
        ) : null}
        <Boton type="submit" cargando={pendiente}>Guardar cambios</Boton>
      </form>
      <p className="text-sm text-niebla">Para cambiar la mesa, usa el mapa de «Servicio de hoy»: arrastra la reserva o tócala y toca la mesa.</p>
    </div>
  );
}
