"use client";

import Link from "next/link";
import { Cabecera } from "@/components/panel/Cabecera";
import { EditarReserva } from "@/components/panel/EditarReserva";
import { ConDatos, NoEncontrado, sinError, useDatos, useIdRuta } from "@/components/panel/DatosPanel";
import { reservaPorId } from "@/lib/panel/datos";
import { fechaLocal } from "@/lib/format";
import { hora } from "@/lib/panel/estados";

export function VistaReserva() {
  const id = useIdRuta();
  const estado = useDatos(async (db) => {
    if (!id) return null;
    const r = await reservaPorId(db, id);
    if (!r) return null;
    const [historial, usuarios, mensajes] = await Promise.all([
      db.from("registro_cambios").select("accion, usuario_id, creado_en, antes, despues").eq("entidad", "reserva").eq("entidad_id", id).order("creado_en", { ascending: false }).limit(30),
      db.from("usuario").select("id, nombre"),
      db.from("mensaje").select("tipo, estado, creado_en").eq("reserva_id", id).order("creado_en"),
    ]);
    return {
      r,
      historial: sinError(historial) ?? [],
      nombres: new Map((sinError(usuarios) ?? []).map((u) => [u.id, u.nombre])),
      mensajes: sinError(mensajes) ?? [],
    };
  }, [id]);

  return (
    <ConDatos estado={estado}>
      {(d) => {
        if (!d) return <NoEncontrado que="Reserva" />;
        const { r, historial, nombres, mensajes } = d;
        const fmt = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", dateStyle: "short", timeStyle: "short" });
        return (
          <main className="pb-16">
            <Cabecera
              titulo={r.nombre}
              descripcion={`${fechaLocal(r.inicio)} · ${hora(r.inicio)} · ${r.comensales} pax · ${r.mesas.map((m) => m.nombre).join("+") || "sin mesa"}`}
              acciones={r.cliente_id ? <Link href={`/panel/clientes/${r.cliente_id}`} className="min-h-11 rounded-full bg-white px-4 py-2.5 font-semibold ring-1 ring-tinta/15">Ficha del cliente</Link> : null}
            />
            <div className="grid gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_320px]">
              <EditarReserva reserva={r} fecha={fechaLocal(r.inicio)} hora={hora(r.inicio)} />
              <aside className="space-y-6 text-sm">
                <div>
                  <h2 className="font-display text-xl">Correos</h2>
                  <ul className="mt-2 space-y-1">
                    {mensajes.map((m, i) => (
                      <li key={i}>{fmt.format(new Date(m.creado_en))} · {m.tipo} · {m.estado}</li>
                    ))}
                    {!mensajes.length ? <li className="text-niebla">Ninguno.</li> : null}
                  </ul>
                </div>
                <div>
                  <h2 className="font-display text-xl">Historial</h2>
                  <ul className="mt-2 space-y-2">
                    {historial.map((h, i) => {
                      const a = (h.antes ?? {}) as Record<string, unknown>;
                      const dd = (h.despues ?? {}) as Record<string, unknown>;
                      const cambios = Object.keys(dd).filter((k) => !k.endsWith("_en") && JSON.stringify(a[k]) !== JSON.stringify(dd[k]));
                      return (
                        <li key={i} className="rounded-xl bg-white p-2 ring-1 ring-tinta/10">
                          <span className="font-semibold">{fmt.format(new Date(h.creado_en))}</span> · {h.usuario_id ? nombres.get(h.usuario_id) : "Web / sistema"}
                          <div className="text-niebla">{h.accion === "insert" ? "Alta" : cambios.slice(0, 5).map((k) => `${k}: ${String(a[k] ?? "—")} → ${String(dd[k] ?? "—")}`).join(" · ")}</div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </aside>
            </div>
          </main>
        );
      }}
    </ConDatos>
  );
}
