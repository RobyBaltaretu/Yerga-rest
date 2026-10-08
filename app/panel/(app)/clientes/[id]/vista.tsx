"use client";

import Link from "next/link";
import { Cabecera } from "@/components/panel/Cabecera";
import { ConDatos, NoEncontrado, sinError, useDatos, useIdRuta } from "@/components/panel/DatosPanel";
import { textoEstado } from "@/components/panel/servicio/TarjetaReserva";
import { NotasCliente } from "./NotasCliente";

export function VistaCliente() {
  const id = useIdRuta();
  const estado = useDatos(async (db) => {
    if (!id) return null;
    const [c, reservas] = await Promise.all([
      db.from("cliente").select("*").eq("id", id).maybeSingle(),
      db.from("reserva").select("id, inicio, comensales, estado, origen, alergias, ocasion").eq("cliente_id", id).order("inicio", { ascending: false }),
    ]);
    const cliente = sinError(c);
    return cliente ? { c: cliente, reservas: sinError(reservas) ?? [] } : null;
  }, [id]);
  return (
    <ConDatos estado={estado}>
      {(d) => {
        if (!d) return <NoEncontrado que="Cliente" />;
        const { c, reservas } = d;
        const fmt = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", dateStyle: "medium", timeStyle: "short" });
        const visitas = reservas.filter((r) => r.estado === "finalizada" || r.estado === "sentada").length;
        const plantones = reservas.filter((r) => r.estado === "no_presentada").length;
        return (
          <main className="pb-16">
            <Cabecera titulo={c.nombre} descripcion={`${c.telefono}${c.correo ? ` · ${c.correo}` : ""} · ${visitas} visitas · ${plantones} plantones · idioma ${c.idioma}`} />
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
                </ul>
              </section>
              <aside className="space-y-4 text-sm">
                {c.alergias ? <p className="rounded-2xl bg-pimenton/10 p-3 font-semibold text-pimenton-oscuro">Alergias: {c.alergias}</p> : null}
                <p>Comunicaciones comerciales: {c.consiente_comercial ? "sí" : "no"}</p>
                <NotasCliente id={c.id} notas={c.notas_internas ?? ""} preferencias={c.preferencias ?? ""} />
              </aside>
            </div>
          </main>
        );
      }}
    </ConDatos>
  );
}
