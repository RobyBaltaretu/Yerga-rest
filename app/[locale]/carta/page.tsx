import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPlatos } from "@/lib/datos-publicos";
import { tr } from "@/lib/i18n";
import { formatPrecio } from "@/lib/format";
import { JsonLd, jsonLdCarta } from "@/lib/jsonld";
import type { Multilingue } from "@/lib/datos-publicos";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({ params }: PageProps<"/[locale]/carta">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.carta" });
  return { title: t("titulo"), description: t("intro"), alternates: { canonical: `/${locale}/carta`, languages: { es: "/es/carta", "ca-ES-valencia": "/va/carta", en: "/en/carta" } } };
}

/** Carta completa: sin animación, para leer rápido. Precios y alérgenos desde el panel. */
export default async function CartaPage({ params }: PageProps<"/[locale]/carta">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, ta, platos] = await Promise.all([getTranslations("web.carta"), getTranslations("web"), getPlatos()]);
  const secciones: Record<string, string> = { arroz: t("arroces"), entrante: t("entrantes"), postre: t("postres"), menu_grupo: t("grupos") };
  const ejemplo = platos.some((p) => p.es_ejemplo);

  return (
    <main id="contenido" className="px-4 pb-24 pt-28">
      <JsonLd datos={jsonLdCarta(platos, locale, (v) => tr(v as Multilingue, locale), secciones)} />
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-5xl">{t("titulo")}</h1>
        <p className="mt-3 text-niebla">{t("intro")}</p>
        {ejemplo ? <p className="mt-2 rounded-xl bg-azafran/20 px-3 py-2 text-sm font-semibold">{t("avisoEjemplo")}</p> : null}
        {Object.entries(secciones).map(([cat, nombre]) => {
          const lista = platos.filter((p) => p.categoria === cat);
          if (!lista.length) return null;
          return (
            <section key={cat} aria-labelledby={`c-${cat}`} className="mt-12">
              <h2 id={`c-${cat}`} className="border-b border-tinta/15 pb-2 font-display text-3xl">{nombre}</h2>
              <ul className="divide-y divide-tinta/10">
                {lista.map((p) => (
                  <li key={p.id} className="py-4">
                    <div className="flex items-baseline justify-between gap-4">
                      <h3 className="font-display text-xl">
                        {tr(p.nombre as Multilingue, locale)}
                        {p.es_ejemplo ? <span className="ml-2 align-middle text-xs font-sans font-semibold uppercase text-niebla">({t("ejemplo")})</span> : null}
                      </h3>
                      <span className="shrink-0 font-semibold tabular-nums">
                        {p.precio != null ? (p.precio_por_persona ? ta("arroces.porPersona", { precio: formatPrecio(p.precio, locale) }) : formatPrecio(p.precio, locale)) : ""}
                      </span>
                    </div>
                    {tr(p.descripcion as Multilingue, locale) ? <p className="mt-1 text-niebla">{tr(p.descripcion as Multilingue, locale)}</p> : null}
                    <p className="mt-1 text-sm">
                      {p.min_comensales > 1 ? <span className="mr-3 font-semibold">{ta("arroces.minimo", { n: p.min_comensales })}</span> : null}
                      <span className="text-niebla">
                        {ta("arroces.alergenos")}: {p.alergenos.length ? p.alergenos.map((a) => ta(`alergenos.${a}` as "alergenos.gluten")).join(", ") : ta("arroces.sinAlergenos")}
                      </span>
                      {p.temporada ? <span className="ml-3 text-niebla">· {t("temporada", { t: p.temporada })}</span> : null}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        <div className="mt-12 text-center">
          <Link href="/reservar" className="inline-flex min-h-12 items-center rounded-full bg-pimenton px-7 font-semibold text-white">{ta("nav.reservar")}</Link>
        </div>
      </div>
    </main>
  );
}
