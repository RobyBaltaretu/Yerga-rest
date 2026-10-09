import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getConfig } from "@/lib/datos-publicos";
import { formatFecha, formatHora } from "@/lib/format";
import { Link } from "@/i18n/navigation";
import { AceptarOferta } from "@/components/reserva/AceptarOferta";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

type Oferta = { nombre: string; comensales: number; inicio: string; hasta: string; estado: "vigente" | "caducada" | "aceptada"; codigo: string | null };

/** Oferta de mesa de la lista de espera: se acepta con un toque antes del plazo. */
export default async function OfertaEsperaPage({ params }: PageProps<"/[locale]/reservar/espera/[token]">) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("reserva.oferta");
  const valido = /^[0-9a-f-]{36}$/.test(token);
  const [{ data }, config] = await Promise.all([
    valido ? createAdminClient().rpc("oferta_espera", { p_token: token }) : Promise.resolve({ data: null }),
    getConfig(),
  ]);
  const o = data as Oferta | null;

  return (
    <main id="contenido" className="px-4 pb-24 pt-24 sm:pt-28">
      <div className="mx-auto max-w-xl">
        <h1 className="font-display text-4xl">{t("titulo")}</h1>
        <div className="mt-6 rounded-3xl bg-white p-6 ring-1 ring-tinta/10">
          {!o ? (
            <p>{t("noExiste")}</p>
          ) : o.estado === "aceptada" ? (
            <>
              <p className="font-display text-2xl">{t("aceptada")}</p>
              {o.codigo ? (
                <Link href={`/reservar/gestion/${o.codigo}`} className="mt-4 inline-flex min-h-12 items-center rounded-full bg-pimenton px-6 font-semibold text-white">{t("verReserva")}</Link>
              ) : null}
            </>
          ) : o.estado === "caducada" ? (
            <>
              <p className="font-display text-2xl">{t("caducada")}</p>
              <p className="mt-2 text-niebla">{t("caducadaTexto")}</p>
              <Link href="/reservar" className="mt-4 inline-flex min-h-12 items-center rounded-full bg-pimenton px-6 font-semibold text-white">{t("buscar")}</Link>
            </>
          ) : (
            <>
              <p className="text-lg">{t("hola", { nombre: o.nombre })}</p>
              <p className="mt-3 font-display text-2xl">{t("detalle", { n: o.comensales, fecha: formatFecha(o.inicio, locale), hora: formatHora(o.inicio) })}</p>
              <p className="mt-3 text-niebla">{t("plazo", { hasta: formatHora(o.hasta) })}</p>
              <AceptarOferta token={token} telefono={config.telefono} />
            </>
          )}
        </div>
      </div>
    </main>
  );
}
