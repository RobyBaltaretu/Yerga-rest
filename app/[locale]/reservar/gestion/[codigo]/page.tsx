import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getConfig } from "@/lib/datos-publicos";
import { fechaLocal } from "@/lib/format";
import { GestionReserva, type ReservaCliente } from "@/components/reserva/GestionReserva";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function GestionPage({ params, searchParams }: PageProps<"/[locale]/reservar/gestion/[codigo]">) {
  const { locale, codigo } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations("reserva.gestion");
  const [{ data }, config] = await Promise.all([
    createAdminClient().rpc("reserva_por_codigo", { p_codigo: decodeURIComponent(codigo) }),
    getConfig(),
  ]);
  const reserva = data as ReservaCliente | null;

  return (
    <main id="contenido" className="px-4 pb-24 pt-28 sm:px-6 sm:pt-36">
      <div className="mx-auto max-w-xl">
        <h1 className="text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.02]">{t("titulo")}</h1>
        {reserva ? (
          <GestionReserva
            locale={locale}
            reserva={reserva}
            telefono={config.telefono}
            hoy={fechaLocal()}
            maxDias={config.antelacion_max_dias}
            maxOnline={config.max_comensales_online}
            destacarConfirmar={sp.accion === "confirmar"}
          />
        ) : (
          <div className="mt-6 rounded-3xl bg-superficie p-6 shadow-tarjeta">
            <p>{t("noEncontrada")}</p>
            <Link href="/" className="enlace mt-4 inline-block">{t("volver")}</Link>
          </div>
        )}
      </div>
    </main>
  );
}
