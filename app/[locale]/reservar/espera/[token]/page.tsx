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
    <main id="contenido" className="px-4 pb-24 pt-28 sm:px-6 sm:pt-36">
      <div className="mx-auto max-w-xl">
        <h1 className="text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.02]">{t("titulo")}</h1>
        <div className="mt-6 rounded-3xl bg-superficie p-6 shadow-tarjeta">
          {!o ? (
            <p>{t("noExiste")}</p>
          ) : o.estado === "aceptada" ? (
            <>
              <p className="text-xl font-semibold tracking-[-0.02em]">{t("aceptada")}</p>
              {o.codigo ? (
                <Link href={`/reservar/gestion/${o.codigo}`} className="mt-4 inline-flex min-h-12 items-center justify-center rounded-full bg-texto px-6 font-medium text-invertido shadow-tarjeta transition-colors hover:bg-texto/88 active:scale-[0.98]">{t("verReserva")}</Link>
              ) : null}
            </>
          ) : o.estado === "caducada" ? (
            <>
              <p className="text-xl font-semibold tracking-[-0.02em]">{t("caducada")}</p>
              <p className="mt-2 text-niebla">{t("caducadaTexto")}</p>
              <Link href="/reservar" className="mt-4 inline-flex min-h-12 items-center justify-center rounded-full bg-texto px-6 font-medium text-invertido shadow-tarjeta transition-colors hover:bg-texto/88 active:scale-[0.98]">{t("buscar")}</Link>
            </>
          ) : (
            <>
              <p className="text-lg">{t("hola", { nombre: o.nombre })}</p>
              <p className="mt-3 text-xl font-semibold tracking-[-0.02em]">{t("detalle", { n: o.comensales, fecha: formatFecha(o.inicio, locale), hora: formatHora(o.inicio) })}</p>
              <p className="mt-3 text-niebla">{t("plazo", { hasta: formatHora(o.hasta) })}</p>
              <AceptarOferta token={token} telefono={config.telefono} />
            </>
          )}
        </div>
      </div>
    </main>
  );
}
