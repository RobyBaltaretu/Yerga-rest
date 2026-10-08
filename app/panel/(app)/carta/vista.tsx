"use client";

import { Cabecera } from "@/components/panel/Cabecera";
import { ConDatos, RequiereRol, sinError, useDatos, useSesion } from "@/components/panel/DatosPanel";
import { EditorCarta } from "@/components/panel/config/EditorCarta";
import type { PlatoEditable } from "@/app/panel/config-acciones";

const clavesContenido = [
  { clave: "portada.titular", etiqueta: "Titular de la portada", ayuda: "Propuestas: «El arroz no espera. Tu mesa, sí.» · «Aquí el socarrat se rasca.» · «Valencia cabe en una paella.»" },
  { clave: "portada.subtitulo", etiqueta: "Subtítulo de la portada" },
  { clave: "aviso", etiqueta: "Aviso en la web", ayuda: "Banda destacada arriba (cierres, festivos…). Vacío = sin aviso." },
  { clave: "producto.texto", etiqueta: "El producto" },
  { clave: "casa.historia", etiqueta: "La casa: historia" },
  { clave: "casa.equipo", etiqueta: "La casa: equipo" },
  { clave: "legal.aviso", etiqueta: "Aviso legal (vacío = plantilla)", soloAdmin: true },
  { clave: "legal.privacidad", etiqueta: "Política de privacidad (vacío = plantilla)", soloAdmin: true },
  { clave: "legal.cookies", etiqueta: "Política de cookies (vacío = plantilla)", soloAdmin: true },
];

export function VistaCarta() {
  return (
    <RequiereRol rol="gestion">
      <Carta />
    </RequiereRol>
  );
}

function Carta() {
  const sesion = useSesion();
  const estado = useDatos(async (db) => {
    const [platos, contenidos, resenas] = await Promise.all([
      db.from("plato").select("*").order("categoria").order("orden"),
      db.from("contenido").select("clave, valor"),
      db.from("resena").select("*").order("orden"),
    ]);
    const valores = Object.fromEntries((sinError(contenidos) ?? []).map((c) => [c.clave, c.valor as { es: string; va: string; en: string }]));
    return {
      platos: (sinError(platos) ?? []) as unknown as (PlatoEditable & { id: string })[],
      contenidos: clavesContenido
        .filter((c) => !c.soloAdmin || sesion.rol === "administrador")
        .map((c) => ({ ...c, valor: valores[c.clave] ?? { es: "", va: "", en: "" } })),
      resenas: sinError(resenas) ?? [],
    };
  }, [sesion.rol]);
  return (
    <main className="pb-16">
      <Cabecera titulo="Carta y contenidos" descripcion="Platos, precios, alérgenos y textos de la web. Los cambios se ven en la web al momento." />
      <ConDatos estado={estado}>{(d) => <EditorCarta platos={d.platos} contenidos={d.contenidos} resenas={d.resenas} />}</ConDatos>
    </main>
  );
}
