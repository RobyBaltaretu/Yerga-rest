import { Fragment } from "react";
import { getTranslations } from "next-intl/server";
import { Flame, Timer, Wheat } from "lucide-react";
import { PaellaMini } from "./PaellaMini";
import { TarjetaReserva } from "./TarjetaReserva";
import { Adorno, CenefaAzulejo } from "@/components/marca/Marca";

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
    <>
    <section aria-labelledby="t-portada" className="papel relative overflow-hidden pb-16 pt-28 sm:pb-20 sm:pt-36">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-8">
        <div className="relative z-10">
          <h1 id="t-portada" aria-label={titular} className="max-w-[15ch] text-[clamp(2.75rem,6.6vw,5rem)] leading-[1.02]">
            {/* Cada palabra sube desde su línea (solo transformación: el texto nunca se oculta). */}
            {titular.split(" ").map((palabra, i) => (
              <Fragment key={i}>
                <span aria-hidden className="entrada-palabra">
                  <span style={{ ["--i" as string]: i }}>{palabra}</span>
                </span>{" "}
              </Fragment>
            ))}
          </h1>
          <div className="entrada-sube" style={{ ["--retraso" as string]: "520ms" }}>
            <Adorno className="mt-6" />
            <p className="mt-6 max-w-[38ch] text-lg leading-relaxed text-suave sm:text-xl">{subtitulo}</p>
          </div>
          <div id="tarjeta-reserva" className="entrada-sube mt-10 max-w-md" style={{ ["--retraso" as string]: "700ms" }}>
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

        <div aria-hidden className="relative mx-auto w-[min(72vw,300px)] sm:w-[min(60vw,420px)] lg:-mr-10 lg:w-full lg:max-w-[520px]">
          <div className="mesa-azulejo entrada-mesa absolute inset-[6%] rotate-[-4deg] rounded-[28px]" />
          <div className="entrada-paella relative">
            <PaellaMini slug="paella-valenciana" nombre="" className="gira-lento w-full drop-shadow-[0_30px_40px_rgba(0,0,0,0.18)]" />
            {/* Vapor que sube de la paella recién hecha. */}
            <svg viewBox="0 0 120 80" className="vapor pointer-events-none absolute -top-[12%] left-1/2 w-[34%] -translate-x-1/2 text-texto/25" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <path d="M30 78c-8-12 8-18 0-30s6-18 0-30" />
              <path d="M60 78c-8-12 8-18 0-30s6-18 0-30" />
              <path d="M90 78c-8-12 8-18 0-30s6-18 0-30" />
            </svg>
          </div>
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
    <CenefaAzulejo />
    </>
  );
}
