"use client";

import { EditorDistribucion } from "@/components/panel/EditorDistribucion";
import { ConDatos, NoEncontrado, RequiereRol, sinError, useDatos, useIdRuta } from "@/components/panel/DatosPanel";
import { esquemaBorrador } from "@/lib/panel/borrador";

export function VistaEditarDistribucion() {
  return (
    <RequiereRol rol="gestion">
      <Editar />
    </RequiereRol>
  );
}

function Editar() {
  const id = useIdRuta();
  const estado = useDatos(async (db) => {
    if (!id) return null;
    const d = sinError(await db.from("distribucion").select("id, nombre, estado, borrador_pendiente, zona(nombre, slug)").eq("id", id).maybeSingle());
    if (!d) return null;
    const parsed = esquemaBorrador.safeParse(sinError(await db.rpc("borrador_de", { p_dist: id })));
    return { d, inicial: parsed.success ? parsed.data : { mesas: [], combinaciones: [], elementos: [] } };
  }, [id]);
  return (
    <ConDatos estado={estado}>
      {(x) => {
        if (!x || !id) return <NoEncontrado que="Distribución" />;
        const zona = x.d.zona as unknown as { nombre: string; slug: string };
        return (
          <main>
            <EditorDistribucion
              key={id}
              distId={id}
              nombre={x.d.nombre}
              zona={zona.nombre}
              prefijo={zona.nombre.charAt(0).toUpperCase()}
              inicial={x.inicial}
              pendiente={x.d.borrador_pendiente}
              estado={x.d.estado}
            />
          </main>
        );
      }}
    </ConDatos>
  );
}
