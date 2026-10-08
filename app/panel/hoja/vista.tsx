"use client";

import { ConDatos, esFecha, useDatos, useParam } from "@/components/panel/DatosPanel";
import { reservasDelDia, turnosDelDia } from "@/lib/panel/datos";
import { ACTIVAS, hora } from "@/lib/panel/estados";
import { fechaLocal, formatFecha } from "@/lib/format";
import { BotonImprimir } from "./BotonImprimir";

/** Hoja del turno imprimible: respaldo en papel si se cae la conexión. */
export function VistaHoja() {
  const fecha = useParam("fecha", esFecha) ?? fechaLocal();
  const turnoPedido = useParam("turno");
  const estado = useDatos(async (db) => {
    const turnos = await turnosDelDia(db, fecha);
    const turno = turnoPedido ?? turnos[0]?.nombre;
    const reservas = (await reservasDelDia(db, fecha)).filter((r) => (!turno || r.turno_nombre === turno) && ACTIVAS.includes(r.estado));
    return { turno, reservas, impresa: new Date().toISOString() };
  }, [fecha, turnoPedido]);
  return <ConDatos estado={estado}>{(d) => <Hoja fecha={fecha} {...d} />}</ConDatos>;
}

function Hoja({ fecha, turno, reservas, impresa }: { fecha: string; turno: string | undefined; reservas: Awaited<ReturnType<typeof reservasDelDia>>; impresa: string }) {
  const arroces = new Map<string, { raciones: number; horas: string[] }>();
  for (const r of reservas)
    for (const a of r.arroces) {
      const x = arroces.get(a.nombre) ?? { raciones: 0, horas: [] };
      x.raciones += a.raciones;
      x.horas.push(`${hora(r.inicio)} ${r.mesas.map((m) => m.nombre).join("+") || "s/m"} (${a.raciones})`);
      arroces.set(a.nombre, x);
    }
  const total = reservas.reduce((s, r) => s + r.comensales, 0);

  return (
    <main className="mx-auto max-w-4xl bg-white p-6 text-[13px] text-black print:p-0">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl">Hoja del turno · <span className="capitalize">{turno}</span></h1>
          <p className="capitalize">{formatFecha(`${fecha}T12:00:00Z`, "es")} · {reservas.length} reservas · {total} comensales</p>
          <p className="text-xs">Impresa a las {hora(impresa)}</p>
        </div>
        <BotonImprimir />
      </div>
      <table className="mt-4 w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-black text-left">
            <th className="py-1 pr-2">Hora</th><th className="pr-2">Mesa</th><th className="pr-2">Pax</th><th className="pr-2">Nombre</th><th className="pr-2">Teléfono</th><th className="pr-2">Alergias / notas</th><th>Arroz</th><th className="w-10">✓</th>
          </tr>
        </thead>
        <tbody>
          {reservas.map((r) => (
            <tr key={r.id} className="border-b border-black/30 align-top">
              <td className="py-1 pr-2 font-bold">{hora(r.inicio)}</td>
              <td className="pr-2 font-bold">{r.mesas.map((m) => m.nombre).join("+") || "—"}</td>
              <td className="pr-2">{r.comensales}</td>
              <td className="pr-2">{r.nombre}{r.estado === "sentada" ? " (sentada)" : ""}</td>
              <td className="pr-2">{r.telefono}</td>
              <td className="pr-2">{[r.alergias && `⚠ ${r.alergias}`, r.ocasion, r.tronas ? `${r.tronas} trona` : "", r.silla_ruedas ? "silla de ruedas" : "", r.notas].filter(Boolean).join(" · ")}</td>
              <td>{r.arroces.map((a) => `${a.nombre} (${a.raciones})`).join(", ")}</td>
              <td className="border border-black/40" />
            </tr>
          ))}
        </tbody>
      </table>
      {arroces.size ? (
        <section className="mt-6 break-inside-avoid">
          <h2 className="font-display text-lg">Arroces encargados</h2>
          <ul className="mt-1">
            {[...arroces].map(([nombre, x]) => (
              <li key={nombre}><strong>{nombre}: {x.raciones} raciones</strong> — {x.horas.join(" · ")}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
