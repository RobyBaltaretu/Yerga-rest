import { describe, expect, it } from "vitest";
import { inicioFranja, resumenArroces } from "./arroces";
import type { ReservaPanel } from "./estados";

// 13:10, 13:40 y 14:05 en Madrid (horario de verano, UTC+2).
const R = (id: string, inicio: string, arroces: ReservaPanel["arroces"], extra: Partial<ReservaPanel> = {}) =>
  ({ id, nombre: id, inicio, estado: "confirmada", turno_nombre: "comida", mesas: [], arroces, ...extra }) as ReservaPanel;

const reservas = [
  R("c", "2026-10-09T12:05:00Z", [{ nombre: "Paella valenciana", raciones: 4 }]),
  R("a", "2026-10-09T11:10:00Z", [{ nombre: "Arroz negro", raciones: 2 }, { nombre: "Paella valenciana", raciones: 2 }]),
  R("b", "2026-10-09T11:40:00Z", [{ nombre: "Arroz negro", raciones: 3 }]),
  R("anulada", "2026-10-09T11:15:00Z", [{ nombre: "Arroz negro", raciones: 9 }], { estado: "cancelada" }),
  R("sin", "2026-10-09T11:20:00Z", []),
  R("cena", "2026-10-09T19:00:00Z", [{ nombre: "Fideuà", raciones: 2 }], { turno_nombre: "cena" }),
];

describe("Resumen de arroces para cocina", () => {
  it("redondea a la media hora local", () => {
    expect(inicioFranja("2026-10-09T11:10:00Z")).toBe("13:00");
    expect(inicioFranja("2026-10-09T11:40:00Z")).toBe("13:30");
    expect(inicioFranja("2026-01-15T12:59:00Z")).toBe("13:30"); // invierno, UTC+1
  });

  it("totales de un turno, sin reservas canceladas, de mayor a menor", () => {
    const r = resumenArroces(reservas, "comida");
    expect(r.totales).toEqual([
      { nombre: "Paella valenciana", raciones: 6 },
      { nombre: "Arroz negro", raciones: 5 },
    ]);
    expect(r.raciones).toBe(11);
  });

  it("franjas en orden con su subtotal y sus mesas", () => {
    const { franjas } = resumenArroces(reservas, "comida");
    expect(franjas.map((f) => f.desde)).toEqual(["13:00", "13:30", "14:00"]);
    expect(franjas[0].totales).toEqual([
      { nombre: "Arroz negro", raciones: 2 },
      { nombre: "Paella valenciana", raciones: 2 },
    ]);
    expect(franjas[0].filas.map((f) => f.reserva.id)).toEqual(["a", "a"]);
  });

  it("sin turno, todo el día", () => {
    expect(resumenArroces(reservas).raciones).toBe(13);
    expect(resumenArroces(reservas, "cena").totales).toEqual([{ nombre: "Fideuà", raciones: 2 }]);
  });
});
