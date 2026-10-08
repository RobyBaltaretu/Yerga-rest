"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Menu, X } from "lucide-react";
import { Adorno, LogoHorizontal } from "@/components/marca/Marca";

const nombres: Record<string, string> = { es: "Castellano", va: "Valencià", en: "English" };

export function SelectorIdioma({ locale, etiqueta }: { locale: string; etiqueta: string }) {
  const ruta = usePathname();
  return (
    <nav aria-label={etiqueta} className="flex items-center rounded-full bg-white/10 p-0.5 text-xs font-semibold">
      {(["es", "va", "en"] as const).map((l) => (
        <Link
          key={l}
          href={ruta}
          locale={l}
          lang={l === "va" ? "ca-ES-valencia" : l}
          aria-current={l === locale ? "true" : undefined}
          title={nombres[l]}
          className={`grid h-9 min-w-9 place-items-center rounded-full px-2 uppercase ${l === locale ? "bg-arroz text-tinta" : "text-arroz hover:bg-white/10"}`}
        >
          {l}
        </Link>
      ))}
    </nav>
  );
}

export function MenuMovil({ enlaces, textos }: { enlaces: { href: string; texto: string }[]; textos: { menu: string; cerrar: string } }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="lg:hidden">
      <button type="button" onClick={() => setAbierto(true)} aria-label={textos.menu} aria-expanded={abierto} className="grid size-11 place-items-center rounded-full hover:bg-white/10">
        <Menu className="size-6" />
      </button>
      {abierto ? (
        <div className="fixed inset-0 z-50 bg-brasa text-arroz" role="dialog" aria-modal="true" aria-label={textos.menu}>
          <div className="flex h-16 items-center justify-between px-4">
            <LogoHorizontal />
            <button type="button" onClick={() => setAbierto(false)} aria-label={textos.cerrar} className="grid size-11 place-items-center rounded-full hover:bg-white/10">
              <X className="size-6" />
            </button>
          </div>
          <nav className="flex flex-col gap-2 px-6 pt-6">
            {enlaces.map((e) => (
              <Link key={e.href} href={e.href} onClick={() => setAbierto(false)} className="py-3 font-display text-3xl">
                {e.texto}
              </Link>
            ))}
          </nav>
          <Adorno oscuro className="mt-10 justify-center" />
        </div>
      ) : null}
    </div>
  );
}

/**
 * Aviso de disponibilidad real («Quedan 3 mesas para el domingo a mediodía»).
 * Solo aparece cuando es cierto; se pide al servidor después de cargar la página.
 */
// Una sola petición por página aunque el aviso aparezca en dos sitios.
const pendientes = new Map<string, Promise<string | null>>();
function pedirAviso(locale: string) {
  if (!pendientes.has(locale)) {
    pendientes.set(
      locale,
      fetch(`/api/disponibilidad?locale=${locale}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d: { texto: string | null }) => d.texto)
        .catch(() => null),
    );
    // Se vuelve a consultar al cabo de un minuto (la disponibilidad cambia).
    setTimeout(() => pendientes.delete(locale), 60_000);
  }
  return pendientes.get(locale)!;
}

export function AvisoDisponibilidad({ locale, variante }: { locale: string; variante: "cabecera" | "fijo" }) {
  const [texto, setTexto] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    void pedirAviso(locale).then((t) => vivo && setTexto(t));
    return () => {
      vivo = false;
    };
  }, [locale]);
  if (!texto) return null;
  if (variante === "cabecera") {
    return <p className="hidden bg-azafran py-1 text-center text-xs font-semibold text-brasa sm:block">{texto}</p>;
  }
  return <p className="text-center text-xs font-semibold text-brasa">{texto}</p>;
}

/** Botón fijo abajo en móvil: siempre visible menos en el propio flujo de reserva. */
export function BotonReservaFijo({ locale }: { locale: string }) {
  const t = useTranslations("web.nav");
  const ruta = usePathname();
  if (ruta.startsWith("/reservar")) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 bg-azafran/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-8px_24px_rgba(0,0,0,0.15)] backdrop-blur sm:hidden">
      <Link href="/reservar" className="flex min-h-12 items-center justify-center rounded-full bg-pimenton text-lg font-semibold text-white">
        {t("reservar")}
      </Link>
      <div className="mt-1">
        <AvisoDisponibilidad locale={locale} variante="fijo" />
      </div>
    </div>
  );
}
