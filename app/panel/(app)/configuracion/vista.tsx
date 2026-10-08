"use client";

import { Cabecera } from "@/components/panel/Cabecera";
import { ConDatos, RequiereRol, sinError, useDatos, useSesion } from "@/components/panel/DatosPanel";
import { Configuracion } from "@/components/panel/config/Configuracion";
import { parseRango } from "@/lib/panel/datos";
import { fechaLocal } from "@/lib/format";

export function VistaConfiguracion() {
  return (
    <RequiereRol rol="gestion">
      <PantallaConfiguracion />
    </RequiereRol>
  );
}

function PantallaConfiguracion() {
  const sesion = useSesion();
  const hoy = fechaLocal();
  const estado = useDatos(async (db) => {
    const [config, turnos, bloqueos, plantillas, zonas, mesas] = await Promise.all([
      db.from("configuracion").select("*").eq("id", 1).single(),
      db.from("turno").select("*").order("dia_semana").order("inicio"),
      db.from("bloqueo").select("*").order("creado_en", { ascending: false }).limit(200),
      db.from("plantilla_mensaje").select("*").order("tipo"),
      db.from("zona").select("id, nombre").order("orden"),
      db.from("mesa").select("id, nombre, distribucion!inner(estado, predeterminada)").eq("activa", true).eq("distribucion.predeterminada", true).order("nombre"),
    ]);
    return {
      config: sinError(config)!,
      turnos: sinError(turnos) ?? [],
      bloqueos: (sinError(bloqueos) ?? [])
        .map((b) => {
          const [desde, hasta] = parseRango(String(b.rango));
          return { id: b.id, desde, hasta, turno_nombre: b.turno_nombre, zona_id: b.zona_id, mesa_id: b.mesa_id, motivo: b.motivo };
        })
        .filter((b) => fechaLocal(b.hasta) >= hoy)
        .sort((a, b) => a.desde.localeCompare(b.desde)),
      plantillas: sinError(plantillas) ?? [],
      zonas: sinError(zonas) ?? [],
      mesas: (sinError(mesas) ?? []).map((m) => ({ id: m.id, nombre: m.nombre })),
    };
  }, [hoy]);

  return (
    <main className="pb-16">
      <Cabecera titulo="Configuración" descripcion="Reglas de disponibilidad, horarios, bloqueos y plantillas de mensajes. Todo se aplica al momento." />
      <ConDatos estado={estado}>
        {(d) => (
          <Configuracion
            esAdmin={sesion.rol === "administrador"}
            config={d.config}
            turnos={d.turnos}
            bloqueos={d.bloqueos}
            plantillas={d.plantillas}
            zonas={d.zonas}
            mesas={d.mesas}
            hoy={hoy}
          />
        )}
      </ConDatos>
    </main>
  );
}
