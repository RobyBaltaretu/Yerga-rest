import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fechaLocal, intlLocale, sumarDias } from "@/lib/format";

export const dynamic = "force-dynamic";

const UMBRAL = 4; // se avisa cuando quedan pocas mesas

const textos = {
  es: { mesas: (n: number) => (n === 1 ? "Queda 1 mesa" : `Quedan ${n} mesas`), para: "para", hoy: "hoy", manana: "mañana", comida: "a mediodía", cena: "por la noche", el: "el" },
  va: { mesas: (n: number) => (n === 1 ? "Queda 1 taula" : `Queden ${n} taules`), para: "per a", hoy: "hui", manana: "demà", comida: "a migdia", cena: "per la nit", el: "el" },
  en: { mesas: (n: number) => (n === 1 ? "1 table left" : `${n} tables left`), para: "for", hoy: "today", manana: "tomorrow", comida: "lunch", cena: "dinner", el: "" },
};

/** Aviso de disponibilidad real para el botón de reservar. Vacío si no procede. */
export async function GET(request: NextRequest) {
  const locale = (request.nextUrl.searchParams.get("locale") ?? "es") as keyof typeof textos;
  const tx = textos[locale] ?? textos.es;
  const { data } = await createAdminClient().rpc("resumen_disponibilidad", { p_dias: 3 });
  const hoy = fechaLocal();
  const proximo = (data ?? []).find((d) => d.libres > 0 && d.libres <= UMBRAL);
  let texto: string | null = null;
  if (proximo) {
    const dia =
      proximo.fecha === hoy
        ? tx.hoy
        : proximo.fecha === sumarDias(hoy, 1)
          ? tx.manana
          : `${tx.el} ${new Intl.DateTimeFormat(intlLocale(locale), { weekday: "long", timeZone: "UTC" }).format(new Date(`${proximo.fecha}T12:00:00Z`))}`.trim();
    const turno = proximo.turno === "cena" ? tx.cena : tx.comida;
    texto =
      locale === "en"
        ? `${tx.mesas(proximo.libres)} ${tx.para} ${turno} ${dia}`
        : `${tx.mesas(proximo.libres)} ${tx.para} ${dia} ${turno}`;
  }
  return NextResponse.json(
    { texto, fecha: proximo?.fecha ?? null },
    { headers: { "cache-control": "no-store" } },
  );
}
