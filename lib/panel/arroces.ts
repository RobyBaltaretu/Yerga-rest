// Resumen de arroces para cocina: totales y franjas de media hora. Puro, sin dependencias.
import { ACTIVAS, hora, type ReservaPanel } from "./estados";

export type Total = { nombre: string; raciones: number };
export type FilaArroz = { reserva: ReservaPanel; nombre: string; raciones: number };
export type Franja = { desde: string; totales: Total[]; filas: FilaArroz[] };

const FRANJA_MIN = 30;

function sumar(filas: { nombre: string; raciones: number }[]): Total[] {
  const t = new Map<string, number>();
  for (const f of filas) t.set(f.nombre, (t.get(f.nombre) ?? 0) + f.raciones);
  return [...t]
    .map(([nombre, raciones]) => ({ nombre, raciones }))
    .sort((a, b) => b.raciones - a.raciones || a.nombre.localeCompare(b.nombre, "es"));
}

/** Hora local de inicio de la franja de media hora: «13:40» → «13:30». */
export function inicioFranja(instante: string): string {
  const [h, m] = hora(instante).split(":").map(Number);
  const min = Math.floor(m / FRANJA_MIN) * FRANJA_MIN;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/**
 * Arroces de las reservas activas (opcionalmente de un turno), con los totales del
 * servicio y el detalle por franja de media hora en orden cronológico.
 */
export function resumenArroces(reservas: ReservaPanel[], turno?: string | null) {
  const filas: FilaArroz[] = reservas
    .filter((r) => ACTIVAS.includes(r.estado) && (!turno || r.turno_nombre === turno))
    .sort((a, b) => a.inicio.localeCompare(b.inicio))
    .flatMap((r) => r.arroces.map((a) => ({ reserva: r, nombre: a.nombre, raciones: a.raciones })));

  const porFranja = new Map<string, FilaArroz[]>();
  for (const f of filas) {
    const k = inicioFranja(f.reserva.inicio);
    porFranja.set(k, [...(porFranja.get(k) ?? []), f]);
  }
  const franjas: Franja[] = [...porFranja]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([desde, fs]) => ({ desde, totales: sumar(fs), filas: fs }));

  return { totales: sumar(filas), raciones: filas.reduce((s, f) => s + f.raciones, 0), franjas };
}
