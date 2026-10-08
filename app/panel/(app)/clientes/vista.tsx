"use client";

import Link from "next/link";
import { Cabecera } from "@/components/panel/Cabecera";
import { ConDatos, sinError, useDatos, useParam } from "@/components/panel/DatosPanel";

export function VistaClientes() {
  const q = (useParam("q") ?? "").trim().slice(0, 60);
  const estado = useDatos(async (db) => {
    let consulta = db.from("cliente").select("id, nombre, telefono, correo, alergias, ultima_actividad_en, reserva(estado)").eq("anonimizado", false).order("ultima_actividad_en", { ascending: false }).limit(100);
    if (q) {
      const patron = `%${q.replace(/[%_,()]/g, "")}%`;
      consulta = consulta.or(`nombre.ilike.${patron},telefono.ilike.${patron},correo.ilike.${patron}`);
    }
    return sinError(await consulta) ?? [];
  }, [q]);
  return (
    <main className="pb-16">
      <Cabecera titulo="Clientes" descripcion="Ficha con historial de visitas, alergias, preferencias, plantones y notas internas." />
      <form className="flex gap-2 px-4 py-4 sm:px-6">
        <label htmlFor="q" className="sr-only">Buscar</label>
        <input id="q" name="q" type="search" defaultValue={q} key={q} placeholder="Nombre, teléfono o correo" className="min-h-11 w-full max-w-md rounded-full border-0 bg-white px-4 ring-1 ring-tinta/15" />
        <button className="min-h-11 rounded-full bg-tinta px-4 font-semibold text-arroz">Buscar</button>
      </form>
      <ConDatos estado={estado}>
        {(clientes) => (
          <div className="overflow-x-auto px-4 sm:px-6">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-niebla">
                <tr><th className="py-2 pr-3">Nombre</th><th className="pr-3">Teléfono</th><th className="pr-3">Visitas</th><th className="pr-3">Plantones</th><th>Alergias</th></tr>
              </thead>
              <tbody className="divide-y divide-tinta/10">
                {clientes.map((c) => {
                  const res = (c.reserva ?? []) as { estado: string }[];
                  return (
                    <tr key={c.id}>
                      <td className="py-2 pr-3"><Link href={`/panel/clientes/${c.id}`} className="font-semibold hover:underline">{c.nombre}</Link></td>
                      <td className="pr-3">{c.telefono}</td>
                      <td className="pr-3 tabular-nums">{res.filter((r) => r.estado === "finalizada" || r.estado === "sentada").length}</td>
                      <td className="pr-3 tabular-nums">{res.filter((r) => r.estado === "no_presentada").length || ""}</td>
                      <td className="text-pimenton-oscuro">{c.alergias}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ConDatos>
    </main>
  );
}
