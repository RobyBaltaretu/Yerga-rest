import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LogoHorizontal } from "@/components/marca/Marca";
import { MenuMovil, SelectorIdioma, AvisoDisponibilidad } from "./CabeceraCliente";

/** Cabecera de la web pública con el botón «Reservar mesa» siempre a mano. */
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
    <header className="fixed inset-x-0 top-0 z-40 bg-brasa/95 text-arroz backdrop-blur">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:rounded-full focus:bg-arroz focus:px-4 focus:py-2 focus:text-tinta">
        {t("saltar")}
      </a>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" aria-label="Arrocería Yerga"><LogoHorizontal /></Link>
        <nav aria-label="Principal" className="hidden items-center gap-6 text-sm font-semibold lg:flex">
          {enlaces.map((e) => (
            <Link key={e.href} href={e.href} className="text-arroz/85 transition-colors hover:text-azafran">{e.texto}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <SelectorIdioma locale={locale} etiqueta={t("idioma")} />
          <div className="hidden flex-col items-end sm:flex">
            <Link href="/reservar" className="inline-flex min-h-11 items-center rounded-full bg-pimenton px-5 font-semibold text-white hover:bg-pimenton-oscuro">
              {t("reservar")}
            </Link>
          </div>
          <MenuMovil enlaces={enlaces} textos={{ menu: t("menu"), cerrar: t("cerrar") }} />
        </div>
      </div>
      <AvisoDisponibilidad locale={locale} variante="cabecera" />
    </header>
  );
}
