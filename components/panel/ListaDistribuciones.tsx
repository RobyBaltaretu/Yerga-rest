"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { anadirProgramacion, borrarDistribucion, crearDistribucion, hacerPredeterminada, quitarProgramacion } from "@/app/panel/mapa-acciones";
import { Boton } from "@/components/ui/Boton";
import { useRecargar } from "@/components/panel/DatosPanel";

export type DistribucionFila = {
  id: string;
  zona_id: string;
  nombre: string;
  estado: "borrador" | "publicada";
  predeterminada: boolean;
  borrador_pendiente: boolean;
  publicada_en: string | null;
  programacion_distribucion: { id: string; fecha: string | null; dia_semana: number | null; turno_nombre: string | null }[];
  mesa: { count: number }[];
};

const dias = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

function describir(r: DistribucionFila["programacion_distribucion"][number]) {
  return [r.fecha ? `el ${r.fecha}` : null, r.dia_semana != null ? `los ${dias[r.dia_semana]}` : null, r.turno_nombre ? `en ${r.turno_nombre}` : null].filter(Boolean).join(" ");
}

export function ListaDistribuciones({ zonas, distribuciones }: { zonas: { id: string; nombre: string }[]; distribuciones: DistribucionFila[] }) {
  const router = useRouter();
  const recargar = useRecargar();
  const [pendiente, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [nueva, setNueva] = useState<{ zona: string; nombre: string; copia: string } | null>(null);
  const [regla, setRegla] = useState<{ dist: string; tipo: "dia" | "fecha"; dia: number; fecha: string; turno: string } | null>(null);

  const hacer = (fn: () => Promise<{ ok: boolean; motivo?: string }>, ok?: string) =>
    startTransition(async () => {
      const r = await fn();
      setMsg(r.ok ? (ok ?? null) : (r.motivo ?? "No se ha podido"));
      recargar();
    });

  return (
    <div className="space-y-8 px-4 py-6 sm:px-6">
      {msg ? <p className="rounded-xl bg-azafran/20 px-3 py-2 text-sm font-semibold" role="status">{msg}</p> : null}
      {zonas.map((z) => (
        <section key={z.id} aria-labelledby={`z-${z.id}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id={`z-${z.id}`} className="font-display text-2xl">{z.nombre}</h2>
            <Boton variante="secundario" onClick={() => setNueva({ zona: z.id, nombre: "", copia: distribuciones.find((d) => d.zona_id === z.id && d.predeterminada)?.id ?? "" })}>Nueva distribución</Boton>
          </div>
          <ul className="mt-3 grid gap-3 md:grid-cols-2">
            {distribuciones
              .filter((d) => d.zona_id === z.id)
              .map((d) => (
                <li key={d.id} className="rounded-2xl bg-white p-4 ring-1 ring-tinta/10">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-display text-xl">{d.nombre}</p>
                      <p className="text-sm text-niebla">
                        {d.estado === "publicada" ? "Publicada" : "Borrador sin publicar"}
                        {d.estado === "publicada" && d.borrador_pendiente ? " · con cambios sin publicar" : ""}
                        {d.predeterminada ? " · predeterminada" : ""} · {d.mesa?.[0]?.count ?? 0} mesas
                      </p>
                    </div>
                    <Link href={`/panel/mapa/${d.id}`} className="inline-flex min-h-11 items-center rounded-full bg-tinta px-4 font-semibold text-arroz">Editar</Link>
                  </div>
                  <div className="mt-3 text-sm">
                    <p className="font-semibold">Se usa:</p>
                    <ul className="mt-1 space-y-1">
                      {d.predeterminada ? <li>Siempre que no haya otra programada</li> : null}
                      {d.programacion_distribucion.map((r) => (
                        <li key={r.id} className="flex items-center justify-between gap-2">
                          <span>{describir(r)}</span>
                          <button type="button" className="min-h-9 px-2 text-xs underline" onClick={() => hacer(() => quitarProgramacion(r.id))}>Quitar</button>
                        </li>
                      ))}
                      {!d.predeterminada && !d.programacion_distribucion.length ? <li className="text-niebla">Nunca (sin programar)</li> : null}
                    </ul>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" className="min-h-10 rounded-full bg-arroz px-3 text-sm font-semibold ring-1 ring-tinta/10" onClick={() => setRegla({ dist: d.id, tipo: "dia", dia: 6, fecha: "", turno: "" })}>Programar</button>
                    {!d.predeterminada && d.estado === "publicada" ? (
                      <button type="button" className="min-h-10 rounded-full bg-arroz px-3 text-sm font-semibold ring-1 ring-tinta/10" onClick={() => hacer(() => hacerPredeterminada(d.id), `${d.nombre} es ahora la predeterminada`)}>Hacer predeterminada</button>
                    ) : null}
                    {!d.predeterminada ? (
                      <button type="button" className="min-h-10 rounded-full px-3 text-sm underline" onClick={() => confirm(`¿Borrar «${d.nombre}»?`) && hacer(() => borrarDistribucion(d.id), "Borrada")}>Borrar</button>
                    ) : null}
                  </div>
                  {regla?.dist === d.id ? (
                    <form
                      className="mt-3 space-y-2 rounded-xl bg-arroz p-3 text-sm"
                      onSubmit={(e) => {
                        e.preventDefault();
                        hacer(() =>
                          anadirProgramacion(d.id, {
                            ...(regla.tipo === "dia" ? { dia_semana: regla.dia } : { fecha: regla.fecha }),
                            ...(regla.turno ? { turno_nombre: regla.turno } : {}),
                          }),
                        );
                        setRegla(null);
                      }}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <select aria-label="Tipo de regla" value={regla.tipo} onChange={(e) => setRegla({ ...regla, tipo: e.target.value as "dia" | "fecha" })} className="min-h-10 rounded-lg border-0 bg-white px-2 ring-1 ring-tinta/15">
                          <option value="dia">Día de la semana</option>
                          <option value="fecha">Fecha concreta</option>
                        </select>
                        {regla.tipo === "dia" ? (
                          <select aria-label="Día" value={regla.dia} onChange={(e) => setRegla({ ...regla, dia: Number(e.target.value) })} className="min-h-10 rounded-lg border-0 bg-white px-2 ring-1 ring-tinta/15">
                            {dias.map((n, i) => <option key={i} value={i}>{n}</option>)}
                          </select>
                        ) : (
                          <input aria-label="Fecha" type="date" required value={regla.fecha} onChange={(e) => setRegla({ ...regla, fecha: e.target.value })} className="min-h-10 rounded-lg border-0 bg-white px-2 ring-1 ring-tinta/15" />
                        )}
                        <select aria-label="Turno" value={regla.turno} onChange={(e) => setRegla({ ...regla, turno: e.target.value })} className="min-h-10 rounded-lg border-0 bg-white px-2 ring-1 ring-tinta/15">
                          <option value="">Todo el día</option>
                          <option value="comida">Comida</option>
                          <option value="cena">Cena</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <Boton type="submit" cargando={pendiente}>Añadir</Boton>
                        <Boton type="button" variante="fantasma" onClick={() => setRegla(null)}>Cancelar</Boton>
                      </div>
                      <p className="text-xs text-niebla">Prioridad: fecha concreta &gt; día de la semana &gt; turno &gt; predeterminada.</p>
                    </form>
                  ) : null}
                </li>
              ))}
          </ul>
          {nueva?.zona === z.id ? (
            <form
              className="mt-3 flex flex-wrap items-end gap-2 rounded-2xl bg-white p-4 ring-1 ring-tinta/10"
              onSubmit={(e) => {
                e.preventDefault();
                startTransition(async () => {
                  const r = await crearDistribucion(z.id, nueva.nombre, nueva.copia || undefined);
                  if (r.ok) router.push(`/panel/mapa/${r.id}`);
                  else setMsg(r.motivo ?? "No se ha podido crear");
                });
              }}
            >
              <label className="text-sm font-semibold">
                Nombre
                <input required value={nueva.nombre} onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })} placeholder="Fin de semana, Terraza de verano, Banquete…" className="mt-1 block min-h-11 w-72 rounded-xl border-0 bg-arroz px-3 ring-1 ring-tinta/15" />
              </label>
              <label className="text-sm font-semibold">
                Partir de
                <select value={nueva.copia} onChange={(e) => setNueva({ ...nueva, copia: e.target.value })} className="mt-1 block min-h-11 rounded-xl border-0 bg-arroz px-3 ring-1 ring-tinta/15">
                  <option value="">Plano vacío</option>
                  {distribuciones.filter((d) => d.zona_id === z.id).map((d) => <option key={d.id} value={d.id}>Copia de {d.nombre}</option>)}
                </select>
              </label>
              <Boton type="submit" cargando={pendiente}>Crear y editar</Boton>
              <Boton type="button" variante="fantasma" onClick={() => setNueva(null)}>Cancelar</Boton>
            </form>
          ) : null}
        </section>
      ))}
    </div>
  );
}
