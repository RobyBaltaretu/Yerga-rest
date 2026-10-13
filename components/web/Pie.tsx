import { getTranslations } from "next-intl/server";
import NextLink from "next/link";
import { Link } from "@/i18n/navigation";
import { getConfig } from "@/lib/datos-publicos";
import { LogoCompletoWeb } from "./Logo";
import { CenefaAzulejo } from "@/components/marca/Marca";

export async function Pie() {
  const [t, c] = await Promise.all([getTranslations("web"), getConfig()]);
  const enlace = "text-suave transition-colors hover:text-texto";
  return (
    <footer className="text-[14px]">
      <CenefaAzulejo />
      <div className="papel pb-32 pt-14 sm:pb-14">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:grid-cols-[1.4fr_1fr_1fr] sm:px-6">
        <div>
          <LogoCompletoWeb className="h-auto w-44" sizes="176px" />
          <p className="mt-4 font-firma text-3xl text-cobre">{t("marca.bienvenidos")}</p>
          <p className="mt-4 text-suave">
            {c.direccion}, {c.codigo_postal} {c.localidad}
          </p>
          <p>
            <a href={`tel:${c.telefono.replace(/\s/g, "")}`} className={`${enlace} tabular-nums`}>
              {c.telefono}
            </a>
          </p>
        </div>
        <nav aria-label="Legal" className="flex flex-col gap-2.5">
          <Link href="/aviso-legal" className={enlace}>{t("pie.legal")}</Link>
          <Link href="/privacidad" className={enlace}>{t("pie.privacidad")}</Link>
          <Link href="/cookies" className={enlace}>{t("pie.cookies")}</Link>
        </nav>
        <div className="flex flex-col gap-2.5">
          <Link href="/paella-valenciana" className={enlace}>{t("seo.paella.titulo")}</Link>
          <Link href="/arroceria" className={enlace}>{t("seo.arroceria.titulo", { localidad: c.localidad || "Valencia" })}</Link>
          <Link href="/comidas-de-grupo" className={enlace}>{t("seo.grupos.titulo")}</Link>
          <NextLink href="/panel" className="mt-2 text-[13px] text-tenue transition-colors hover:text-texto">{t("pie.panel")}</NextLink>
        </div>
      </div>
      <p className="mx-auto mt-12 max-w-6xl px-4 text-[13px] text-tenue sm:px-6">{t("pie.derechos", { anio: 2026, nombre: c.nombre_local })}</p>
      </div>
    </footer>
  );
}
