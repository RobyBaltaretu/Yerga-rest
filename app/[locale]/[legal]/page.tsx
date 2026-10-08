import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getConfig, getContenidos } from "@/lib/datos-publicos";
import { paginasLegales, textoLegal, type PaginaLegal } from "@/lib/legal";
import { tr } from "@/lib/i18n";

const claves: Record<PaginaLegal, string> = { "aviso-legal": "legal.aviso", privacidad: "legal.privacidad", cookies: "legal.cookies" };

export async function generateMetadata({ params }: PageProps<"/[locale]/[legal]">): Promise<Metadata> {
  const { locale, legal } = await params;
  if (!paginasLegales.includes(legal as PaginaLegal)) return {};
  const c = await getConfig();
  return { title: textoLegal(legal as PaginaLegal, locale, c).titulo, robots: { index: true, follow: true } };
}

/** Páginas legales: el texto editado en el panel o, si está vacío, la plantilla. */
export default async function LegalPage({ params }: PageProps<"/[locale]/[legal]">) {
  const { locale, legal } = await params;
  if (!paginasLegales.includes(legal as PaginaLegal)) notFound();
  setRequestLocale(locale);
  const [config, contenidos] = await Promise.all([getConfig(), getContenidos()]);
  const plantilla = textoLegal(legal as PaginaLegal, locale, config);
  const propio = tr(contenidos[claves[legal as PaginaLegal]], locale).trim();

  return (
    <main id="contenido" className="px-4 pb-24 pt-28">
      <article className="mx-auto max-w-3xl">
        <h1 className="font-display text-5xl">{plantilla.titulo}</h1>
        {propio ? (
          propio.split(/\n{2,}/).map((p, i) => <p key={i} className="mt-4 leading-relaxed">{p}</p>)
        ) : (
          plantilla.secciones.map((s) => (
            <section key={s.titulo} className="mt-8">
              <h2 className="font-display text-2xl">{s.titulo}</h2>
              {s.parrafos.map((p, i) => <p key={i} className="mt-3 leading-relaxed">{p}</p>)}
            </section>
          ))
        )}
      </article>
    </main>
  );
}
