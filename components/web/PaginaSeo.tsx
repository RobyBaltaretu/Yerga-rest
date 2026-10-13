import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { PaellaMini } from "./PaellaMini";
import { EnlaceBoton } from "./movimiento";
import { getConfig, getTurnos } from "@/lib/datos-publicos";
import { JsonLd, jsonLdRestaurante } from "@/lib/jsonld";

/** Plantilla de las páginas pensadas para buscadores. */
export async function PaginaSeo({ locale, titulo, descripcion, cuerpo, slugPaella = "paella-valenciana", grupo = false }: { locale: string; titulo: string; descripcion: string; cuerpo: string[]; slugPaella?: string; grupo?: boolean }) {
  const [t, config, turnos] = await Promise.all([getTranslations("web"), getConfig(), getTurnos()]);
  return (
    <main id="contenido" className="px-4 pb-28 pt-32 sm:px-6 sm:pt-40">
      <JsonLd datos={jsonLdRestaurante(config, turnos, locale)} />
      <article className="mx-auto grid max-w-6xl items-start gap-12 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-20">
        <div>
          <h1 className="text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.02]">{titulo}</h1>
          <p className="mt-5 text-xl leading-relaxed text-suave">{descripcion}</p>
          <div className="mt-8 space-y-5 text-[17px] leading-relaxed">
            {cuerpo.map((p, i) => (
              <p key={i} className="max-w-[62ch]">{p}</p>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <EnlaceBoton href="/reservar" tamano="lg">
              {grupo ? t("grupos.boton") : t("nav.reservar")}
              <ArrowRight className="size-4" strokeWidth={2} aria-hidden />
            </EnlaceBoton>
            <EnlaceBoton href="/carta" variante="secundario" tamano="lg">
              {t("carta.verCompleta")}
            </EnlaceBoton>
          </div>
        </div>
        <div aria-hidden className="mx-auto grid w-full max-w-sm place-items-center rounded-[32px] bg-sutil p-10 lg:sticky lg:top-28">
          <PaellaMini slug={slugPaella} nombre="" className="gira-lento w-full drop-shadow-[0_24px_30px_rgba(0,0,0,0.18)]" />
        </div>
      </article>
    </main>
  );
}
