"use client";

import { Cabecera } from "@/components/panel/Cabecera";
import { NuevaReserva } from "@/components/panel/NuevaReserva";
import { ConDatos, esFecha, sinError, useDatos, useParam } from "@/components/panel/DatosPanel";
import { fechaLocal } from "@/lib/format";

export function VistaNuevaReserva() {
  const fecha = useParam("fecha", esFecha) ?? fechaLocal();
  // Solo la carga inicial: el formulario consulta después las horas por su cuenta.
  const estado = useDatos(async (db) => {
    const [zonas, horas] = await Promise.all([
      db.from("zona").select("id, nombre").eq("activa", true).order("orden"),
      db.rpc("horas_disponibles", { p_fecha: fecha, p_comensales: 2, p_solo_online: false }),
    ]);
    return { zonas: sinError(zonas) ?? [], horas: (sinError(horas) ?? []).map((h) => ({ ...h, inicio: new Date(h.inicio).toISOString() })) };
  }, [fecha]);
  return (
    <main className="pb-16">
      <Cabecera titulo="Nueva reserva" descripcion="Tres toques: personas, hora y nombre. El sistema propone la mesa." />
      <ConDatos estado={estado}>{(d) => <NuevaReserva fechaInicial={fecha} hoy={fechaLocal()} zonas={d.zonas} horasIniciales={d.horas} />}</ConDatos>
    </main>
  );
}
