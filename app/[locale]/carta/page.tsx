import { alternos } from "@/lib/seo";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPlatos } from "@/lib/datos-publicos";
import { tr } from "@/lib/i18n";
import { formatPrecio } from "@/lib/format";
import { JsonLd, jsonLdCarta } from "@/lib/jsonld";
import type { Multilingue } from "@/lib/datos-publicos";
import { CabeceraPagina } from "@/components/web/CabeceraPagina";
import { EnlaceBoton } from "@/components/web/movimiento";

export async function generateMetadata({ params }: PageProps<"/[locale]/carta">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.carta" });
  return { title: t("titulo"), description: t("intro"), alternates: alternos(locale, "/carta") };
}

/** Carta completa: sin animación, para leer rápido. Precios y alérgenos desde el panel. */
export default async function CartaPage({ params }: PageProps<"/[locale]/carta">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, ta, platos] = await Promise.all([getTranslations("web.carta"), getTranslations("web"), getPlatos()]);
  const secciones: Record<string, string> = { arroz: t("arroces"), entrante: t("entrantes"), postre: t("postres"), menu_grupo: t("grupos") };
  const ejemplo = platos.some((p) => p.es_ejemplo);

  return (
    <main id="contenido" className="px-4 pb-28 pt-32 sm:px-6 sm:pt-40">
      <JsonLd datos={jsonLdCarta(platos, locale, (v) => tr(v as Multilingue, locale), secciones)} />
      <CabeceraPagina titulo={t("titulo")} intro={t("intro")}>
        {ejemplo ? <p className="mt-5 inline-flex rounded-full bg-acento-suave px-3 py-1 text-[13px] font-medium text-acento">{t("avisoEjemplo")}</p> : null}
        <nav aria-label={t("titulo")} className="mt-8 flex flex-wrap gap-2">
          {Object.entries(secciones)
            .filter(([cat]) => platos.some((p) => p.categoria === cat))
            .map(([cat, nombre]) => (
              <a key={cat} href={`#c-${cat}`} className="inline-flex min-h-9 items-center rounded-full bg-superficie px-4 text-[14px] font-medium shadow-tarjeta transition-shadow hover:shadow-elevada">
                {nombre}
              </a>
            ))}
        </nav>
      </CabeceraPagina>
      <div className="mx-auto max-w-3xl">
        {Object.entries(secciones).map(([cat, nombre]) => {
          const lista = platos.filter((p) => p.categoria === cat);
          if (!lista.length) return null;
          return (
            <section key={cat} aria-labelledby={`c-${cat}`} className="mt-16 scroll-mt-28">
              <h2 id={`c-${cat}`} className="text-2xl">{nombre}</h2>
              <ul className="mt-4 divide-y divide-linea border-y border-linea">
                {lista.map((p) => (
                  <li key={p.id} className="py-5">
                    <div className="flex items-baseline justify-between gap-6">
                      <h3 className="text-[17px] font-semibold tracking-[-0.015em]">
                        {tr(p.nombre as Multilingue, locale)}
                        {p.es_ejemplo ? <span className="ml-2 align-middle text-[11px] font-medium uppercase tracking-wide text-tenue">({t("ejemplo")})</span> : null}
                      </h3>
                      <span className="shrink-0 text-[15px] font-medium tabular-nums">
                        {p.precio != null ? (p.precio_por_persona ? ta("arroces.porPersona", { precio: formatPrecio(p.precio, locale) }) : formatPrecio(p.precio, locale)) : ""}
                      </span>
                    </div>
                    {tr(p.descripcion as Multilingue, locale) ? <p className="mt-1.5 max-w-[60ch] text-[15px] leading-relaxed text-suave">{tr(p.descripcion as Multilingue, locale)}</p> : null}
                    <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-tenue">
                      {p.min_comensales > 1 ? <span className="font-medium text-suave">{ta("arroces.minimo", { n: p.min_comensales })}</span> : null}
                      <span>
                        {ta("arroces.alergenos")}: {p.alergenos.length ? p.alergenos.map((a) => ta(`alergenos.${a}` as "alergenos.gluten")).join(", ") : ta("arroces.sinAlergenos")}
                      </span>
                      {p.temporada ? <span>· {t("temporada", { t: p.temporada })}</span> : null}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        <div className="mt-16">
          <EnlaceBoton href="/reservar" tamano="lg">{ta("nav.reservar")}</EnlaceBoton>
        </div>
      </div>
    </main>
  );
}
