"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Cabecera } from "@/components/panel/Cabecera";
import { aReservaPanel, reservasDelDia, salaDelTurno, turnosDelDia } from "@/lib/panel/datos";
import { ACTIVAS, hora, type ReservaPanel } from "@/lib/panel/estados";
import { ConDatos, esFecha, useDatos, useParam, type Db } from "@/components/panel/DatosPanel";
import { fechaLocal, formatFecha, sumarDias } from "@/lib/format";
import { textoEstado } from "@/components/panel/servicio/TarjetaReserva";

const colorBarra: Record<string, string> = {
  pendiente: "bg-azafran/60",
  confirmada: "bg-[#f6dfb0] ring-1 ring-azafran-oscuro",
  reconfirmada: "bg-huerta-claro ring-1 ring-huerta",
  sentada: "bg-pimenton text-white",
  finalizada: "bg-arroz-2 text-niebla",
};

type Seccion = { turno: string; sala: Awaited<ReturnType<typeof salaDelTurno>>; desde: number; hasta: number };

async function cargarReservas(db: Db, fecha: string, q: string): Promise<ReservaPanel[]> {
  if (!q) return reservasDelDia(db, fecha);
  const patron = `%${q.replace(/[%_,()]/g, "")}%`;
  const { data, error } = await db
    .from("reserva")
    .select("*, asignacion(mesa_id, activa, mesa(nombre)), encargo_arroz(raciones, plato(nombre))")
    .or(`nombre.ilike.${patron},telefono.ilike.${patron},correo.ilike.${patron}`)
    .order("inicio", { ascending: false })
    .limit(60);
  if (error) throw new Error(error.message);
  return (data ?? []).map((f) => aReservaPanel(f as never, new Map()));
}

/** Para la línea de tiempo: mesas de cada turno del día y su franja horaria. */
async function cargarSecciones(db: Db, fecha: string): Promise<Seccion[]> {
  const turnos = await turnosDelDia(db, fecha);
  return Promise.all(
    turnos.map(async (t) => {
      const [sala, ini, fin] = await Promise.all([
        salaDelTurno(db, fecha, t.nombre),
        db.rpc("hora_local", { p_fecha: fecha, p_hora: t.inicio }),
        db.rpc("hora_local", { p_fecha: fecha, p_hora: t.fin }),
      ]);
      return { turno: t.nombre, sala, desde: Date.parse(ini.data!), hasta: Date.parse(fin.data!) + 90 * 60_000 };
    }),
  );
}

export function VistaReservas() {
  const fecha = useParam("fecha", esFecha) ?? fechaLocal();
  const vista = useParam("vista") === "linea" ? "linea" : "lista";
  const q = (useParam("q") ?? "").trim().slice(0, 60);
  const estado = useDatos(
    async (db) => {
      const [reservas, secciones] = await Promise.all([cargarReservas(db, fecha, q), vista === "linea" && !q ? cargarSecciones(db, fecha) : Promise.resolve([])]);
      return { reservas, secciones };
    },
    [fecha, vista, q],
  );

  const enlace = (extra: Record<string, string>) => `/panel/reservas?${new URLSearchParams({ fecha, vista, ...extra })}`;

  return (
    <main className="pb-16">
      <Cabecera
        titulo="Reservas"
        descripcion={q ? `Resultados para «${q}»` : <span className="capitalize">{formatFecha(`${fecha}T12:00:00Z`, "es")}</span>}
        acciones={
          <Link href={`/panel/reservas/nueva?fecha=${fecha}`} className="inline-flex min-h-11 items-center gap-1 rounded-full bg-pimenton px-4 font-semibold text-white">
            <Plus className="size-4" aria-hidden /> Nueva reserva
          </Link>
        }
      />
      <div className="flex flex-wrap items-center gap-2 px-4 py-4 sm:px-6">
        <Link href={enlace({ fecha: sumarDias(fecha, -1) })} className="grid size-11 place-items-center rounded-full bg-white ring-1 ring-tinta/15" aria-label="Día anterior">‹</Link>
        <form action="/panel/reservas" className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="vista" value={vista} />
          <label htmlFor="fecha" className="sr-only">Fecha</label>
          <input id="fecha" type="date" name="fecha" defaultValue={fecha} key={`f${fecha}`} className="min-h-11 rounded-full border-0 bg-white px-3 ring-1 ring-tinta/15" />
          <label htmlFor="q" className="sr-only">Buscar</label>
          <input id="q" type="search" name="q" defaultValue={q} key={`q${q}`} placeholder="Buscar nombre, teléfono o correo" className="min-h-11 w-64 rounded-full border-0 bg-white px-4 ring-1 ring-tinta/15" />
          <button className="min-h-11 rounded-full bg-tinta px-4 font-semibold text-arroz">Ver</button>
        </form>
        <Link href={enlace({ fecha: sumarDias(fecha, 1) })} className="grid size-11 place-items-center rounded-full bg-white ring-1 ring-tinta/15" aria-label="Día siguiente">›</Link>
        {!q ? (
          <div className="ml-auto flex gap-1" role="tablist" aria-label="Vista">
            <Link role="tab" aria-selected={vista === "lista"} href={enlace({ vista: "lista" })} className={`inline-flex min-h-11 items-center rounded-full px-4 font-semibold ${vista === "lista" ? "bg-tinta text-arroz" : "bg-white ring-1 ring-tinta/15"}`}>Lista</Link>
            <Link role="tab" aria-selected={vista === "linea"} href={enlace({ vista: "linea" })} className={`inline-flex min-h-11 items-center rounded-full px-4 font-semibold ${vista === "linea" ? "bg-tinta text-arroz" : "bg-white ring-1 ring-tinta/15"}`}>Línea de tiempo</Link>
          </div>
        ) : null}
      </div>

      <ConDatos estado={estado}>
        {({ reservas, secciones }) => (vista === "linea" && !q ? <LineaTiempo secciones={secciones} reservas={reservas} /> : <Lista reservas={reservas} conFecha={Boolean(q)} />)}
      </ConDatos>
    </main>
  );
}

function Lista({ reservas, conFecha }: { reservas: ReservaPanel[]; conFecha: boolean }) {
  if (!reservas.length) return <p className="px-6 py-10 text-center text-niebla">No hay reservas.</p>;
  const fmt = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", dateStyle: "medium" });
  return (
    <div className="overflow-x-auto px-4 sm:px-6">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="text-xs uppercase tracking-wider text-niebla">
          <tr>
            {conFecha ? <th className="py-2 pr-3">Fecha</th> : null}
            <th className="py-2 pr-3">Hora</th>
            <th className="py-2 pr-3">Nombre</th>
            <th className="py-2 pr-3">Pax</th>
            <th className="py-2 pr-3">Mesa</th>
            <th className="py-2 pr-3">Estado</th>
            <th className="py-2 pr-3">Origen</th>
            <th className="py-2">Notas</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-tinta/10">
          {reservas.map((r) => (
            <tr key={r.id} className={`align-top ${ACTIVAS.includes(r.estado) ? "" : "text-niebla"}`}>
              {conFecha ? <td className="py-2 pr-3 whitespace-nowrap">{fmt.format(new Date(r.inicio))}</td> : null}
              <td className="py-2 pr-3 font-semibold tabular-nums">{hora(r.inicio)}</td>
              <td className="py-2 pr-3">
                <Link href={`/panel/reservas/${r.id}`} className="font-semibold underline-offset-4 hover:underline">{r.nombre}</Link>
                {r.telefono ? <div className="text-xs text-niebla">{r.telefono}</div> : null}
              </td>
              <td className="py-2 pr-3 tabular-nums">{r.comensales}</td>
              <td className="py-2 pr-3">{r.mesas.map((m) => m.nombre).join("+") || <span className="font-semibold text-pimenton-oscuro">Sin mesa</span>}</td>
              <td className="py-2 pr-3">{textoEstado[r.estado]}{r.sin_confirmar ? " · sin confirmar" : ""}</td>
              <td className="py-2 pr-3 capitalize">{r.origen === "puerta" ? "sin reserva" : r.origen}</td>
              <td className="py-2 text-xs">
                {[r.alergias && `⚕ ${r.alergias}`, r.ocasion, r.arroces.map((a) => `${a.nombre} (${a.raciones})`).join(", "), r.notas].filter(Boolean).join(" · ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Una fila por mesa y una barra por reserva: se ven huecos y solapes de un vistazo. */
function LineaTiempo({ secciones, reservas }: { secciones: Seccion[]; reservas: ReservaPanel[] }) {
  if (!secciones.length) return <p className="px-6 py-10 text-center text-niebla">Cerrado este día.</p>;
  const activas = reservas.filter((r) => ACTIVAS.includes(r.estado) || r.estado === "finalizada");

  return (
    <div className="space-y-10 px-4 sm:px-6">
      {secciones.map(({ turno, sala, desde, hasta }) => {
        const total = hasta - desde;
        const marcas: number[] = [];
        for (let m = desde; m <= hasta; m += 30 * 60_000) marcas.push(m);
        const delTurno = activas.filter((r) => (r.turno_nombre ?? turno) === turno);
        const sinMesa = delTurno.filter((r) => !r.mesas.length);
        return (
          <section key={turno} aria-label={`Línea de tiempo ${turno}`}>
            <h2 className="mb-2 font-display text-2xl capitalize">{turno}</h2>
            <div className="overflow-x-auto">
              <div className="min-w-[760px]">
                <div className="relative ml-16 h-6 text-xs text-niebla">
                  {marcas.map((m) => (
                    <span key={m} className="absolute -translate-x-1/2 tabular-nums" style={{ left: `${((m - desde) / total) * 100}%` }}>{hora(m)}</span>
                  ))}
                </div>
                {sala.zonas.map((z) => (
                  <div key={z.id} className="mb-3">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-niebla">{z.nombre}</p>
                    {sala.mesas
                      .filter((m) => m.zona_id === z.id)
                      .map((m) => {
                        const barras = delTurno.filter((r) => r.mesas.some((x) => x.id === m.id));
                        return (
                          <div key={m.id} className="flex items-center border-t border-tinta/5">
                            <span className="w-16 shrink-0 py-1 text-sm font-semibold">{m.nombre} <span className="text-xs font-normal text-niebla">{m.capacidad_max}</span></span>
                            <div className="relative h-9 flex-1 bg-[repeating-linear-gradient(90deg,transparent,transparent_calc(100%/12-1px),rgba(43,31,23,.06)_calc(100%/12-1px),rgba(43,31,23,.06)_calc(100%/12))]">
                              {barras.map((r) => {
                                const izq = Math.max(0, (Date.parse(r.inicio) - desde) / total);
                                const ancho = Math.min(1 - izq, (Date.parse(r.fin) - Math.max(desde, Date.parse(r.inicio))) / total);
                                return (
                                  <Link
                                    key={r.id}
                                    href={`/panel/reservas/${r.id}`}
                                    title={`${hora(r.inicio)}–${hora(r.fin)} ${r.nombre} (${r.comensales})`}
                                    className={`absolute top-1 bottom-1 overflow-hidden rounded-lg px-2 text-xs font-semibold leading-7 whitespace-nowrap ${colorBarra[r.estado] ?? "bg-arroz-2"}`}
                                    style={{ left: `${izq * 100}%`, width: `${ancho * 100}%` }}
                                  >
                                    {hora(r.inicio)} {r.nombre} · {r.comensales}
                                  </Link>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ))}
                {sinMesa.length ? (
                  <p className="mt-2 text-sm font-semibold text-pimenton-oscuro">
                    Sin mesa: {sinMesa.map((r) => `${hora(r.inicio)} ${r.nombre} (${r.comensales})`).join(" · ")}
                  </p>
                ) : null}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
