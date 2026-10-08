"use client";

import { ConDatos, esFecha, sinError, useDatos, useParam } from "@/components/panel/DatosPanel";
import { bloqueosDelDia, reglasPanel, reservasDelDia, salaDelTurno, turnosDelDia } from "@/lib/panel/datos";
import { ahoraMs, fechaLocal } from "@/lib/format";
import { ServicioHoy } from "@/components/panel/servicio/ServicioHoy";

export function VistaServicio() {
  const hoy = fechaLocal();
  const fecha = useParam("fecha", esFecha) ?? hoy;
  const turnoPedido = useParam("turno");

  const estado = useDatos(
    async (db) => {
      const turnos = await turnosDelDia(db, fecha);
      if (!turnos.length) return { turnos, elegido: null };
      // Turno en curso o el siguiente del día; si ya han pasado todos, el último.
      const ahoraHora = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date());
      const elegido =
        (turnoPedido && turnos.find((t) => t.nombre === turnoPedido)) ||
        (fecha === hoy ? turnos.find((t) => ahoraHora <= t.fin) : undefined) ||
        (fecha === hoy ? turnos.at(-1) : turnos[0])!;
      const [reservas, sala, bloqueos, reglas, inicio, fin] = await Promise.all([
        reservasDelDia(db, fecha),
        salaDelTurno(db, fecha, elegido.nombre),
        bloqueosDelDia(db, fecha),
        reglasPanel(db),
        db.rpc("hora_local", { p_fecha: fecha, p_hora: elegido.inicio }),
        db.rpc("hora_local", { p_fecha: fecha, p_hora: elegido.fin }),
      ]);
      return {
        turnos,
        elegido,
        reservas,
        sala,
        bloqueos,
        reglas,
        ahora: ahoraMs(),
        inicio: new Date(sinError(inicio)!).toISOString(),
        fin: new Date(sinError(fin)!).toISOString(),
      };
    },
    [fecha, turnoPedido, hoy],
  );

  return (
    <ConDatos estado={estado}>
      {(d) =>
        !d.elegido ? (
          <main className="px-6 py-10">
            <h1 className="font-display text-3xl">Servicio</h1>
            <p className="mt-4 text-niebla">El restaurante no abre este día ({fecha}).</p>
            <form action="/panel" className="mt-4">
              <label htmlFor="f" className="text-sm font-semibold">Ver otro día</label>
              <input id="f" type="date" name="fecha" defaultValue={fecha} className="ml-2 min-h-11 rounded-full bg-white px-3 ring-1 ring-tinta/15" />
              <button className="ml-2 min-h-11 rounded-full bg-tinta px-4 font-semibold text-arroz">Ir</button>
            </form>
          </main>
        ) : (
          <main>
            <h1 className="sr-only">Servicio de hoy</h1>
            <ServicioHoy
              fecha={fecha}
              turno={d.elegido.nombre}
              turnos={d.turnos}
              esHoy={fecha === hoy}
              ahoraServidor={d.ahora}
              inicioTurno={d.inicio}
              finTurno={d.fin}
              reservas={d.reservas}
              zonas={d.sala.zonas}
              mesas={d.sala.mesas}
              elementos={d.sala.elementos}
              combinaciones={d.sala.combinaciones}
              distribuciones={d.sala.distribuciones}
              bloqueos={d.bloqueos}
              reglas={d.reglas}
            />
          </main>
        )
      }
    </ConDatos>
  );
}
