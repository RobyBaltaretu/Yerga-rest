"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Menu, X } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { LogoWeb } from "./Logo";
import { EnlaceBoton, muelle } from "./movimiento";

const nombres: Record<string, string> = { es: "Castellano", va: "Valencià", en: "English" };

/** Control segmentado de idioma: la píldora se desliza con el muelle. */
export function SelectorIdioma({ locale, etiqueta }: { locale: string; etiqueta: string }) {
  const ruta = usePathname();
  return (
    <nav aria-label={etiqueta} className="flex items-center rounded-full bg-sutil p-0.5 text-[12px] font-semibold">
      {(["es", "va", "en"] as const).map((l) => (
        <Link
          key={l}
          href={ruta}
          locale={l}
          lang={l === "va" ? "ca-ES-valencia" : l}
          aria-current={l === locale ? "true" : undefined}
          title={nombres[l]}
          className={`relative grid h-8 min-w-9 place-items-center rounded-full px-2 uppercase transition-colors ${l === locale ? "text-texto" : "text-suave hover:text-texto"}`}
        >
          {l === locale ? <motion.span layoutId="idioma-activo" className="absolute inset-0 rounded-full bg-superficie shadow-tarjeta" transition={muelle} /> : null}
          <span className="relative">{l}</span>
        </Link>
      ))}
    </nav>
  );
}

export function MenuMovil({ enlaces, textos }: { enlaces: { href: string; texto: string }[]; textos: { menu: string; cerrar: string; reservar: string } }) {
  const [abierto, setAbierto] = useState(false);
  useEffect(() => {
    if (!abierto) return;
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.documentElement.style.overflow = "hidden";
    window.addEventListener("keydown", tecla);
    return () => {
      document.documentElement.style.overflow = "";
      window.removeEventListener("keydown", tecla);
    };
  }, [abierto]);
  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label={textos.menu}
        aria-expanded={abierto}
        className="grid size-11 place-items-center rounded-full text-texto transition-colors hover:bg-sutil"
      >
        <Menu className="size-5" strokeWidth={1.75} />
      </button>
      <AnimatePresence>
        {abierto ? (
          <motion.div
            key="menu"
            className="fixed inset-0 z-50 flex flex-col bg-fondo"
            role="dialog"
            aria-modal="true"
            aria-label={textos.menu}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div className="flex h-16 items-center justify-between border-b border-linea px-4">
              <LogoWeb />
              <button
                type="button"
                autoFocus
                onClick={() => setAbierto(false)}
                aria-label={textos.cerrar}
                className="grid size-11 place-items-center rounded-full transition-colors hover:bg-sutil"
              >
                <X className="size-5" strokeWidth={1.75} />
              </button>
            </div>
            <nav className="flex flex-col px-4 pt-4">
              {enlaces.map((e, i) => (
                <motion.div key={e.href} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...muelle, delay: 0.03 * i }}>
                  <Link
                    href={e.href}
                    onClick={() => setAbierto(false)}
                    className="flex min-h-14 items-center justify-between border-b border-linea text-2xl font-medium tracking-[-0.02em]"
                  >
                    {e.texto}
                    <ArrowRight className="size-5 text-tenue" strokeWidth={1.75} aria-hidden />
                  </Link>
                </motion.div>
              ))}
            </nav>
            <div className="mt-auto px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
              <EnlaceBoton href="/reservar" tamano="lg" className="w-full" onClick={() => setAbierto(false)}>
                {textos.reservar}
              </EnlaceBoton>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/**
 * Aviso de disponibilidad real («Quedan 3 mesas para el domingo a mediodía»).
 * Solo aparece cuando es cierto; se pide al servidor después de cargar la página.
 */
// Una sola petición por página aunque el aviso aparezca en varios sitios.
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

export function useAvisoDisponibilidad(locale: string) {
  const [texto, setTexto] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    void pedirAviso(locale).then((t) => vivo && setTexto(t));
    return () => {
      vivo = false;
    };
  }, [locale]);
  return texto;
}

/** Punto que late: indica que el dato es en vivo. */
export function PuntoVivo() {
  return (
    <span className="relative flex size-2" aria-hidden>
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-acento opacity-60 motion-reduce:hidden" />
      <span className="relative inline-flex size-2 rounded-full bg-acento" />
    </span>
  );
}

export function AvisoDisponibilidad({ locale, variante }: { locale: string; variante: "cabecera" | "fijo" | "tarjeta" }) {
  const texto = useAvisoDisponibilidad(locale);
  if (!texto) return null;
  if (variante === "cabecera") {
    return (
      <p className="hidden items-center justify-center gap-2 border-t border-linea py-1.5 text-[13px] font-medium text-suave sm:flex">
        <PuntoVivo />
        {texto}
      </p>
    );
  }
  return (
    <p className={`flex items-center justify-center gap-2 text-[13px] font-medium ${variante === "fijo" ? "text-suave" : "text-texto"}`}>
      <PuntoVivo />
      {texto}
    </p>
  );
}

/** Botón fijo abajo en móvil: siempre visible menos en el propio flujo de reserva. */
export function BotonReservaFijo({ locale }: { locale: string }) {
  const t = useTranslations("web.nav");
  const ruta = usePathname();
  if (ruta.startsWith("/reservar")) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-linea bg-fondo/85 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur-xl sm:hidden">
      <EnlaceBoton href="/reservar" tamano="lg" className="w-full">
        {t("reservar")}
      </EnlaceBoton>
      <div className="mt-2 empty:hidden">
        <AvisoDisponibilidad locale={locale} variante="fijo" />
      </div>
    </div>
  );
}
