/**
 * `canonical` y `hreflang` de una página pública en los tres idiomas. El valenciano se
 * declara como `ca-ES` (Google solo admite código de idioma y región) y la versión por
 * defecto es la castellana.
 */
export const idiomasSeo = { es: "es", va: "ca-ES", en: "en" } as const;

export function alternos(locale: string, ruta = "") {
  return {
    canonical: `/${locale}${ruta}`,
    languages: {
      es: `/es${ruta}`,
      "ca-ES": `/va${ruta}`,
      en: `/en${ruta}`,
      "x-default": `/es${ruta}`,
    },
  };
}
