// Utilidades puras de los informes: periodos, variaciones y CSV.
import { sumarDias } from "@/lib/format";

/** Días entre dos fechas AAAA-MM-DD, ambas incluidas. */
export function diasDelPeriodo(desde: string, hasta: string): number {
  return Math.round((Date.parse(`${hasta}T12:00:00Z`) - Date.parse(`${desde}T12:00:00Z`)) / 86_400_000) + 1;
}

/** El periodo de la misma duración que termina justo antes de `desde`. */
export function periodoAnterior(desde: string, hasta: string): { desde: string; hasta: string } {
  const dias = diasDelPeriodo(desde, hasta);
  return { desde: sumarDias(desde, -dias), hasta: sumarDias(desde, -1) };
}

/**
 * Variación frente al periodo anterior. Los porcentajes se comparan en puntos; las
 * cantidades, en diferencia absoluta. `null` si falta alguno de los dos valores.
 */
export function variacion(actual: number | null, anterior: number | null): number | null {
  if (actual == null || anterior == null) return null;
  return Math.round((actual - anterior) * 10) / 10;
}

function celda(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * CSV para Excel en castellano: separador «;», fin de línea CRLF y marca BOM para que
 * abra los acentos bien.
 */
export function aCsv<T>(filas: T[], columnas: [cabecera: string, valor: (f: T) => unknown][]): string {
  const lineas = [columnas.map(([c]) => celda(c)).join(";"), ...filas.map((f) => columnas.map(([, v]) => celda(v(f))).join(";"))];
  return `﻿${lineas.join("\r\n")}\r\n`;
}
