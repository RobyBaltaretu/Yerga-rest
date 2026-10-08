"use client";

import { Cabecera } from "@/components/panel/Cabecera";
import { ConDatos, RequiereRol, sinError, useDatos } from "@/components/panel/DatosPanel";
import { ListaDistribuciones, type DistribucionFila } from "@/components/panel/ListaDistribuciones";

export function VistaMapa() {
  return (
    <RequiereRol rol="gestion">
      <Mapa />
    </RequiereRol>
  );
}

function Mapa() {
  const estado = useDatos(async (db) => {
    const [zonas, dists] = await Promise.all([
      db.from("zona").select("id, nombre").eq("activa", true).order("orden"),
      db
        .from("distribucion")
        .select("id, zona_id, nombre, estado, predeterminada, borrador_pendiente, publicada_en, programacion_distribucion(id, fecha, dia_semana, turno_nombre), mesa(count)")
        .order("nombre"),
    ]);
    return { zonas: sinError(zonas) ?? [], distribuciones: (sinError(dists) ?? []) as unknown as DistribucionFila[] };
  }, []);
  return (
    <main className="pb-16">
      <Cabecera
        titulo="Mapa de mesas"
        descripcion="Modo «Editar distribución»: plantillas por zona, programadas por día de la semana, turno o fecha. Los cambios son borrador hasta publicar."
      />
      <ConDatos estado={estado}>{(d) => <ListaDistribuciones zonas={d.zonas} distribuciones={d.distribuciones} />}</ConDatos>
    </main>
  );
}
