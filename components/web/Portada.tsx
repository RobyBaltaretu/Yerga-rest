import { getTranslations } from "next-intl/server";
import { Flame, Timer, Wheat } from "lucide-react";
import { PaellaMini } from "./PaellaMini";
import { TarjetaReserva } from "./TarjetaReserva";

/**
 * Portada: el titular del panel y, debajo, el primer paso real de la reserva. Todo es
 * neutro; el único color es el de la paella.
 */
export async function Portada({ locale, titular, subtitulo, maximo }: { locale: string; titular: string; subtitulo: string; maximo: number }) {
  const [t, tp] = await Promise.all([getTranslations("web.portada"), getTranslations("web.producto")]);
  const datos = [
    { icono: Flame, texto: tp("lena") },
    { icono: Wheat, texto: tp("arroz") },
    { icono: Timer, texto: t("nota") },
  ];

  return (
    <section aria-labelledby="t-portada" className="relative overflow-hidden pb-16 pt-28 sm:pb-24 sm:pt-36">
      {/* Retícula de puntos muy tenue que se desvanece hacia los bordes. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 [background-image:radial-gradient(var(--w-linea-fuerte)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_70%_60%_at_30%_30%,#000_20%,transparent_75%)]"
      />
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-8">
        <div className="relative z-10">
          <h1 id="t-portada" className="max-w-[14ch] text-[clamp(2.75rem,7vw,5.25rem)] font-semibold leading-[0.98] tracking-[-0.04em]">
            {titular}
          </h1>
          <p className="mt-6 max-w-[38ch] text-lg leading-relaxed text-suave sm:text-xl">{subtitulo}</p>
          <div className="mt-10 max-w-md">
            <TarjetaReserva
              locale={locale}
              maximo={maximo}
              textos={{
                mesaPara: t("mesaPara"),
                persona: t("personas", { n: 1 }),
                personas: t("personas", { n: 2 }),
                menos: t("menos"),
                mas: t("mas"),
                verHoras: t("verHoras"),
                grupo: t("grupo", { max: maximo }),
                datos: t("datos"),
              }}
            />
          </div>
        </div>

        <div aria-hidden className="relative mx-auto w-[min(72vw,300px)] sm:w-[min(60vw,420px)] lg:-mr-24 lg:w-full lg:max-w-[560px]">
          <div className="absolute inset-[8%] rounded-full bg-[radial-gradient(circle,var(--w-acento-suave),transparent_70%)] blur-2xl" />
          <PaellaMini slug="paella-valenciana" nombre="" className="gira-lento relative w-full drop-shadow-[0_30px_40px_rgba(0,0,0,0.18)]" />
        </div>
      </div>

      <ul className="mx-auto mt-16 flex max-w-6xl flex-col gap-3 px-4 text-[14px] text-suave sm:flex-row sm:flex-wrap sm:gap-x-8 sm:px-6">
        {datos.map(({ icono: Icono, texto }) => (
          <li key={texto} className="flex items-center gap-2.5">
            <Icono className="size-4 shrink-0 text-tenue" strokeWidth={1.75} aria-hidden />
            {texto}
          </li>
        ))}
      </ul>
    </section>
  );
}
