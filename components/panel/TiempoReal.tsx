"use client";

import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/client";

type Conexion = { enLinea: boolean; soloLectura: boolean; ultimaActualizacion: number };

const ContextoConexion = createContext<Conexion>({ enLinea: true, soloLectura: false, ultimaActualizacion: 0 });
export const useConexion = () => useContext(ContextoConexion);

type Novedad = { id: string; texto: string };

/**
 * Mantiene el panel al día en todas las tabletas: escucha los cambios de reservas,
 * asignaciones, bloqueos y lista de espera y vuelve a pedir los datos al servidor.
 * Si se cae la conexión, el panel queda en modo lectura con la última situación.
 */
export function TiempoReal({ children }: { children: ReactNode }) {
  const router = useRouter();
  const enLinea = useSyncExternalStore(suscribirRed, () => navigator.onLine, () => true);
  const [canal, setCanal] = useState<"conectando" | "ok" | "caido">("conectando");
  const [ultima, setUltima] = useState(0);
  const [novedades, setNovedades] = useState<Novedad[]>([]);
  const sonidoGuardado = useSyncExternalStore(suscribirSonido, leerSonido, () => false);
  const [sonidoElegido, setSonido] = useState<boolean | null>(null);
  const sonido = sonidoElegido ?? sonidoGuardado;
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sonidoRef = useRef(sonido);

  useEffect(() => {
    sonidoRef.current = sonido;
  }, [sonido]);

  useEffect(() => {
    const supabase = getBrowserClient();
    const refrescar = () => {
      if (temporizador.current) clearTimeout(temporizador.current);
      temporizador.current = setTimeout(() => {
        router.refresh();
        setUltima(Date.now());
      }, 250);
    };
    const ch = supabase.channel("panel-sala");
    for (const tabla of ["reserva", "asignacion", "bloqueo", "lista_espera", "encargo_arroz"]) {
      ch.on("postgres_changes", { event: "*", schema: "public", table: tabla }, (payload) => {
        refrescar();
        if (tabla === "reserva") avisar(payload as unknown as { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> });
      });
    }
    ch.subscribe((estado) => {
      if (estado === "SUBSCRIBED") {
        setCanal("ok");
        refrescar();
      } else if (estado === "CHANNEL_ERROR" || estado === "TIMED_OUT" || estado === "CLOSED") setCanal("caido");
    });

    function avisar(p: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) {
      const r = p.new;
      let texto: string | null = null;
      if (p.eventType === "INSERT" && r.origen === "web") texto = `Nueva reserva web: ${r.nombre} · ${r.comensales} pax`;
      else if (p.eventType === "UPDATE" && r.estado === "cancelada" && r.cancelada_por === "cliente") texto = `Cancelada por el cliente: ${r.nombre}`;
      else if (p.eventType === "UPDATE" && r.origen === "web" && r.estado === "confirmada" && r.recordatorio_enviado_en == null && r.inicio !== p.old?.inicio && p.old?.inicio) texto = `Reserva modificada: ${r.nombre}`;
      if (!texto) return;
      const id = `${Date.now()}-${Math.random()}`;
      setNovedades((n) => [...n, { id, texto: texto! }]);
      setTimeout(() => setNovedades((n) => n.filter((x) => x.id !== id)), 8000);
      if (sonidoRef.current) campanita();
    }

    return () => {
      supabase.removeChannel(ch);
    };
  }, [router]);

  const soloLectura = !enLinea;
  const conexion = { enLinea: enLinea && canal !== "caido", soloLectura, ultimaActualizacion: ultima };

  return (
    <ContextoConexion.Provider value={conexion}>
      {!enLinea ? (
        <div className="sticky top-0 z-50 bg-pimenton px-4 py-2 text-center text-sm font-semibold text-white" role="alert">
          Sin conexión: se muestra la última situación conocida y no se pueden hacer cambios. Usa la hoja del turno impresa si hace falta.
        </div>
      ) : canal === "caido" ? (
        <div className="bg-azafran px-4 py-1.5 text-center text-sm font-semibold text-brasa" role="status">
          Reconectando con el servidor… los datos pueden no estar al día.
        </div>
      ) : null}
      {children}
      <div className="pointer-events-none fixed bottom-20 right-4 z-50 flex flex-col items-end gap-2" aria-live="polite">
        {novedades.map((n) => (
          <div key={n.id} className="pointer-events-auto rounded-2xl bg-brasa px-4 py-3 text-sm font-semibold text-arroz shadow-xl">
            {n.texto}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          const v = !sonido;
          setSonido(v);
          try {
            localStorage.setItem("yerga-sonido", v ? "1" : "0");
          } catch {
            /* sin almacenamiento */
          }
          if (v) campanita();
        }}
        className="fixed bottom-4 right-4 z-40 hidden min-h-10 rounded-full bg-white px-3 text-xs font-semibold shadow ring-1 ring-tinta/10 lg:block"
        aria-pressed={sonido}
      >
        {sonido ? "🔔 Sonido activado" : "🔕 Sonido desactivado"}
      </button>
    </ContextoConexion.Provider>
  );
}

function suscribirRed(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

function suscribirSonido(cb: () => void) {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}

function leerSonido() {
  try {
    return localStorage.getItem("yerga-sonido") === "1";
  } catch {
    return false;
  }
}

/** Aviso sonoro corto sintetizado (sin archivos de audio). */
function campanita() {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(880, ctx.currentTime);
    o.frequency.setValueAtTime(1320, ctx.currentTime + 0.12);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.5);
  } catch {
    /* sin audio */
  }
}
