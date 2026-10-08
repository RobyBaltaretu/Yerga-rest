import type { Metadata } from "next";
import Link from "next/link";
import { exigirGestion } from "@/lib/panel/sesion";
import { createClient } from "@/lib/supabase/server";
import { Cabecera } from "@/components/panel/Cabecera";

export const metadata: Metadata = { title: "Registro de cambios" };

const entidades = ["reserva", "asignacion", "cliente", "bloqueo", "mesa", "distribucion", "turno", "configuracion", "plato", "contenido", "usuario"];
const ignorar = new Set(["actualizada_en", "actualizado_en", "creada_en", "creado_en"]);
const acciones: Record<string, string> = { insert: "Alta", update: "Cambio", delete: "Baja" };

type Fila = { id: number; usuario_id: string | null; accion: string; entidad: string; entidad_id: string | null; antes: Record<string, unknown> | null; despues: Record<string, unknown> | null; creado_en: string };

function resumen(f: Fila) {
  const d = f.despues ?? f.antes ?? {};
  const etiqueta = (d.nombre as string) ?? (d.clave as string) ?? "";
  if (f.accion !== "update" || !f.antes || !f.despues) return etiqueta;
  const cambios = Object.keys(f.despues).filter((k) => !ignorar.has(k) && JSON.stringify(f.antes![k]) !== JSON.stringify(f.despues![k]));
  return `${etiqueta}${etiqueta ? ": " : ""}${cambios
    .slice(0, 4)
    .map((k) => `${k} ${fmt(f.antes![k])} → ${fmt(f.despues![k])}`)
    .join(" · ")}`;
}

function fmt(v: unknown) {
  if (v == null) return "—";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return s.length > 40 ? `${s.slice(0, 40)}…` : s;
}

export default async function RegistroPage({ searchParams }: PageProps<"/panel/registro">) {
  await exigirGestion();
  const sp = await searchParams;
  const entidad = typeof sp.entidad === "string" && entidades.includes(sp.entidad) ? sp.entidad : null;
  const supabase = await createClient();
  let q = supabase.from("registro_cambios").select("*").order("creado_en", { ascending: false }).limit(200);
  if (entidad) q = q.eq("entidad", entidad);
  const [{ data: filas }, { data: usuarios }] = await Promise.all([q, supabase.from("usuario").select("id, nombre")]);
  const nombres = new Map((usuarios ?? []).map((u) => [u.id, u.nombre]));
  const fmtFecha = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", dateStyle: "short", timeStyle: "medium" });

  return (
    <main>
      <Cabecera titulo="Registro de cambios" descripcion="Cada cambio queda registrado con usuario y hora. «Web» son cambios hechos por clientes." />
      <div className="flex flex-wrap gap-2 px-4 py-4 sm:px-6">
        <Link href="/panel/registro" className={`rounded-full px-3 py-1.5 text-sm ring-1 ring-tinta/15 ${!entidad ? "bg-tinta text-arroz" : "bg-white"}`}>Todo</Link>
        {entidades.map((e) => (
          <Link key={e} href={`/panel/registro?entidad=${e}`} className={`rounded-full px-3 py-1.5 text-sm ring-1 ring-tinta/15 ${entidad === e ? "bg-tinta text-arroz" : "bg-white"}`}>{e}</Link>
        ))}
      </div>
      <div className="overflow-x-auto px-4 pb-10 sm:px-6">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-niebla">
            <tr>
              <th className="py-2 pr-4">Cuándo</th>
              <th className="py-2 pr-4">Quién</th>
              <th className="py-2 pr-4">Qué</th>
              <th className="py-2">Detalle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-tinta/10">
            {((filas ?? []) as Fila[]).map((f) => (
              <tr key={f.id} className="align-top">
                <td className="whitespace-nowrap py-2 pr-4 tabular-nums">{fmtFecha.format(new Date(f.creado_en))}</td>
                <td className="py-2 pr-4">{f.usuario_id ? (nombres.get(f.usuario_id) ?? "—") : "Web / sistema"}</td>
                <td className="whitespace-nowrap py-2 pr-4">{acciones[f.accion] ?? f.accion} · {f.entidad}</td>
                <td className="py-2 text-niebla">{resumen(f)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filas?.length ? <p className="py-10 text-center text-niebla">Sin cambios registrados.</p> : null}
      </div>
    </main>
  );
}
