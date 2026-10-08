import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PaginaSeo } from "@/components/web/PaginaSeo";

export async function generateMetadata({ params }: PageProps<"/[locale]/comidas-de-grupo">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.seo" });
  return {
    title: t("grupos.titulo"),
    description: t("grupos.descripcion"),
    alternates: { canonical: `/${locale}/comidas-de-grupo`, languages: { es: "/es/comidas-de-grupo", "ca-ES": "/va/comidas-de-grupo", en: "/en/comidas-de-grupo" } },
  };
}

export default async function Pagina({ params }: PageProps<"/[locale]/comidas-de-grupo">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("web.seo");
  return (
    <PaginaSeo
      locale={locale}
      titulo={t("grupos.titulo")}
      descripcion={t("grupos.descripcion")}
      cuerpo={t.raw("cuerpos.grupos") as string[]}
      slugPaella="arros-a-banda"
      grupo={true}
    />
  );
}
