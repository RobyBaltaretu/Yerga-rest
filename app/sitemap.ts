import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/env";

const rutas = ["", "/carta", "/reservar", "/paella-valenciana", "/arroceria", "/comidas-de-grupo", "/aviso-legal", "/privacidad", "/cookies"];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = publicEnv.siteUrl;
  return rutas.map((r) => ({
    url: `${base}/es${r}`,
    changeFrequency: r === "" || r === "/carta" ? "weekly" : "monthly",
    priority: r === "" ? 1 : r === "/reservar" ? 0.9 : 0.6,
    alternates: { languages: { es: `${base}/es${r}`, "ca-ES-valencia": `${base}/va${r}`, en: `${base}/en${r}` } },
  }));
}
