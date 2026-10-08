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
    <main id="contenido" className="px-4 pb-24 pt-24 sm:pt-28">
      <div className="mx-auto max-w-xl">
        <h1 className="font-display text-4xl">{t("titulo")}</h1>
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
          <div className="mt-6 rounded-2xl bg-white p-6 ring-1 ring-tinta/10">
            <p>{t("noEncontrada")}</p>
            <Link href="/" className="mt-4 inline-block underline">{t("volver")}</Link>
          </div>
        )}
      </div>
    </main>
  );
}
