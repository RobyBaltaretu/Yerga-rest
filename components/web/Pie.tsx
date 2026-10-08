import { getTranslations } from "next-intl/server";
import NextLink from "next/link";
import { Link } from "@/i18n/navigation";
import { getConfig } from "@/lib/datos-publicos";
import { CenefaAzulejo, LogoCompleto } from "@/components/marca/Marca";

export async function Pie() {
  const [t, c] = await Promise.all([getTranslations("web"), getConfig()]);
  return (
    <footer>
      <CenefaAzulejo />
      <div className="bg-brasa pb-28 pt-12 text-arroz/80 sm:pb-12">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <LogoCompleto tono="claro" sizes="220px" className="h-auto w-52" />
            <p className="mt-4 font-script text-3xl text-azafran">{t("marca.bienvenidos")}</p>
            <p className="mt-3 text-sm">{c.direccion}, {c.codigo_postal} {c.localidad}</p>
            <p className="text-sm"><a href={`tel:${c.telefono.replace(/\s/g, "")}`} className="underline-offset-4 hover:underline">{c.telefono}</a></p>
          </div>
          <nav aria-label="Legal" className="flex flex-col gap-2 text-sm sm:pt-6">
            <Link href="/aviso-legal" className="hover:text-arroz">{t("pie.legal")}</Link>
            <Link href="/privacidad" className="hover:text-arroz">{t("pie.privacidad")}</Link>
            <Link href="/cookies" className="hover:text-arroz">{t("pie.cookies")}</Link>
          </nav>
          <div className="flex flex-col gap-2 text-sm sm:pt-6">
            <Link href="/paella-valenciana" className="hover:text-arroz">{t("seo.paella.titulo")}</Link>
            <Link href="/arroceria" className="hover:text-arroz">{t("seo.arroceria.titulo", { localidad: c.localidad || "Valencia" })}</Link>
            <Link href="/comidas-de-grupo" className="hover:text-arroz">{t("seo.grupos.titulo")}</Link>
            <NextLink href="/panel" className="mt-2 text-xs text-arroz/60 hover:text-arroz">{t("pie.panel")}</NextLink>
          </div>
        </div>
        <p className="mx-auto mt-10 max-w-6xl px-4 text-xs text-arroz/60">{t("pie.derechos", { anio: 2026, nombre: c.nombre_local })}</p>
      </div>
    </footer>
  );
}
