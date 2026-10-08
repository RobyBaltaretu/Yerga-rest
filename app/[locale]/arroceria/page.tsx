import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PaginaSeo } from "@/components/web/PaginaSeo";
import { getConfig } from "@/lib/datos-publicos";

export async function generateMetadata({ params }: PageProps<"/[locale]/arroceria">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.seo" });
  const config = await getConfig();
  return {
    title: t("arroceria.titulo", { localidad: config.localidad || "Valencia" }),
    description: t("arroceria.descripcion", { localidad: config.localidad || "Valencia" }),
    alternates: { canonical: `/${locale}/arroceria`, languages: { es: "/es/arroceria", "ca-ES": "/va/arroceria", en: "/en/arroceria" } },
  };
}

export default async function Pagina({ params }: PageProps<"/[locale]/arroceria">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("web.seo");
  const config = await getConfig();
  return (
    <PaginaSeo
      locale={locale}
      titulo={t("arroceria.titulo", { localidad: config.localidad || "Valencia" })}
      descripcion={t("arroceria.descripcion", { localidad: config.localidad || "Valencia" })}
      cuerpo={t.raw("cuerpos.arroceria") as string[]}
      slugPaella="arros-del-senyoret"
      grupo={false}
    />
  );
}
