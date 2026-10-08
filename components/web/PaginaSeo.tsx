import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PaellaMini } from "./PaellaMini";
import { getConfig, getTurnos } from "@/lib/datos-publicos";
import { JsonLd, jsonLdRestaurante } from "@/lib/jsonld";

/** Plantilla de las páginas pensadas para buscadores. */
export async function PaginaSeo({ locale, titulo, descripcion, cuerpo, slugPaella = "paella-valenciana", grupo = false }: { locale: string; titulo: string; descripcion: string; cuerpo: string[]; slugPaella?: string; grupo?: boolean }) {
  const [t, config, turnos] = await Promise.all([getTranslations("web"), getConfig(), getTurnos()]);
  return (
    <main id="contenido" className="px-4 pb-24 pt-28">
      <JsonLd datos={jsonLdRestaurante(config, turnos, locale)} />
      <article className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-[1.3fr_1fr]">
        <div>
          <h1 className="font-display text-5xl leading-tight">{titulo}</h1>
          <p className="mt-4 text-xl text-niebla">{descripcion}</p>
          {cuerpo.map((p, i) => (
            <p key={i} className="mt-4 text-lg leading-relaxed">{p}</p>
          ))}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/reservar" className="inline-flex min-h-12 items-center rounded-full bg-pimenton px-7 font-semibold text-white">{grupo ? t("grupos.boton") : t("nav.reservar")}</Link>
            <Link href="/carta" className="inline-flex min-h-12 items-center rounded-full bg-white px-7 font-semibold ring-1 ring-tinta/15">{t("carta.verCompleta")}</Link>
          </div>
        </div>
        <PaellaMini slug={slugPaella} nombre={titulo} className="paella-gira w-full max-w-sm justify-self-center" />
      </article>
    </main>
  );
}
