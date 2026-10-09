"use client";

import Link from "next/link";
import { Cabecera } from "@/components/panel/Cabecera";
import { ConDatos, NoEncontrado, sinError, useDatos, useIdRuta, useSesion } from "@/components/panel/DatosPanel";
import { textoEstado } from "@/components/panel/servicio/TarjetaReserva";
import { ahoraMs } from "@/lib/format";
import { NotasCliente } from "./NotasCliente";
import { RgpdCliente } from "./RgpdCliente";

type Encargo = { raciones: number; plato: { nombre: { es?: string } } | null };

export function VistaCliente() {
  const id = useIdRuta();
  const sesion = useSesion();
  const estado = useDatos(async (db) => {
    if (!id) return null;
    const [c, reservas, encargos] = await Promise.all([
      db.from("cliente").select("*").eq("id", id).maybeSingle(),
      db.from("reserva").select("id, inicio, comensales, estado, origen, alergias, ocasion").eq("cliente_id", id).order("inicio", { ascending: false }),
      db.from("encargo_arroz").select("raciones, plato(nombre), reserva!inner(cliente_id)").eq("reserva.cliente_id", id),
    ]);
    const cliente = sinError(c);
    return cliente ? { c: cliente, reservas: sinError(reservas) ?? [], encargos: (sinError(encargos) ?? []) as unknown as Encargo[], ahora: ahoraMs() } : null;
  }, [id]);
  return (
    <ConDatos estado={estado}>
      {(d) => {
        if (!d) return <NoEncontrado que="Cliente" />;
        const { c, reservas, encargos, ahora } = d;
        const fmt = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", dateStyle: "medium", timeStyle: "short" });
        const fmtDia = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", dateStyle: "medium" });
        const hechas = reservas.filter((r) => r.estado === "finalizada" || r.estado === "sentada");
        const plantones = reservas.filter((r) => r.estado === "no_presentada").length;
        const canceladas = reservas.filter((r) => r.estado === "cancelada").length;
        const proxima = [...reservas].reverse().find((r) => Date.parse(r.inicio) > ahora && r.estado !== "cancelada");
        const ultima = hechas[0];
        const mediaPax = hechas.length ? Math.round((hechas.reduce((s, r) => s + r.comensales, 0) / hechas.length) * 10) / 10 : null;
        const porArroz = new Map<string, number>();
        for (const e of encargos) {
          const n = e.plato?.nombre?.es;
          if (n) porArroz.set(n, (porArroz.get(n) ?? 0) + e.raciones);
        }
        const favorito = [...porArroz].sort((a, b) => b[1] - a[1])[0];
        const datos = [
          { k: "Visitas", v: String(hechas.length) },
          { k: "Plantones", v: String(plantones), alerta: plantones > 0 },
          { k: "Canceladas", v: String(canceladas) },
          { k: "Comensales de media", v: mediaPax != null ? String(mediaPax).replace(".", ",") : "—" },
          { k: "Última visita", v: ultima ? fmtDia.format(new Date(ultima.inicio)) : "—" },
          { k: "Próxima reserva", v: proxima ? fmt.format(new Date(proxima.inicio)) : "—" },
          { k: "Arroz favorito", v: favorito ? `${favorito[0]} (${favorito[1]} raciones)` : "—" },
        ];
        return (
          <main className="pb-16">
            <Cabecera titulo={c.nombre} descripcion={`${c.telefono}${c.correo ? ` · ${c.correo}` : ""} · idioma ${c.idioma}${c.anonimizado ? " · anonimizado" : ""}`} />
            <dl className="grid grid-cols-2 gap-3 px-4 pt-6 sm:grid-cols-4 sm:px-6 xl:grid-cols-7">
              {datos.map((x) => (
                <div key={x.k} className="rounded-2xl bg-white p-3 ring-1 ring-tinta/10">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-niebla">{x.k}</dt>
                  <dd className={`mt-1 font-semibold ${x.alerta ? "text-pimenton-oscuro" : ""}`}>{x.v}</dd>
                </div>
              ))}
            </dl>
            <div className="grid gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_360px]">
              <section>
                <h2 className="font-display text-xl">Historial</h2>
                <ul className="mt-2 divide-y divide-tinta/10 rounded-2xl bg-white ring-1 ring-tinta/10">
                  {reservas.map((r) => (
                    <li key={r.id} className="flex justify-between gap-3 p-3 text-sm">
                      <Link href={`/panel/reservas/${r.id}`} className="font-semibold hover:underline">{fmt.format(new Date(r.inicio))}</Link>
                      <span>{r.comensales} pax · {textoEstado[r.estado]} · {r.origen}{r.ocasion ? ` · ${r.ocasion}` : ""}</span>
                    </li>
                  ))}
                  {!reservas.length ? <li className="p-3 text-sm text-niebla">Sin reservas.</li> : null}
                </ul>
              </section>
              <aside className="space-y-4 text-sm">
                {c.alergias ? <p className="rounded-2xl bg-pimenton/10 p-3 font-semibold text-pimenton-oscuro">Alergias: {c.alergias}</p> : null}
                <p>Comunicaciones comerciales: {c.consiente_comercial ? "sí" : "no"}</p>
                {!c.anonimizado ? <NotasCliente key={c.id} id={c.id} notas={c.notas_internas ?? ""} preferencias={c.preferencias ?? ""} alergias={c.alergias ?? ""} /> : null}
                {sesion.rol === "administrador" && !c.anonimizado ? <RgpdCliente id={c.id} nombre={c.nombre} /> : null}
              </aside>
            </div>
          </main>
        );
      }}
    </ConDatos>
  );
}
