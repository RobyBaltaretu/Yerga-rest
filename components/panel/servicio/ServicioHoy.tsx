"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Printer, Shuffle } from "lucide-react";
import {
  ACTIVAS,
  avisosServicio,
  estadoMesaTexto,
  hora,
  situacionMesa,
  type BloqueoPanel,
  type EstadoMesa,
  type MesaPanel,
  type ReservaPanel,
  type SituacionMesa,
} from "@/lib/panel/estados";
import type { Combinacion, ElementoFijo, Zona } from "@/lib/panel/datos";
import type { ResolverMesa, Validez } from "@/components/floorplan/PlanoServicio";
import { estiloEstado } from "@/components/floorplan/estilos";
import { asignarMesas, bloquearMesa, cambiarEstado, crearReserva, desbloquear, mesasValidas, reorganizarTurno } from "@/app/panel/acciones";
import { useConexion } from "@/components/panel/TiempoReal";
import { Dialogo } from "@/components/ui/Dialogo";
import { TarjetaReserva } from "./TarjetaReserva";

const PlanoServicio = dynamic(() => import("@/components/floorplan/PlanoServicio"), {
  ssr: false,
  loading: () => <div className="aspect-[3/2] w-full animate-pulse rounded-2xl bg-arroz-2" />,
});

type Turno = { nombre: string; inicio: string; fin: string; ultima_hora: string };

type Props = {
  fecha: string;
  turno: string;
  turnos: Turno[];
  esHoy: boolean;
  ahoraServidor: number;
  inicioTurno: string;
  finTurno: string;
  reservas: ReservaPanel[];
  zonas: Zona[];
  mesas: MesaPanel[];
  elementos: ElementoFijo[];
  combinaciones: Combinacion[];
  distribuciones: Record<string, string | null>;
  bloqueos: BloqueoPanel[];
  reglas: { cortesia_min: number; aviso_conflicto_min: number; margen_min: number };
};

const motivos: Record<string, string> = {
  capacidad: "no cabe el grupo",
  ocupada: "ocupada a esa hora",
  bloqueada: "bloqueada",
  conflicto: "choca con otra reserva",
};

export function ServicioHoy(p: Props) {
  const router = useRouter();
  const { soloLectura } = useConexion();
  const [ahora, setAhora] = useState(p.ahoraServidor);
  const [instante, setInstante] = useState<number | null>(null);
  const [zona, setZona] = useState(p.zonas[0]?.id ?? "");
  const [vista, setVista] = useState<"lista" | "mapa">("lista");
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [juntar, setJuntar] = useState<string[]>([]);
  const [modoJuntar, setModoJuntar] = useState(false);
  const [validez, setValidez] = useState<Record<string, Validez> | null>(null);
  const [mensaje, setMensaje] = useState<{ texto: string; tipo: "ok" | "error"; forzar?: () => void } | null>(null);
  const [mesaAbierta, setMesaAbierta] = useState<string | null>(null);
  const [reorganizar, setReorganizar] = useState<Awaited<ReturnType<typeof reorganizarTurno>> | null>(null);
  const [arrastre, setArrastre] = useState<{ reservaId: string; nombre: string; x: number; y: number } | null>(null);
  const [filtro, setFiltro] = useState<"activas" | "todas">("activas");
  const [pendiente, startTransition] = useTransition();
  const resolver = useRef<ResolverMesa | null>(null);

  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const momento = instante ?? (p.esHoy ? ahora : Date.parse(p.inicioTurno));
  const esAhora = instante == null && p.esHoy;

  const delTurno = useMemo(
    () => p.reservas.filter((r) => (r.turno_nombre ?? p.turno) === p.turno),
    [p.reservas, p.turno],
  );
  const visibles = filtro === "activas" ? delTurno.filter((r) => ACTIVAS.includes(r.estado)) : delTurno;

  const situaciones = useMemo(() => {
    const out: Record<string, SituacionMesa> = {};
    for (const m of p.mesas) out[m.id] = situacionMesa(m.id, momento, p.reservas, p.bloqueos, esAhora);
    return out;
  }, [p.mesas, p.reservas, p.bloqueos, momento, esAhora]);

  const contadores = useMemo(() => {
    const esperados = delTurno.filter((r) => r.estado === "confirmada" || r.estado === "reconfirmada").reduce((s, r) => s + r.comensales, 0);
    const sentados = delTurno.filter((r) => r.estado === "sentada").reduce((s, r) => s + r.comensales, 0);
    const libres = p.mesas.filter((m) => situaciones[m.id]?.estado === "libre").length;
    return { esperados, sentados, libres };
  }, [delTurno, p.mesas, situaciones]);

  const avisos = useMemo(
    () => (p.esHoy ? avisosServicio(delTurno, ahora, { cortesiaMin: p.reglas.cortesia_min, avisoConflictoMin: p.reglas.aviso_conflicto_min }) : []),
    [delTurno, ahora, p.esHoy, p.reglas],
  );

  const mesasZona = p.mesas.filter((m) => m.zona_id === zona);
  const elementosZona = p.elementos.filter((e) => e.distribucion_id === p.distribuciones[zona]);

  // ---------------------------------------------------------------------------
  // Acciones
  // ---------------------------------------------------------------------------
  const ejecutar = (fn: () => Promise<{ ok: boolean; motivo?: string; conflicto?: string; aviso?: string; puede_forzar?: boolean }>, ok: string, forzar?: () => Promise<{ ok: boolean }>) =>
    startTransition(async () => {
      const r = await fn();
      if (r.ok) {
        setMensaje({ texto: r.aviso === "sin_mesa" ? `${ok} (sin mesa asignada)` : ok, tipo: "ok" });
        router.refresh();
      } else {
        setMensaje({
          texto: `No se ha podido: ${motivos[r.motivo ?? ""] ?? r.motivo ?? "error"}${r.conflicto ? ` (${r.conflicto})` : ""}`,
          tipo: "error",
          forzar: r.puede_forzar && forzar
            ? () =>
                startTransition(async () => {
                  const f = await forzar();
                  setMensaje(f.ok ? { texto: `${ok} (forzado)`, tipo: "ok" } : { texto: "Tampoco forzando", tipo: "error" });
                  router.refresh();
                })
            : undefined,
        });
      }
    });

  const accionEstado = (r: ReservaPanel, estado: Parameters<typeof cambiarEstado>[1]) => {
    if (estado === "cancelada" && !confirm(`¿Cancelar la reserva de ${r.nombre}?`)) return;
    const textos: Record<string, string> = { sentada: "Sentada", finalizada: "Mesa liberada", no_presentada: "Marcada como no presentada", cancelada: "Reserva cancelada", confirmada: "Hecho" };
    ejecutar(() => cambiarEstado(r.id, estado), `${r.nombre}: ${textos[estado]}`);
  };

  const prepararValidez = useCallback(async (reservaId: string) => {
    const lista = await mesasValidas(reservaId);
    setValidez(Object.fromEntries(lista.map((v) => [v.mesa_id, { valida: v.valida, motivo: v.motivo, conflicto: v.conflicto }])));
  }, []);

  const seleccionar = (r: ReservaPanel) => {
    if (seleccion === r.id) {
      setSeleccion(null);
      setValidez(null);
      setJuntar([]);
      return;
    }
    setSeleccion(r.id);
    setJuntar([]);
    setVista("mapa");
    void prepararValidez(r.id);
  };

  const asignar = useCallback(
    (reservaId: string, mesaIds: string[]) => {
      const r = p.reservas.find((x) => x.id === reservaId);
      if (!r) return;
      const nombres = mesaIds.map((id) => p.mesas.find((m) => m.id === id)?.nombre).join("+");
      if (r.mesas.length && r.mesas.map((m) => m.id).sort().join() === [...mesaIds].sort().join()) return;
      const mover = r.mesas.length ? `Mover a ${r.nombre} de ${r.mesas.map((m) => m.nombre).join("+")} a ${nombres}` : `Asignar ${nombres} a ${r.nombre}`;
      ejecutar(() => asignarMesas(reservaId, mesaIds), `${mover}: hecho`, () => asignarMesas(reservaId, mesaIds, true));
      setSeleccion(null);
      setValidez(null);
      setJuntar([]);
      setModoJuntar(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p.reservas, p.mesas],
  );

  const tocarMesa = (mesaId: string) => {
    if (!seleccion) {
      setMesaAbierta(mesaId);
      return;
    }
    const v = validez?.[mesaId];
    const mesa = p.mesas.find((m) => m.id === mesaId)!;
    if (modoJuntar) {
      // Juntar mesas para este servicio: se van sumando hasta pulsar «Asignar».
      if (v && !v.valida && v.motivo !== "capacidad") {
        setMensaje({ texto: `${mesa.nombre}: ${motivos[v.motivo ?? ""] ?? v.motivo}`, tipo: "error" });
        return;
      }
      setJuntar((j) => (j.includes(mesaId) ? j.filter((x) => x !== mesaId) : [...j, mesaId]));
      return;
    }
    if (v && !v.valida) {
      const pista = v.motivo === "capacidad" ? " Usa «Juntar mesas» para sumar varias." : "";
      setMensaje({ texto: `${mesa.nombre}: ${motivos[v.motivo ?? ""] ?? v.motivo}${v.conflicto ? ` (${v.conflicto})` : ""}.${pista}`, tipo: "error" });
      return;
    }
    asignar(seleccion, [mesaId]);
  };

  // Arrastre con puntero (ratón o dedo) desde la lista o desde una mesa.
  const empezarArrastre = (reserva: ReservaPanel, x: number, y: number) => {
    if (soloLectura) return;
    setArrastre({ reservaId: reserva.id, nombre: reserva.nombre, x, y });
    setSeleccion(reserva.id);
    void prepararValidez(reserva.id);
  };
  useEffect(() => {
    if (!arrastre) return;
    const mover = (e: PointerEvent) => setArrastre((a) => (a ? { ...a, x: e.clientX, y: e.clientY } : a));
    const moverTactil = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) setArrastre((a) => (a ? { ...a, x: t.clientX, y: t.clientY } : a));
    };
    const soltar = (cx: number, cy: number) => {
      const mesaId = resolver.current?.(cx, cy) ?? null;
      const id = arrastre.reservaId;
      setArrastre(null);
      if (!mesaId) return;
      const v = validez?.[mesaId];
      const mesa = p.mesas.find((m) => m.id === mesaId);
      if (v && !v.valida && v.motivo !== "capacidad") {
        setMensaje({ texto: `${mesa?.nombre}: ${motivos[v.motivo ?? ""] ?? v.motivo}${v.conflicto ? ` (${v.conflicto})` : ""}`, tipo: "error" });
        return;
      }
      asignar(id, [mesaId]);
    };
    const arriba = (e: PointerEvent) => soltar(e.clientX, e.clientY);
    const finTactil = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      if (t) soltar(t.clientX, t.clientY);
    };
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", arriba);
    window.addEventListener("touchmove", moverTactil, { passive: true });
    window.addEventListener("touchend", finTactil);
    return () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", arriba);
      window.removeEventListener("touchmove", moverTactil);
      window.removeEventListener("touchend", finTactil);
    };
  }, [arrastre, validez, asignar, p.mesas]);

  const registrarResolver = useCallback((fn: ResolverMesa | null) => {
    resolver.current = fn;
  }, []);

  // ---------------------------------------------------------------------------
  // Deslizador de hora
  // ---------------------------------------------------------------------------
  const desde = Date.parse(p.inicioTurno);
  const hasta = Date.parse(p.finTurno) + 60 * 60_000;
  const valorSlider = Math.min(hasta, Math.max(desde, momento));

  const seleccionada = p.reservas.find((r) => r.id === seleccion);
  const mesaSheet = p.mesas.find((m) => m.id === mesaAbierta);
  const situacionSheet = mesaAbierta ? situaciones[mesaAbierta] : null;
  const bloqueoSheet = mesaAbierta ? p.bloqueos.find((b) => b.mesa_id === mesaAbierta && Date.parse(b.hasta) > momento) : null;

  return (
    <div className="px-3 pb-24 pt-4 sm:px-6">
      {/* Turno, fecha y contadores */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {p.turnos.map((t) => (
            <Link
              key={t.nombre}
              href={`/panel?fecha=${p.fecha}&turno=${t.nombre}`}
              aria-current={t.nombre === p.turno ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded-full px-4 font-semibold capitalize ring-1 ${t.nombre === p.turno ? "bg-tinta text-arroz ring-tinta" : "bg-white ring-tinta/15"}`}
            >
              {t.nombre}
            </Link>
          ))}
          <form action="/panel" className="flex items-center gap-2">
            <input type="hidden" name="turno" value={p.turno} />
            <label className="sr-only" htmlFor="fecha-servicio">Fecha</label>
            <input id="fecha-servicio" type="date" name="fecha" defaultValue={p.fecha} className="min-h-11 rounded-full border-0 bg-white px-3 ring-1 ring-tinta/15" onChange={(e) => e.currentTarget.form?.requestSubmit()} />
          </form>
          {!p.esHoy ? <Link href="/panel" className="min-h-11 py-2.5 text-sm font-semibold underline underline-offset-4">Hoy</Link> : null}
        </div>
        <dl className="flex gap-2 text-center" aria-label="Contadores del turno">
          <Contador etiqueta="Esperados" valor={contadores.esperados} />
          <Contador etiqueta="Sentados" valor={contadores.sentados} />
          <Contador etiqueta="Mesas libres" valor={contadores.libres} />
        </dl>
      </div>

      {avisos.length ? (
        <ul className="mt-4 space-y-2" aria-label="Avisos">
          {avisos.map((a, i) => (
            <li key={i} className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm font-semibold ${a.tipo === "conflicto" ? "bg-pimenton text-white" : a.tipo === "retraso" ? "bg-azafran/40" : "bg-arroz-2"}`}>
              <span>{a.texto}</span>
              {a.tipo === "retraso" && !soloLectura ? (
                <span className="flex gap-2">
                  {a.reserva.telefono ? <a href={`tel:${a.reserva.telefono}`} className="rounded-full bg-white px-3 py-1.5 text-tinta">Llamar</a> : null}
                  <button type="button" className="rounded-full bg-tinta px-3 py-1.5 text-arroz" onClick={() => accionEstado(a.reserva, "no_presentada")}>Liberar</button>
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {mensaje ? (
        <div className={`mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${mensaje.tipo === "ok" ? "bg-huerta-claro text-huerta" : "bg-pimenton/15 text-pimenton-oscuro"}`} role="status">
          <span>{mensaje.texto}</span>
          <span className="flex gap-2">
            {mensaje.forzar ? <button type="button" onClick={mensaje.forzar} className="rounded-full bg-pimenton px-3 py-1.5 text-white">Forzar igualmente</button> : null}
            <button type="button" onClick={() => setMensaje(null)} className="rounded-full px-2 py-1.5 underline">Cerrar</button>
          </span>
        </div>
      ) : null}

      {/* Pestañas para pantallas estrechas */}
      <div className="mt-4 flex gap-2 lg:hidden" role="tablist">
        {(["lista", "mapa"] as const).map((v) => (
          <button key={v} type="button" role="tab" aria-selected={vista === v} onClick={() => setVista(v)} className={`min-h-11 flex-1 rounded-full font-semibold ${vista === v ? "bg-tinta text-arroz" : "bg-white ring-1 ring-tinta/15"}`}>
            {v === "lista" ? `Reservas (${visibles.length})` : "Mapa"}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(300px,1fr)_minmax(0,1.6fr)]">
        {/* Lista */}
        <section className={vista === "lista" ? "" : "hidden lg:block"} aria-label="Reservas del turno">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-xl">Reservas</h2>
            <div className="flex gap-1 text-sm">
              <button type="button" onClick={() => setFiltro("activas")} aria-pressed={filtro === "activas"} className={`min-h-10 rounded-full px-3 ${filtro === "activas" ? "bg-tinta text-arroz" : "bg-white"}`}>Activas</button>
              <button type="button" onClick={() => setFiltro("todas")} aria-pressed={filtro === "todas"} className={`min-h-10 rounded-full px-3 ${filtro === "todas" ? "bg-tinta text-arroz" : "bg-white"}`}>Todas</button>
            </div>
          </div>
          {visibles.length ? (
            <ul className="space-y-2">
              {visibles.map((r) => (
                <TarjetaReserva
                  key={r.id}
                  r={r}
                  ahora={ahora}
                  cortesiaMin={p.reglas.cortesia_min}
                  seleccionada={seleccion === r.id}
                  soloLectura={soloLectura || pendiente}
                  onAccion={(e) => accionEstado(r, e)}
                  onSeleccionar={() => seleccionar(r)}
                  onEmpezarArrastre={(x, y) => empezarArrastre(r, x, y)}
                />
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl bg-white p-6 text-center text-niebla ring-1 ring-tinta/10">No hay reservas en este turno.</p>
          )}
        </section>

        {/* Mapa */}
        <section className={vista === "mapa" ? "" : "hidden lg:block"} aria-label="Mapa de mesas">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1" role="tablist" aria-label="Zonas">
              {p.zonas.map((z) => (
                <button key={z.id} type="button" role="tab" aria-selected={zona === z.id} onClick={() => setZona(z.id)} className={`min-h-11 rounded-full px-4 font-semibold ${zona === z.id ? "bg-tinta text-arroz" : "bg-white ring-1 ring-tinta/15"}`}>
                  {z.nombre}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              {!soloLectura ? (
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center gap-1 rounded-full bg-white px-3 text-sm font-semibold ring-1 ring-tinta/15"
                  onClick={() => startTransition(async () => setReorganizar(await reorganizarTurno(p.fecha, p.turno, zona, false)))}
                >
                  <Shuffle className="size-4" aria-hidden /> Reorganizar turno
                </button>
              ) : null}
              <Link href={`/panel/hoja?fecha=${p.fecha}&turno=${p.turno}`} target="_blank" className="inline-flex min-h-11 items-center gap-1 rounded-full bg-white px-3 text-sm font-semibold ring-1 ring-tinta/15">
                <Printer className="size-4" aria-hidden /> Hoja del turno
              </Link>
            </div>
          </div>

          {seleccionada ? (
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-azafran/25 px-3 py-2 text-sm font-semibold">
              <span>
                Toca una mesa para {seleccionada.mesas.length ? "mover" : "sentar"} a {seleccionada.nombre} ({seleccionada.comensales} pax). Las válidas están resaltadas.
                {juntar.length ? ` Juntando: ${juntar.map((id) => p.mesas.find((m) => m.id === id)?.nombre).join("+")}` : ""}
              </span>
              <span className="flex gap-2">
                {juntar.length ? (
                  <button type="button" className="min-h-10 rounded-full bg-tinta px-3 text-arroz" onClick={() => asignar(seleccionada.id, juntar)}>Asignar {juntar.length} mesas</button>
                ) : null}
                <button type="button" aria-pressed={modoJuntar} className={`min-h-10 rounded-full px-3 ${modoJuntar ? "bg-tinta text-arroz" : "bg-white"}`} onClick={() => { setModoJuntar(!modoJuntar); setJuntar([]); }}>
                  Juntar mesas
                </button>
                <button type="button" className="rounded-full px-2 py-1.5 underline" onClick={() => { setSeleccion(null); setValidez(null); setJuntar([]); setModoJuntar(false); }}>Cancelar</button>
              </span>
            </div>
          ) : null}

          <PlanoServicio
            mesas={mesasZona}
            elementos={elementosZona}
            situaciones={situaciones}
            validez={seleccion ? validez : null}
            seleccionada={mesaAbierta}
            onTocarMesa={tocarMesa}
            onEmpezarArrastre={(mesaId, x, y) => {
              const s = situaciones[mesaId];
              const r = s?.actual ?? s?.siguiente;
              if (r) empezarArrastre(r, x, y);
            }}
            registrarResolver={registrarResolver}
          />

          {/* Alternativa accesible al plano: las mesas como lista de botones. */}
          <details className="mt-3 rounded-2xl bg-white p-3 ring-1 ring-tinta/10">
            <summary className="min-h-8 cursor-pointer text-sm font-semibold">Ver mesas como lista</summary>
            <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Mesas">
              {mesasZona.map((m) => {
                const s = situaciones[m.id];
                const v = seleccion ? validez?.[m.id] : undefined;
                return (
                  <li key={m.id}>
                    <button type="button" onClick={() => tocarMesa(m.id)} className={`min-h-11 w-full rounded-xl px-3 text-left text-sm ring-1 ${v && !v.valida ? "opacity-50 ring-tinta/10" : v?.valida ? "ring-2 ring-huerta" : "ring-tinta/15"}`}>
                      <span className="font-semibold">Mesa {m.nombre}</span> · {estadoMesaTexto[s?.estado ?? "libre"]}
                      {s?.actual ? ` · ${s.actual.nombre}` : s?.siguiente && s.estado === "proxima" ? ` · ${hora(s.siguiente.inicio)} ${s.siguiente.nombre}` : ""}
                    </button>
                  </li>
                );
              })}
            </ul>
          </details>

          {/* Deslizador: cómo estará la sala a otra hora del turno */}
          <div className="mt-3 rounded-2xl bg-white p-3 ring-1 ring-tinta/10">
            <div className="flex items-center justify-between text-sm">
              <label htmlFor="deslizador" className="font-semibold">
                {esAhora ? "Ahora" : `Sala a las ${hora(valorSlider)}`}
              </label>
              {instante != null ? (
                <button type="button" onClick={() => setInstante(null)} className="min-h-10 rounded-full bg-arroz px-3 font-semibold">Volver a ahora</button>
              ) : null}
            </div>
            <input
              id="deslizador"
              type="range"
              min={desde}
              max={hasta}
              step={15 * 60_000}
              value={valorSlider}
              onChange={(e) => setInstante(Number(e.target.value))}
              className="mt-2 h-11 w-full accent-pimenton"
              aria-valuetext={hora(valorSlider)}
            />
          </div>
          <Leyenda />
        </section>
      </div>

      {/* Fantasma del arrastre */}
      {arrastre ? (
        <div className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 rounded-full bg-tinta px-4 py-2 text-sm font-semibold text-arroz shadow-2xl" style={{ left: arrastre.x, top: arrastre.y }} aria-hidden>
          {arrastre.nombre}
        </div>
      ) : null}

      {/* Ficha de una mesa */}
      <Dialogo titulo={mesaSheet ? `Mesa ${mesaSheet.nombre} · ${estadoMesaTexto[situacionSheet?.estado ?? "libre"]}` : ""} abierto={Boolean(mesaSheet)} onCerrar={() => setMesaAbierta(null)}>
        {mesaSheet && situacionSheet ? (
          <FichaMesa
            mesa={mesaSheet}
            situacion={situacionSheet}
            bloqueo={bloqueoSheet ?? null}
            soloLectura={soloLectura}
            finTurno={p.finTurno}
            onEstado={(r, e) => {
              setMesaAbierta(null);
              accionEstado(r, e);
            }}
            onSinReserva={(n) => {
              setMesaAbierta(null);
              ejecutar(() => crearReserva({ origen: "puerta", comensales: n, mesas: [mesaSheet.id] }), `Mesa ${mesaSheet.nombre}: cliente sin reserva sentado`, () => crearReserva({ origen: "puerta", comensales: n, mesas: [mesaSheet.id] }, true));
            }}
            onBloquear={() => {
              setMesaAbierta(null);
              ejecutar(() => bloquearMesa(mesaSheet.id, new Date(momento).toISOString(), new Date(hasta).toISOString(), "Bloqueada en sala"), `Mesa ${mesaSheet.nombre} bloqueada para este turno`);
            }}
            onDesbloquear={(id) => {
              setMesaAbierta(null);
              ejecutar(() => desbloquear(id), `Mesa ${mesaSheet.nombre} desbloqueada`);
            }}
            onMover={(r) => {
              setMesaAbierta(null);
              seleccionar(r);
            }}
          />
        ) : null}
      </Dialogo>

      {/* Reorganizar turno: vista previa */}
      <Dialogo titulo="Reorganizar turno" abierto={Boolean(reorganizar)} onCerrar={() => setReorganizar(null)} ancho="max-w-2xl">
        {reorganizar ? (
          <div>
            {reorganizar.cambios === 0 ? (
              <p>La sala ya está bien aprovechada: no hay cambios que proponer.</p>
            ) : (
              <>
                <p className="text-sm text-niebla">Se recolocan las reservas no sentadas de la zona para dejar libres las mesas más útiles. Revisa los cambios:</p>
                <ul className="mt-3 divide-y divide-tinta/10">
                  {reorganizar.plan
                    .filter((x) => x.cambia || x.sin_sitio)
                    .map((x) => (
                      <li key={x.reserva_id} className="flex justify-between gap-3 py-2 text-sm">
                        <span>
                          <strong className="tabular-nums">{x.hora}</strong> {x.nombre} · {x.comensales} pax
                        </span>
                        <span className={x.sin_sitio ? "font-semibold text-pimenton-oscuro" : ""}>
                          {x.antes.join("+") || "—"} → {x.sin_sitio ? "sin sitio" : x.despues.join("+")}
                        </span>
                      </li>
                    ))}
                </ul>
              </>
            )}
            <div className="mt-5 flex gap-3">
              {reorganizar.cambios > 0 && !reorganizar.plan.some((x) => x.sin_sitio) ? (
                <button
                  type="button"
                  className="min-h-11 rounded-full bg-pimenton px-5 font-semibold text-white"
                  onClick={() => {
                    setReorganizar(null);
                    ejecutar(async () => {
                      const r = await reorganizarTurno(p.fecha, p.turno, zona, true);
                      return { ok: r.ok, motivo: r.motivo };
                    }, "Turno reorganizado");
                  }}
                >
                  Aplicar {reorganizar.cambios} cambios
                </button>
              ) : null}
              <button type="button" className="min-h-11 rounded-full bg-white px-5 font-semibold ring-1 ring-tinta/15" onClick={() => setReorganizar(null)}>Cerrar</button>
            </div>
          </div>
        ) : null}
      </Dialogo>
    </div>
  );
}

function Contador({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <div className="min-w-20 rounded-2xl bg-white px-3 py-2 ring-1 ring-tinta/10">
      <dt className="text-xs font-semibold uppercase tracking-wide text-niebla">{etiqueta}</dt>
      <dd className="font-display text-2xl tabular-nums">{valor}</dd>
    </div>
  );
}

function Leyenda() {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-label="Leyenda de estados">
      {(Object.keys(estiloEstado) as EstadoMesa[]).map((e) => (
        <li key={e} className="flex items-center gap-1.5">
          <span className="grid size-5 place-items-center rounded text-[11px] font-bold" style={{ background: estiloEstado[e].relleno, color: estiloEstado[e].texto, border: `2px solid ${estiloEstado[e].borde}` }} aria-hidden>
            {estiloEstado[e].icono}
          </span>
          {estadoMesaTexto[e]}
        </li>
      ))}
      <li className="flex items-center gap-1.5"><span className="size-3 rounded-sm bg-niebla" aria-hidden /> No reservable online</li>
      <li>⚕ alergias · ★ ocasión · ◉ arroz encargado</li>
    </ul>
  );
}

function FichaMesa({
  mesa,
  situacion,
  bloqueo,
  soloLectura,
  finTurno,
  onEstado,
  onSinReserva,
  onBloquear,
  onDesbloquear,
  onMover,
}: {
  mesa: MesaPanel;
  situacion: SituacionMesa;
  bloqueo: BloqueoPanel | null;
  soloLectura: boolean;
  finTurno: string;
  onEstado: (r: ReservaPanel, e: "sentada" | "finalizada") => void;
  onSinReserva: (n: number) => void;
  onBloquear: () => void;
  onDesbloquear: (id: string) => void;
  onMover: (r: ReservaPanel) => void;
}) {
  const { actual, siguiente } = situacion;
  void finTurno;
  return (
    <div className="space-y-4">
      <p className="text-sm text-niebla">
        Capacidad {mesa.capacidad_min}–{mesa.capacidad_max} · {mesa.sillas} sillas{mesa.tronas ? ` · ${mesa.tronas} trona` : ""}
        {mesa.plazas_silla_ruedas ? " · accesible" : ""}
        {!mesa.reservable_online ? " · reservada para la puerta" : ""}
      </p>
      {actual ? (
        <div className="rounded-2xl bg-white p-3 ring-1 ring-tinta/10">
          <p className="text-xs font-semibold uppercase text-niebla">Ahora</p>
          <p className="font-semibold">{actual.nombre} · {actual.comensales} pax · hasta {hora(actual.fin)}</p>
          {!soloLectura ? (
            <div className="mt-2 flex gap-2">
              <button type="button" className="min-h-11 rounded-full bg-tinta px-4 font-semibold text-arroz" onClick={() => onEstado(actual, "finalizada")}>Liberar mesa</button>
              <button type="button" className="min-h-11 rounded-full bg-arroz px-4 font-semibold ring-1 ring-tinta/10" onClick={() => onMover(actual)}>Mover</button>
            </div>
          ) : null}
        </div>
      ) : null}
      {siguiente ? (
        <div className="rounded-2xl bg-white p-3 ring-1 ring-tinta/10">
          <p className="text-xs font-semibold uppercase text-niebla">Siguiente</p>
          <p className="font-semibold">{hora(siguiente.inicio)} · {siguiente.nombre} · {siguiente.comensales} pax</p>
          {!soloLectura ? (
            <div className="mt-2 flex gap-2">
              {!actual ? <button type="button" className="min-h-11 rounded-full bg-tinta px-4 font-semibold text-arroz" onClick={() => onEstado(siguiente, "sentada")}>Sentar</button> : null}
              <button type="button" className="min-h-11 rounded-full bg-arroz px-4 font-semibold ring-1 ring-tinta/10" onClick={() => onMover(siguiente)}>Mover</button>
            </div>
          ) : null}
        </div>
      ) : null}
      {!soloLectura && !actual && !bloqueo ? (
        <div>
          <p className="text-sm font-semibold">Cliente sin reserva: ¿cuántos son?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {Array.from({ length: Math.max(mesa.capacidad_max, 2) }, (_, i) => i + 1).map((n) => (
              <button key={n} type="button" onClick={() => onSinReserva(n)} className="grid size-12 place-items-center rounded-xl bg-white text-lg font-semibold ring-1 ring-tinta/15 hover:bg-azafran/30">
                {n}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {!soloLectura ? (
        bloqueo ? (
          <button type="button" className="min-h-11 rounded-full bg-white px-4 font-semibold ring-1 ring-tinta/15" onClick={() => onDesbloquear(bloqueo.id)}>
            Desbloquear ({bloqueo.motivo})
          </button>
        ) : !actual ? (
          <button type="button" className="min-h-11 rounded-full bg-white px-4 font-semibold ring-1 ring-tinta/15" onClick={onBloquear}>
            Bloquear mesa el resto del turno
          </button>
        ) : null
      ) : null}
    </div>
  );
}
