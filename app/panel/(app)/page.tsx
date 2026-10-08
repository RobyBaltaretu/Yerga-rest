import type { Metadata } from "next";
import { bloqueosDelDia, reglasPanel, reservasDelDia, salaDelTurno, turnosDelDia } from "@/lib/panel/datos";
import { createClient } from "@/lib/supabase/server";
import { ahoraMs, fechaLocal } from "@/lib/format";
import { ServicioHoy } from "@/components/panel/servicio/ServicioHoy";

export const metadata: Metadata = { title: "Servicio de hoy" };

export default async function ServicioDeHoyPage({ searchParams }: PageProps<"/panel">) {
  const sp = await searchParams;
  const hoy = fechaLocal();
  const fecha = typeof sp.fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.fecha) ? sp.fecha : hoy;
  const turnos = await turnosDelDia(fecha);

  if (!turnos.length) {
    return (
      <main className="px-6 py-10">
        <h1 className="font-display text-3xl">Servicio</h1>
        <p className="mt-4 text-niebla">El restaurante no abre este día ({fecha}).</p>
        <form action="/panel" className="mt-4">
          <label htmlFor="f" className="text-sm font-semibold">Ver otro día</label>
          <input id="f" type="date" name="fecha" defaultValue={fecha} className="ml-2 min-h-11 rounded-full bg-white px-3 ring-1 ring-tinta/15" />
          <button className="ml-2 min-h-11 rounded-full bg-tinta px-4 font-semibold text-arroz">Ir</button>
        </form>
      </main>
    );
  }

  // Turno en curso o el siguiente del día; si ya han pasado todos, el último.
  const ahoraHora = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date());
  const elegido =
    (typeof sp.turno === "string" && turnos.find((t) => t.nombre === sp.turno)) ||
    (fecha === hoy ? turnos.find((t) => ahoraHora <= t.fin) : undefined) ||
    (fecha === hoy ? turnos.at(-1) : turnos[0])!;

  const supabase = await createClient();
  const [reservas, sala, bloqueos, reglas, inicio, fin] = await Promise.all([
    reservasDelDia(fecha),
    salaDelTurno(fecha, elegido.nombre),
    bloqueosDelDia(fecha),
    reglasPanel(),
    supabase.rpc("hora_local", { p_fecha: fecha, p_hora: elegido.inicio }),
    supabase.rpc("hora_local", { p_fecha: fecha, p_hora: elegido.fin }),
  ]);

  return (
    <main>
      <h1 className="sr-only">Servicio de hoy</h1>
      <ServicioHoy
        fecha={fecha}
        turno={elegido.nombre}
        turnos={turnos}
        esHoy={fecha === hoy}
        ahoraServidor={ahoraMs()}
        inicioTurno={new Date(inicio.data!).toISOString()}
        finTurno={new Date(fin.data!).toISOString()}
        reservas={reservas}
        zonas={sala.zonas}
        mesas={sala.mesas}
        elementos={sala.elementos}
        combinaciones={sala.combinaciones}
        distribuciones={sala.distribuciones}
        bloqueos={bloqueos}
        reglas={reglas}
      />
    </main>
  );
}
