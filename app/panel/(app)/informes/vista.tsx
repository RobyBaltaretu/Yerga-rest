"use client";

import { Cabecera } from "@/components/panel/Cabecera";
import { ConDatos, RequiereRol, esFecha, sinError, useDatos, useParam } from "@/components/panel/DatosPanel";
import { fechaLocal, sumarDias } from "@/lib/format";

type Informe = {
  total: number;
  comensales: number;
  origen: Record<string, number>;
  online_sobre_total: number | null;
  plantones_pct: number | null;
  cancelaciones: number;
  con_arroz_pct: number | null;
  segundos_reserva: number | null;
  antelacion_horas: number | null;
  sin_mesa_futuras: number;
  arroces: { nombre: string; raciones: number }[];
  por_turno: { fecha: string; turno: string; comensales: number; ocupacion: number | null }[];
  plazas: number;
};

/** Indicadores frente a las metas a 3 meses de la definición de producto. */
export function VistaInformes() {
  return (
    <RequiereRol rol="gestion">
      <Informes />
    </RequiereRol>
  );
}

function Informes() {
  const hasta = useParam("hasta", esFecha) ?? fechaLocal();
  const desde = useParam("desde", esFecha) ?? sumarDias(hasta, -30);
  const estado = useDatos(async (db) => sinError(await db.rpc("informe", { p_desde: desde, p_hasta: hasta })) as unknown as Informe, [desde, hasta]);
  return (
    <main className="pb-16">
      <Cabecera titulo="Informes" descripcion="Metas propuestas a 3 meses; se validan con el primer mes de datos reales." />
      <form className="flex flex-wrap items-end gap-3 px-4 py-4 sm:px-6">
        <label className="text-sm font-semibold">Desde<input type="date" name="desde" defaultValue={desde} key={`d${desde}`} className="mt-1 block min-h-11 rounded-full border-0 bg-white px-3 ring-1 ring-tinta/15" /></label>
        <label className="text-sm font-semibold">Hasta<input type="date" name="hasta" defaultValue={hasta} key={`h${hasta}`} className="mt-1 block min-h-11 rounded-full border-0 bg-white px-3 ring-1 ring-tinta/15" /></label>
        <button className="min-h-11 rounded-full bg-tinta px-4 font-semibold text-arroz">Ver</button>
      </form>
      <ConDatos estado={estado}>{(i) => <Resultados i={i} />}</ConDatos>
    </main>
  );
}

function Resultados({ i }: { i: Informe }) {
  const maxArroz = Math.max(1, ...i.arroces.map((a) => a.raciones));

  const tarjetas = [
    { titulo: "Reservas online sobre el total", valor: i.online_sobre_total, unidad: "%", meta: "60 % o más", ok: (i.online_sobre_total ?? 0) >= 60 },
    { titulo: "Plantones", valor: i.plantones_pct, unidad: "%", meta: "menos del 4 %", ok: (i.plantones_pct ?? 0) < 4 },
    { titulo: "Reservas web con arroz elegido", valor: i.con_arroz_pct, unidad: "%", meta: "50 % o más", ok: (i.con_arroz_pct ?? 0) >= 50 },
    { titulo: "Tiempo medio para reservar online", valor: i.segundos_reserva, unidad: "s", meta: "menos de 60 s", ok: i.segundos_reserva != null && i.segundos_reserva < 60 },
    { titulo: "Confirmadas futuras sin mesa", valor: i.sin_mesa_futuras, unidad: "", meta: "0", ok: i.sin_mesa_futuras === 0 },
    { titulo: "Antelación media", valor: i.antelacion_horas, unidad: "h", meta: "", ok: null },
  ];

  return (
      <div className="space-y-10 px-4 sm:px-6">
        <section aria-label="Resumen" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {tarjetas.map((t) => (
            <div key={t.titulo} className="rounded-2xl bg-white p-4 ring-1 ring-tinta/10">
              <p className="text-sm text-niebla">{t.titulo}</p>
              <p className="mt-1 font-display text-4xl tabular-nums">{t.valor ?? "—"}<span className="text-xl">{t.valor != null ? t.unidad : ""}</span></p>
              {t.meta ? <p className={`mt-1 text-xs font-semibold ${t.ok == null || t.valor == null ? "text-niebla" : t.ok ? "text-huerta" : "text-pimenton-oscuro"}`}>Meta: {t.meta}{t.valor != null && t.ok != null ? (t.ok ? " · cumplida" : " · por debajo") : ""}</p> : null}
            </div>
          ))}
        </section>

        <section aria-labelledby="t-origen">
          <h2 id="t-origen" className="font-display text-2xl">Origen de las reservas</h2>
          <p className="text-sm text-niebla">{i.total} reservas · {i.comensales} comensales atendidos · {i.cancelaciones} canceladas</p>
          <div className="mt-3 flex h-8 overflow-hidden rounded-full ring-1 ring-tinta/10" role="img" aria-label={Object.entries(i.origen).map(([k, v]) => `${k}: ${v}`).join(", ")}>
            {Object.entries(i.origen).map(([k, v]) => (
              <div key={k} className={`grid place-items-center text-xs font-semibold ${k === "web" ? "bg-huerta text-white" : k === "telefono" ? "bg-azafran" : "bg-arroz-2"}`} style={{ width: `${(100 * v) / Math.max(1, i.total)}%` }}>
                {k === "puerta" ? "sin reserva" : k} {v}
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="t-arroces">
          <h2 id="t-arroces" className="font-display text-2xl">Arroces más pedidos</h2>
          <ul className="mt-3 space-y-2">
            {i.arroces.map((a) => (
              <li key={a.nombre} className="grid grid-cols-[180px_1fr_60px] items-center gap-3 text-sm">
                <span className="font-semibold">{a.nombre}</span>
                <span className="h-4 rounded-full bg-azafran" style={{ width: `${(100 * a.raciones) / maxArroz}%` }} />
                <span className="tabular-nums">{a.raciones}</span>
              </li>
            ))}
            {!i.arroces.length ? <li className="text-sm text-niebla">Sin encargos en el periodo.</li> : null}
          </ul>
        </section>

        <section aria-labelledby="t-ocupacion">
          <h2 id="t-ocupacion" className="font-display text-2xl">Ocupación por turno</h2>
          <p className="text-sm text-niebla">Comensales sobre las {i.plazas} plazas de la distribución predeterminada.</p>
          <table className="mt-3 w-full max-w-xl text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-niebla"><tr><th className="py-2">Fecha</th><th>Turno</th><th>Comensales</th><th>Ocupación</th></tr></thead>
            <tbody className="divide-y divide-tinta/10">
              {i.por_turno.map((t) => (
                <tr key={`${t.fecha}-${t.turno}`}>
                  <td className="py-1.5 tabular-nums">{t.fecha}</td>
                  <td className="capitalize">{t.turno}</td>
                  <td className="tabular-nums">{t.comensales}</td>
                  <td className="tabular-nums">{t.ocupacion ?? "—"} %</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
  );
}
