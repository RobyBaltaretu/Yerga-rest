import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PaginaSeo } from "@/components/web/PaginaSeo";

export async function generateMetadata({ params }: PageProps<"/[locale]/paella-valenciana">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.seo" });
  return {
    title: t("paella.titulo"),
    description: t("paella.descripcion"),
    alternates: { canonical: `/${locale}/paella-valenciana`, languages: { es: "/es/paella-valenciana", "ca-ES": "/va/paella-valenciana", en: "/en/paella-valenciana" } },
  };
}

export default async function Pagina({ params }: PageProps<"/[locale]/paella-valenciana">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("web.seo");
  return (
    <PaginaSeo
      locale={locale}
      titulo={t("paella.titulo")}
      descripcion={t("paella.descripcion")}
      cuerpo={t.raw("cuerpos.paella") as string[]}
      slugPaella="paella-valenciana"
      grupo={false}
    />
  );
}
