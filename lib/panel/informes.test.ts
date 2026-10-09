import { describe, expect, it } from "vitest";
import { aCsv, diasDelPeriodo, periodoAnterior, variacion } from "./informes";

describe("Informes", () => {
  it("el periodo anterior tiene los mismos días y acaba la víspera", () => {
    expect(diasDelPeriodo("2026-10-01", "2026-10-31")).toBe(31);
    expect(periodoAnterior("2026-10-01", "2026-10-31")).toEqual({ desde: "2026-08-31", hasta: "2026-09-30" });
    expect(periodoAnterior("2026-03-29", "2026-03-29")).toEqual({ desde: "2026-03-28", hasta: "2026-03-28" }); // cambio de hora
  });

  it("variación en puntos o unidades, con un decimal", () => {
    expect(variacion(62.5, 58)).toBe(4.5);
    expect(variacion(3, 5)).toBe(-2);
    expect(variacion(null, 5)).toBeNull();
  });

  it("CSV con punto y coma, comillas cuando hacen falta y BOM", () => {
    const csv = aCsv(
      [{ n: "Pérez; Ana", c: 4, nota: 'dice "hola"' }, { n: "Luis", c: 2, nota: null }],
      [["Nombre", (f) => f.n], ["Comensales", (f) => f.c], ["Nota", (f) => f.nota]],
    );
    expect(csv).toBe('﻿Nombre;Comensales;Nota\r\n"Pérez; Ana";4;"dice ""hola"""\r\nLuis;2;\r\n');
  });
});
