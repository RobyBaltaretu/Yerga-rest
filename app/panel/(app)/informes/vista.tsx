"use client";

import Link from "next/link";
import { Cabecera } from "@/components/panel/Cabecera";
import { ConDatos, RequiereRol, esFecha, sinError, useDatos, useParam } from "@/components/panel/DatosPanel";
import { getBrowserClient } from "@/lib/supabase/client";
import { fechaLocal, sumarDias } from "@/lib/format";
import { hora } from "@/lib/panel/estados";
import { aCsv, periodoAnterior, variacion } from "@/lib/panel/informes";

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

const boton = "inline-flex min-h-11 items-center rounded-full bg-white px-4 font-semibold ring-1 ring-tinta/15";

type FilaReserva = {
  inicio: string;
  comensales: number;
  estado: string;
  origen: string;
  turno_nombre: string | null;
  creada_en: string;
  encargo_arroz: { raciones: number; plato: { nombre: { es?: string } } | null }[];
  asignacion: { activa: boolean; mesa: { nombre: string } | null }[];
};

function descargar(nombre: string, contenido: string) {
  const url = URL.createObjectURL(new Blob([contenido], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: nombre });
  a.click();
  URL.revokeObjectURL(url);
}

/** Reservas del periodo sin datos de contacto (minimización): para analizar en una hoja de cálculo. */
async function descargarReservas(desde: string, hasta: string) {
  const db = getBrowserClient();
  const [ini, fin] = await Promise.all([
    db.rpc("hora_local", { p_fecha: desde, p_hora: "00:00" }),
    db.rpc("hora_local", { p_fecha: sumarDias(hasta, 1), p_hora: "00:00" }),
  ]);
  const filas = sinError(
    await db
      .from("reserva")
      .select("inicio, comensales, estado, origen, turno_nombre, creada_en, encargo_arroz(raciones, plato(nombre)), asignacion(activa, mesa(nombre))")
      .gte("inicio", sinError(ini) as string)
      .lt("inicio", sinError(fin) as string)
      .order("inicio"),
  ) as unknown as FilaReserva[];
  const csv = aCsv(filas, [
    ["Fecha", (r) => fechaLocal(r.inicio)],
    ["Hora", (r) => hora(r.inicio)],
    ["Turno", (r) => r.turno_nombre],
    ["Comensales", (r) => r.comensales],
    ["Estado", (r) => r.estado],
    ["Origen", (r) => r.origen],
    ["Mesas", (r) => r.asignacion.filter((a) => a.activa).map((a) => a.mesa?.nombre).join("+")],
    ["Arroces", (r) => r.encargo_arroz.map((e) => `${e.plato?.nombre.es ?? "?"} x${e.raciones}`).join(", ")],
    ["Creada", (r) => `${fechaLocal(r.creada_en)} ${hora(r.creada_en)}`],
  ]);
  descargar(`reservas_${desde}_${hasta}.csv`, csv);
}

function Informes() {
  const hoy = fechaLocal();
  const hasta = useParam("hasta", esFecha) ?? hoy;
  const desde = useParam("desde", esFecha) ?? sumarDias(hasta, -29);
  const anterior = periodoAnterior(desde, hasta);
  const estado = useDatos(async (db) => {
    const [actual, previo] = await Promise.all([
      db.rpc("informe", { p_desde: desde, p_hasta: hasta }),
      db.rpc("informe", { p_desde: anterior.desde, p_hasta: anterior.hasta }),
    ]);
    return { i: sinError(actual) as unknown as Informe, ant: sinError(previo) as unknown as Informe };
  }, [desde, hasta]);
  const rapidos = [
    { texto: "7 días", desde: sumarDias(hoy, -6) },
    { texto: "30 días", desde: sumarDias(hoy, -29) },
    { texto: "90 días", desde: sumarDias(hoy, -89) },
    { texto: "Este mes", desde: `${hoy.slice(0, 8)}01` },
  ];
  return (
    <main className="pb-16">
      <Cabecera titulo="Informes" descripcion="Metas propuestas a 3 meses; se validan con el primer mes de datos reales." />
      <div className="flex flex-wrap items-end gap-3 px-4 py-4 sm:px-6">
        <form className="flex flex-wrap items-end gap-3">
          <label className="text-sm font-semibold">Desde<input type="date" name="desde" defaultValue={desde} key={`d${desde}`} className="mt-1 block min-h-11 rounded-full border-0 bg-white px-3 ring-1 ring-tinta/15" /></label>
          <label className="text-sm font-semibold">Hasta<input type="date" name="hasta" defaultValue={hasta} key={`h${hasta}`} className="mt-1 block min-h-11 rounded-full border-0 bg-white px-3 ring-1 ring-tinta/15" /></label>
          <button className="min-h-11 rounded-full bg-tinta px-4 font-semibold text-arroz">Ver</button>
        </form>
        <nav aria-label="Periodos rápidos" className="flex flex-wrap gap-2">
          {rapidos.map((r) => (
            <Link key={r.texto} href={`/panel/informes?desde=${r.desde}&hasta=${hoy}`} aria-current={r.desde === desde && hasta === hoy ? "page" : undefined} className={`${boton} aria-[current=page]:bg-tinta aria-[current=page]:text-arroz`}>
              {r.texto}
            </Link>
          ))}
        </nav>
      </div>
      <p className="px-4 pb-4 text-sm text-niebla sm:px-6">
        Comparado con el periodo anterior: del {anterior.desde} al {anterior.hasta}.
      </p>
      <ConDatos estado={estado}>{({ i, ant }) => <Resultados i={i} ant={ant} desde={desde} hasta={hasta} />}</ConDatos>
    </main>
  );
}

/** «▲ 4,5 pts» frente al periodo anterior; el color dice si es a mejor. */
function Variacion({ actual, anterior, unidad, mejorSiSube }: { actual: number | null; anterior: number | null; unidad: string; mejorSiSube: boolean | null }) {
  const v = variacion(actual, anterior);
  if (v == null) return null;
  const texto = v === 0 ? "= que el periodo anterior" : `${v > 0 ? "▲" : "▼"} ${Math.abs(v).toLocaleString("es-ES")}${unidad === "%" ? " pts" : unidad ? ` ${unidad}` : ""} frente al anterior`;
  const color = v === 0 || mejorSiSube == null ? "text-niebla" : (v > 0) === mejorSiSube ? "text-huerta" : "text-pimenton-oscuro";
  return <p className={`mt-0.5 text-xs ${color}`}>{texto}</p>;
}

function Resultados({ i, ant, desde, hasta }: { i: Informe; ant: Informe; desde: string; hasta: string }) {
  const maxArroz = Math.max(1, ...i.arroces.map((a) => a.raciones));

  const tarjetas = [
    { titulo: "Reservas online sobre el total", valor: i.online_sobre_total, previo: ant.online_sobre_total, sube: true, unidad: "%", meta: "60 % o más", ok: (i.online_sobre_total ?? 0) >= 60 },
    { titulo: "Plantones", valor: i.plantones_pct, previo: ant.plantones_pct, sube: false, unidad: "%", meta: "menos del 4 %", ok: (i.plantones_pct ?? 0) < 4 },
    { titulo: "Reservas web con arroz elegido", valor: i.con_arroz_pct, previo: ant.con_arroz_pct, sube: true, unidad: "%", meta: "50 % o más", ok: (i.con_arroz_pct ?? 0) >= 50 },
    { titulo: "Tiempo medio para reservar online", valor: i.segundos_reserva, previo: ant.segundos_reserva, sube: false, unidad: "s", meta: "menos de 60 s", ok: i.segundos_reserva != null && i.segundos_reserva < 60 },
    // Es una foto de hoy, no del periodo: no se compara.
    { titulo: "Confirmadas futuras sin mesa", valor: i.sin_mesa_futuras, previo: null, sube: null, unidad: "", meta: "0", ok: i.sin_mesa_futuras === 0 },
    { titulo: "Antelación media", valor: i.antelacion_horas, previo: ant.antelacion_horas, sube: null, unidad: "h", meta: "", ok: null },
    { titulo: "Reservas", valor: i.total, previo: ant.total, sube: true, unidad: "", meta: "", ok: null },
    { titulo: "Comensales atendidos", valor: i.comensales, previo: ant.comensales, sube: true, unidad: "", meta: "", ok: null },
  ];
  const csvOcupacion = () =>
    descargar(
      `ocupacion_${desde}_${hasta}.csv`,
      aCsv(i.por_turno, [
        ["Fecha", (t) => t.fecha],
        ["Turno", (t) => t.turno],
        ["Comensales", (t) => t.comensales],
        ["Ocupación %", (t) => t.ocupacion],
      ]),
    );

  return (
      <div className="space-y-10 px-4 sm:px-6">
        <section aria-label="Exportar" className="flex flex-wrap gap-2">
          <button type="button" onClick={() => descargarReservas(desde, hasta)} className={boton}>Descargar reservas (CSV)</button>
          <button type="button" onClick={csvOcupacion} className={boton}>Descargar ocupación por turno (CSV)</button>
        </section>
        <section aria-label="Resumen" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {tarjetas.map((t) => (
            <div key={t.titulo} className="rounded-2xl bg-white p-4 ring-1 ring-tinta/10">
              <p className="text-sm text-niebla">{t.titulo}</p>
              <p className="mt-1 font-display text-4xl tabular-nums">{t.valor ?? "—"}<span className="text-xl">{t.valor != null ? t.unidad : ""}</span></p>
              <Variacion actual={t.valor} anterior={t.previo} unidad={t.unidad} mejorSiSube={t.sube} />
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
