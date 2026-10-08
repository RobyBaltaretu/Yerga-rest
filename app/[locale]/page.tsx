import { alternos } from "@/lib/seo";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Portada } from "@/components/web/Portada";
import { SeccionArroces, SeccionCartaResumen, SeccionCasa, SeccionEntrantes, SeccionLlegar, SeccionOpiniones, SeccionProducto, SeccionReservar } from "@/components/web/Secciones";
import { getConfig, getContenidos, getPlatos, getResenas, getTurnos } from "@/lib/datos-publicos";
import { tr } from "@/lib/i18n";
import { JsonLd, jsonLdRestaurante } from "@/lib/jsonld";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return { title: { absolute: t("title") }, description: t("description"), alternates: alternos(locale) };
}

export default async function InicioPage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [config, contenidos, platos, resenas, turnos] = await Promise.all([getConfig(), getContenidos(), getPlatos(), getResenas(), getTurnos()]);
  const ejemplo = platos.some((p) => p.es_ejemplo);
  const aviso = tr(contenidos["aviso"], locale);

  return (
    <main id="contenido">
      <JsonLd datos={jsonLdRestaurante(config, turnos, locale)} />
      {aviso ? <p className="fixed inset-x-0 top-16 z-30 bg-azafran px-4 py-2 text-center text-sm font-semibold text-brasa">{aviso}</p> : null}
      <Portada locale={locale} titular={tr(contenidos["portada.titular"], locale)} subtitulo={tr(contenidos["portada.subtitulo"], locale)} />
      <SeccionArroces locale={locale} platos={platos} />
      <SeccionEntrantes locale={locale} platos={platos} />
      <SeccionProducto texto={tr(contenidos["producto.texto"], locale)} />
      <SeccionCasa historia={tr(contenidos["casa.historia"], locale)} equipo={tr(contenidos["casa.equipo"], locale)} />
      <SeccionCartaResumen locale={locale} platos={platos} ejemplo={ejemplo} />
      <SeccionOpiniones resenas={resenas} />
      <SeccionLlegar locale={locale} config={config} turnos={turnos} />
      <SeccionReservar />
    </main>
  );
}
