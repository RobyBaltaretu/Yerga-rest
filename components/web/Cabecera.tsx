import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LogoWeb } from "./Logo";
import { EnlaceBoton } from "./movimiento";
import { AvisoDisponibilidad, MenuMovil, SelectorIdioma } from "./CabeceraCliente";

/** Cabecera de la web pública: barra fina translúcida con «Reservar mesa» siempre a mano. */
export async function Cabecera({ locale }: { locale: string }) {
  const t = await getTranslations("web.nav");
  const enlaces = [
    { href: "/#arroces", texto: t("arroces") },
    { href: "/carta", texto: t("carta") },
    { href: "/#producto", texto: t("producto") },
    { href: "/#casa", texto: t("casa") },
    { href: "/#llegar", texto: t("llegar") },
  ];
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-linea bg-fondo/80 backdrop-blur-xl backdrop-saturate-150">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:rounded-full focus:bg-superficie focus:px-4 focus:py-2 focus:text-sm focus:shadow-elevada"
      >
        {t("saltar")}
      </a>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="Arrocería Yerga" className="-m-1 rounded-lg p-1">
          <LogoWeb />
        </Link>
        <nav aria-label="Principal" className="hidden items-center gap-1 lg:flex">
          {enlaces.map((e) => (
            <Link key={e.href} href={e.href} className="rounded-full px-3 py-2 text-[14px] font-medium text-suave transition-colors hover:bg-sutil hover:text-texto">
              {e.texto}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <SelectorIdioma locale={locale} etiqueta={t("idioma")} />
          <span className="hidden sm:contents">
            <EnlaceBoton href="/reservar" tamano="sm">
              {t("reservar")}
            </EnlaceBoton>
          </span>
          <MenuMovil enlaces={enlaces} textos={{ menu: t("menu"), cerrar: t("cerrar"), reservar: t("reservar") }} />
        </div>
      </div>
      <AvisoDisponibilidad locale={locale} variante="cabecera" />
    </header>
  );
}
