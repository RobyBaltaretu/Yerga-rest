import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FlujoReserva } from "@/components/reserva/FlujoReserva";
import { getConfig, getPlatos, getZonas } from "@/lib/datos-publicos";
import { createAdminClient } from "@/lib/supabase/admin";
import { fechaLocal } from "@/lib/format";
import { tr } from "@/lib/i18n";
import { publicEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/reservar">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "reserva" });
  return { title: t("titulo"), description: t("subtitulo"), alternates: { languages: { es: "/es/reservar", "ca-ES-valencia": "/va/reservar", en: "/en/reservar" } } };
}

export default async function ReservarPage({ params, searchParams }: PageProps<"/[locale]/reservar">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations("reserva");

  const [config, zonas, platos, capacidad] = await Promise.all([
    getConfig(),
    getZonas(),
    getPlatos(),
    createAdminClient().rpc("capacidad_maxima_online"),
  ]);

  const arroces = platos
    .filter((p) => p.categoria === "arroz" && p.encargable)
    .map((p) => ({
      id: p.id,
      nombre: tr(p.nombre as Record<string, string>, locale),
      descripcion: tr(p.descripcion as Record<string, string>, locale),
      precio: p.precio,
      precio_por_persona: p.precio_por_persona,
      min_comensales: p.min_comensales,
    }));

  const fecha = typeof sp.fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.fecha) ? sp.fecha : undefined;
  const comensales = typeof sp.comensales === "string" ? Number(sp.comensales) || undefined : undefined;

  return (
    <main id="contenido" className="px-4 pb-24 pt-10 sm:pt-16">
      <div className="mx-auto max-w-xl">
        <h1 className="font-display text-4xl sm:text-5xl">{t("titulo")}</h1>
        <p className="mt-2 text-lg text-niebla">{t("subtitulo")}</p>
      </div>
      <div className="mt-8">
        <FlujoReserva
          locale={locale}
          hoy={fechaLocal()}
          maxDias={config.antelacion_max_dias}
          maxOnline={config.max_comensales_online}
          capacidadMax={capacidad.data ?? config.max_comensales_online}
          zonas={zonas}
          arroces={arroces}
          telefono={config.telefono}
          turnstileSiteKey={publicEnv.turnstileSiteKey}
          inicial={{ fecha, comensales }}
        />
      </div>
    </main>
  );
}
