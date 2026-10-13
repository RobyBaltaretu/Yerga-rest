import { alternos } from "@/lib/seo";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getConfig, getContenidos } from "@/lib/datos-publicos";
import { paginasLegales, textoLegal, type PaginaLegal } from "@/lib/legal";
import { tr } from "@/lib/i18n";

export function generateStaticParams() {
  return paginasLegales.map((legal) => ({ legal }));
}

const claves: Record<PaginaLegal, string> = { "aviso-legal": "legal.aviso", privacidad: "legal.privacidad", cookies: "legal.cookies" };

export async function generateMetadata({ params }: PageProps<"/[locale]/[legal]">): Promise<Metadata> {
  const { locale, legal } = await params;
  if (!paginasLegales.includes(legal as PaginaLegal)) return {};
  const c = await getConfig();
  return { title: textoLegal(legal as PaginaLegal, locale, c).titulo, robots: { index: true, follow: true }, alternates: alternos(locale, `/${legal}`) };
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
    <main id="contenido" className="px-4 pb-28 pt-32 sm:px-6 sm:pt-40">
      <article className="mx-auto max-w-3xl">
        <h1 className="text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.02]">{plantilla.titulo}</h1>
        {propio ? (
          propio.split(/\n{2,}/).map((p, i) => <p key={i} className="mt-4 max-w-[68ch] text-[17px] leading-relaxed text-suave">{p}</p>)
        ) : (
          plantilla.secciones.map((s) => (
            <section key={s.titulo} className="mt-12 border-t border-linea pt-8">
              <h2 className="text-xl">{s.titulo}</h2>
              {s.parrafos.map((p, i) => <p key={i} className="mt-3 max-w-[68ch] text-[17px] leading-relaxed text-suave">{p}</p>)}
            </section>
          ))
        )}
      </article>
    </main>
  );
}
