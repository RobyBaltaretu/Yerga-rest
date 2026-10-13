import { describe, expect, it } from "vitest";
import { fechaCorta, fechaLarga, formatNumero } from "./format";

describe("Formato en español para el panel", () => {
  it("fecha larga con mayúscula solo al principio", () => {
    expect(fechaLarga("2026-10-13")).toBe("Martes, 13 de octubre");
  });

  it("fecha corta sin punto en el mes", () => {
    expect(fechaCorta("2026-10-13")).toBe("13 oct 2026");
    expect(fechaCorta("2025-01-04")).toBe("4 ene 2025");
  });

  it("números con coma decimal y un decimal como mucho", () => {
    expect(formatNumero(66.66)).toBe("66,7");
    expect(formatNumero(6.9)).toBe("6,9");
    expect(formatNumero(-19)).toBe("-19");
  });
});
