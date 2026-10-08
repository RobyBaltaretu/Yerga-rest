import type { Locale } from "@/i18n/routing";

/** Atributo `lang` correcto por idioma (el valenciano es una variante del catalán). */
export function htmlLang(locale: string): string {
  return locale === "va" ? "ca-ES-valencia" : locale;
}

/** Texto en el idioma pedido de un campo multilingüe `{es, va, en}`. */
export function tr(
  value: Partial<Record<Locale, string>> | null | undefined,
  locale: string,
): string {
  if (!value) return "";
  return value[locale as Locale] || value.es || value.va || value.en || "";
}
