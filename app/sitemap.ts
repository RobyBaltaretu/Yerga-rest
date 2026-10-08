import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/env";
import { alternos } from "@/lib/seo";

const rutas = ["", "/carta", "/reservar", "/paella-valenciana", "/arroceria", "/comidas-de-grupo", "/aviso-legal", "/privacidad", "/cookies"];

/** Todas las páginas públicas en los tres idiomas, cada una con sus alternativas. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = publicEnv.siteUrl;
  return rutas.flatMap((r) => {
    const { languages } = alternos("es", r);
    const idiomas = Object.fromEntries(Object.entries(languages).map(([k, v]) => [k, `${base}${v}`]));
    return ["es", "va", "en"].map((l) => ({
      url: `${base}/${l}${r}`,
      changeFrequency: r === "" || r === "/carta" ? ("weekly" as const) : ("monthly" as const),
      priority: r === "" ? 1 : r === "/reservar" ? 0.9 : 0.6,
      alternates: { languages: idiomas },
    }));
  });
}
