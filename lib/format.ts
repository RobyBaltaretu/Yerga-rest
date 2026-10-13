// Formato de fechas y horas siempre en la hora de Valencia, sea cual sea el
// servidor o el navegador.

export const ZONA_HORARIA = "Europe/Madrid";

export function intlLocale(locale: string): string {
  return locale === "va" ? "ca-ES" : locale === "en" ? "en-GB" : "es-ES";
}

export function formatFecha(instante: string | Date, locale: string, opciones?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: ZONA_HORARIA,
    weekday: "long",
    day: "numeric",
    month: "long",
    ...opciones,
  }).format(new Date(instante));
}

export function formatHora(instante: string | Date) {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: ZONA_HORARIA,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(instante));
}

/** Fecha local YYYY-MM-DD de un instante. */
export function fechaLocal(instante: string | Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(instante));
}

/** Suma días a una fecha YYYY-MM-DD (aritmética de calendario, sin husos). */
export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function formatPrecio(precio: number | null | undefined, locale: string) {
  if (precio == null) return "";
  return new Intl.NumberFormat(intlLocale(locale), { style: "currency", currency: "EUR" }).format(precio);
}

/** Primera letra en mayúscula (sin tocar el resto, a diferencia de CSS capitalize). */
export function capitalizar(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Fecha larga de un día YYYY-MM-DD con mayúscula inicial: «Martes, 13 de octubre». */
export function fechaLarga(fecha: string, locale = "es") {
  return capitalizar(formatFecha(`${fecha}T12:00:00Z`, locale));
}

/** Fecha corta de un día YYYY-MM-DD: «13 oct 2026». */
export function fechaCorta(fecha: string, locale = "es") {
  return new Intl.DateTimeFormat(intlLocale(locale), { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" })
    .format(new Date(`${fecha}T12:00:00Z`))
    .replace(".", "");
}

/** Número con la coma decimal del idioma: «66,7». */
export function formatNumero(n: number, locale = "es", decimales = 1) {
  return new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: decimales }).format(n);
}

/** Instante actual en milisegundos (en servidor, para pasar a componentes). */
export function ahoraMs(): number {
  return Date.now();
}
