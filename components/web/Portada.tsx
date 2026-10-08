import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Paella } from "./Paella";
import { ControlesPortada } from "./PortadaAnimada";
import { VinetasPortada } from "./VinetasPortada";
import { Termino } from "./Termino";
import { CenefaAzulejo, LogoCompleto } from "@/components/marca/Marca";

const ingredientes = [
  { va: "pollastre", es: "pollo", en: "chicken", pos: "left-[6%] top-[30%]" },
  { va: "conill", es: "conejo", en: "rabbit", pos: "right-[6%] top-[34%]" },
  { va: "garrofó", es: "judía garrofón", en: "lima bean", pos: "left-[10%] bottom-[30%]" },
  { va: "bajoqueta", es: "judía verde plana", en: "flat green bean", pos: "right-[8%] bottom-[32%]" },
];

/** Portada «Del fuego al socarrat»: animada con el scroll o, si no procede, en viñetas. */
export async function Portada({ locale, titular, subtitulo }: { locale: string; titular: string; subtitulo: string }) {
  const t = await getTranslations("web");
  const escenas = t.raw("portada.escenas") as string[];
  const textos = [t("portada.fuego"), t("portada.sofrito"), t("portada.ingredientes"), t("portada.caldo"), t("portada.socarrat")];

  const final = (
    <>
      <h2 className="max-w-3xl font-display text-4xl leading-tight text-arroz drop-shadow-[0_2px_20px_rgba(0,0,0,0.6)] sm:text-6xl">{titular}</h2>
      <p className="mt-3 max-w-xl text-lg text-arroz/90 drop-shadow">{subtitulo}</p>
      <Link href="/reservar" className="pointer-events-auto mt-6 inline-flex min-h-12 items-center rounded-full bg-pimenton px-7 text-lg font-semibold text-white shadow-xl hover:bg-pimenton-oscuro">
        {t("nav.reservar")}
      </Link>
    </>
  );

  return (
    <>
      <section className="portada-animada relative h-[500vh] bg-brasa text-arroz" aria-label={escenas.join(" · ")}>
        <div className="sticky top-0 flex h-dvh flex-col items-center justify-center overflow-hidden">
        <div className="portada-marca absolute inset-x-0 top-[calc(4rem+2dvh)] z-10 flex flex-col items-center text-center">
          <h1>
            <LogoCompleto tono="claro" preload className="logo-brasa h-auto w-[min(56vw,250px)] sm:w-[220px]" />
          </h1>
          <p className="mt-1 text-sm text-arroz/70">{t("portada.desliza")} ↓</p>
        </div>
        <Paella nGranos={150} nBrasas={34} etiqueta={t("portada.estatica")} className="cursor-cuchara mt-[12dvh] h-auto w-[min(84vw,60dvh)] sm:mt-[20dvh] sm:w-[min(84vw,54dvh)]" />
        {ingredientes.map((i) => (
          <span key={i.va} className={`portada-etiqueta pointer-events-none absolute ${i.pos} rounded-full bg-brasa/80 px-3 py-1 font-display text-lg text-azafran opacity-0 ring-1 ring-azafran/40 sm:text-2xl`}>
            {i.va}
            {locale !== "va" ? <span className="ml-2 font-sans text-xs text-arroz/70">{locale === "en" ? i.en : i.es}</span> : null}
          </span>
        ))}
          <ControlesPortada escenas={escenas} textos={textos} sonido={{ off: t("portada.sonido"), on: t("portada.sonidoOn") }} />
          <div className="portada-final absolute inset-x-0 top-[12%] flex flex-col items-center px-4 text-center opacity-0">{final}</div>
        </div>
      </section>

      <section className="portada-estatica bg-brasa px-4 pb-16 pt-24 text-arroz">
        <div className="mx-auto max-w-5xl text-center">
          <h1 className="flex justify-center">
            <LogoCompleto tono="claro" className="h-auto w-[min(70vw,320px)]" />
          </h1>
          <div className="mt-8 flex flex-col items-center">{final}</div>
          <p className="mt-12 text-arroz/80">{t("portada.estatica")}</p>
          <VinetasPortada escenas={escenas} textos={textos} />
          {locale !== "va" ? (
            <p className="mt-6 text-sm text-arroz/70">
              {ingredientes.map((i, n) => (
                <span key={i.va}>
                  {n ? " · " : ""}
                  <Termino va={i.va} traduccion={locale === "en" ? i.en : i.es} oscuro />
                </span>
              ))}
            </p>
          ) : null}
        </div>
      </section>
      <CenefaAzulejo />
    </>
  );
}
