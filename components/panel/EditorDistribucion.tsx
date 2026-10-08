"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useReducer, useRef, useState, useTransition } from "react";
import { Copy, Link2, Redo2, Trash2, Undo2 } from "lucide-react";
import type { Borrador } from "@/lib/panel/borrador";
import { descartarBorrador, guardarBorrador, publicar, type ResultadoPublicar } from "@/app/panel/mapa-acciones";
import { Dialogo } from "@/components/ui/Dialogo";
import { Boton } from "@/components/ui/Boton";
import { useRecargar } from "@/components/panel/DatosPanel";

const LienzoEditor = dynamic(() => import("@/components/floorplan/LienzoEditor"), {
  ssr: false,
  loading: () => <div className="aspect-[3/2] w-full animate-pulse rounded-2xl bg-arroz-2" />,
});

type Mesa = Borrador["mesas"][number];
type Elemento = Borrador["elementos"][number];

const tiposElemento: { tipo: Elemento["tipo"]; texto: string; ancho: number; alto: number }[] = [
  { tipo: "pared", texto: "Pared", ancho: 300, alto: 12 },
  { tipo: "barra", texto: "Barra", ancho: 200, alto: 60 },
  { tipo: "columna", texto: "Columna", ancho: 36, alto: 36 },
  { tipo: "puerta", texto: "Puerta", ancho: 100, alto: 16 },
  { tipo: "ventana", texto: "Ventana", ancho: 200, alto: 14 },
  { tipo: "cocina", texto: "Paso a cocina", ancho: 120, alto: 16 },
  { tipo: "planta", texto: "Planta", ancho: 40, alto: 40 },
];

const formasNuevas: Record<Mesa["forma"], Pick<Mesa, "ancho" | "alto" | "sillas">> = {
  redonda: { ancho: 80, alto: 80, sillas: 4 },
  cuadrada: { ancho: 80, alto: 80, sillas: 4 },
  rectangular: { ancho: 160, alto: 80, sillas: 6 },
};

const MAX_HISTORIAL = 80;

type Historial = { doc: Borrador; pasado: Borrador[]; futuro: Borrador[] };
type Accion = { tipo: "aplicar"; fn: (d: Borrador) => Borrador } | { tipo: "deshacer" } | { tipo: "rehacer" };

/** Deshacer y rehacer: pila de estados del borrador. */
function historial(h: Historial, a: Accion): Historial {
  if (a.tipo === "aplicar") {
    const nuevo = a.fn(h.doc);
    if (nuevo === h.doc) return h;
    return { doc: nuevo, pasado: [...h.pasado.slice(-MAX_HISTORIAL), h.doc], futuro: [] };
  }
  if (a.tipo === "deshacer") {
    if (!h.pasado.length) return h;
    return { doc: h.pasado[h.pasado.length - 1], pasado: h.pasado.slice(0, -1), futuro: [h.doc, ...h.futuro] };
  }
  if (!h.futuro.length) return h;
  return { doc: h.futuro[0], pasado: [...h.pasado, h.doc], futuro: h.futuro.slice(1) };
}

export function EditorDistribucion({
  distId,
  nombre,
  zona,
  prefijo,
  inicial,
  pendiente: pendienteInicial,
  estado,
}: {
  distId: string;
  nombre: string;
  zona: string;
  prefijo: string;
  inicial: Borrador;
  pendiente: boolean;
  estado: "borrador" | "publicada";
}) {
  const recargar = useRecargar();
  const [{ doc, pasado, futuro }, despachar] = useReducer(historial, { doc: inicial, pasado: [], futuro: [] });
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [multiple, setMultiple] = useState(false);
  const [ajustar, setAjustar] = useState(true);
  const [guardado, setGuardado] = useState<"guardado" | "guardando" | "error">("guardado");
  const [cambiosSinPublicar, setCambiosSinPublicar] = useState(pendienteInicial);
  const [combiResaltada, setCombiResaltada] = useState<string | null>(null);
  const [previa, setPrevia] = useState<ResultadoPublicar | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [publicando, startTransition] = useTransition();
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const primeraVez = useRef(true);

  // Autoguardado del borrador (no afecta al servicio hasta publicar).
  useEffect(() => {
    if (primeraVez.current) {
      primeraVez.current = false;
      return;
    }
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(async () => {
      setGuardado("guardando");
      const r = await guardarBorrador(distId, doc);
      setGuardado(r.ok ? "guardado" : "error");
      if (r.ok) setCambiosSinPublicar(true);
    }, 800);
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, [doc, distId]);

  const aplicar = useCallback((fn: (d: Borrador) => Borrador) => despachar({ tipo: "aplicar", fn }), []);
  const deshacer = useCallback(() => despachar({ tipo: "deshacer" }), []);
  const rehacer = useCallback(() => despachar({ tipo: "rehacer" }), []);

  const borrar = useCallback(() => {
    if (!seleccion.length) return;
    aplicar((d) => ({
      mesas: d.mesas.filter((m) => !seleccion.includes(m.id)),
      elementos: d.elementos.filter((e) => !seleccion.includes(e.id)),
      combinaciones: d.combinaciones.filter((c) => !c.mesas.some((m) => seleccion.includes(m))),
    }));
    setSeleccion([]);
  }, [seleccion, aplicar]);

  // Atajos de teclado: Supr, Ctrl+Z, Ctrl+Y y flechas para mover.
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) rehacer();
        else deshacer();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        rehacer();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        borrar();
      } else if (e.key.startsWith("Arrow") && seleccion.length) {
        e.preventDefault();
        const paso = e.shiftKey ? 50 : 10;
        const dx = e.key === "ArrowLeft" ? -paso : e.key === "ArrowRight" ? paso : 0;
        const dy = e.key === "ArrowUp" ? -paso : e.key === "ArrowDown" ? paso : 0;
        aplicar((d) => ({
          ...d,
          mesas: d.mesas.map((m) => (seleccion.includes(m.id) ? { ...m, x: m.x + dx, y: m.y + dy } : m)),
          elementos: d.elementos.map((m) => (seleccion.includes(m.id) ? { ...m, x: m.x + dx, y: m.y + dy } : m)),
        }));
      }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [deshacer, rehacer, borrar, seleccion, aplicar]);

  const siguienteNombre = (d: Borrador) => {
    const usados = new Set(d.mesas.map((m) => m.nombre.toUpperCase()));
    let n = 1;
    while (usados.has(`${prefijo}${n}`)) n++;
    return `${prefijo}${n}`;
  };

  const anadirMesa = (forma: Mesa["forma"]) => {
    const nueva: Mesa = {
      id: crypto.randomUUID(),
      nombre: siguienteNombre(doc),
      forma,
      x: 200 + (doc.mesas.length % 6) * 30,
      y: 200 + (doc.mesas.length % 4) * 30,
      giro: 0,
      ...formasNuevas[forma],
      capacidad_min: 1,
      capacidad_max: formasNuevas[forma].sillas,
      tronas: 0,
      plazas_silla_ruedas: 0,
      reservable_online: true,
    };
    aplicar((d) => ({ ...d, mesas: [...d.mesas, nueva] }));
    setSeleccion([nueva.id]);
  };

  const anadirElemento = (tipo: Elemento["tipo"]) => {
    const t = tiposElemento.find((x) => x.tipo === tipo)!;
    const nuevo: Elemento = { id: crypto.randomUUID(), tipo, x: 300, y: 300, giro: 0, ancho: t.ancho, alto: t.alto, etiqueta: tipo === "pared" ? null : t.texto };
    aplicar((d) => ({ ...d, elementos: [...d.elementos, nuevo] }));
    setSeleccion([nuevo.id]);
  };

  const duplicar = () => {
    const mesas = doc.mesas.filter((m) => seleccion.includes(m.id));
    const elementos = doc.elementos.filter((e) => seleccion.includes(e.id));
    if (!mesas.length && !elementos.length) return;
    let base = doc;
    const copiasMesa = mesas.map((m) => {
      const c = { ...m, id: crypto.randomUUID(), nombre: siguienteNombre(base), x: m.x + 40, y: m.y + 40 };
      base = { ...base, mesas: [...base.mesas, c] };
      return c;
    });
    const copiasEl = elementos.map((e) => ({ ...e, id: crypto.randomUUID(), x: e.x + 40, y: e.y + 40 }));
    aplicar((d) => ({ ...d, mesas: [...d.mesas, ...copiasMesa], elementos: [...d.elementos, ...copiasEl] }));
    setSeleccion([...copiasMesa, ...copiasEl].map((x) => x.id));
  };

  const juntar = () => {
    const mesas = doc.mesas.filter((m) => seleccion.includes(m.id));
    if (mesas.length < 2) return;
    const nombreC = mesas.map((m) => m.nombre).sort((a, b) => a.localeCompare(b, "es", { numeric: true })).join("+");
    if (doc.combinaciones.some((c) => c.nombre === nombreC)) {
      setAviso(`La combinación ${nombreC} ya existe.`);
      return;
    }
    const capacidad = mesas.reduce((s, m) => s + m.capacidad_max, 0);
    const mayor = Math.max(...mesas.map((m) => m.capacidad_max));
    aplicar((d) => ({
      ...d,
      combinaciones: [
        ...d.combinaciones,
        { id: crypto.randomUUID(), nombre: nombreC, mesas: mesas.map((m) => m.id), capacidad_min: mayor + 1, capacidad_max: capacidad, reservable_online: mesas.every((m) => m.reservable_online) },
      ],
    }));
    setAviso(`Se pueden juntar: ${nombreC} (hasta ${capacidad} personas). Ajusta la capacidad abajo si hace falta.`);
  };

  const cambiarMesa = (id: string, cambio: Partial<Mesa>) =>
    aplicar((d) => ({ ...d, mesas: d.mesas.map((m) => (m.id === id ? { ...m, ...cambio } : m)) }));
  const cambiarElemento = (id: string, cambio: Partial<Elemento>) =>
    aplicar((d) => ({ ...d, elementos: d.elementos.map((m) => (m.id === id ? { ...m, ...cambio } : m)) }));

  const onCambiarPieza = useCallback(
    (id: string, cambio: Partial<Mesa>) =>
      aplicar((d) => ({
        ...d,
        mesas: d.mesas.map((m) => (m.id === id ? { ...m, ...cambio } : m)),
        elementos: d.elementos.map((e) => (e.id === id ? { ...e, ...cambio } : e)),
      })),
    [aplicar],
  );

  const onSeleccionar = useCallback(
    (id: string | null, aditivo: boolean) => {
      if (!id) return setSeleccion([]);
      setSeleccion((s) => (aditivo || multiple ? (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]) : [id]));
    },
    [multiple],
  );

  const pedirPublicar = () =>
    startTransition(async () => {
      setAviso(null);
      // Se guarda lo último antes de comprobar.
      if (temporizador.current) clearTimeout(temporizador.current);
      await guardarBorrador(distId, doc);
      const r = await publicar(distId, false);
      if (!r.ok && !r.reservas?.length) {
        setAviso(r.motivo === "nombres_repetidos" ? "Hay mesas con el mismo nombre." : r.motivo === "mesa_invalida" ? "Alguna mesa no tiene nombre o su capacidad mínima supera la máxima." : `No se puede publicar: ${r.motivo}`);
        return;
      }
      if (r.ok && !r.reservas?.length) {
        // Todas las reservas siguen cabiendo: se publica directamente.
        const p = await publicar(distId, true);
        setAviso(p.publicada ? "Publicada. La web y el servicio ya usan esta distribución." : "No se ha podido publicar.");
        if (p.publicada) {
          setCambiosSinPublicar(false);
          recargar();
        }
        return;
      }
      setPrevia(r);
    });

  const confirmarPublicar = () =>
    startTransition(async () => {
      const p = await publicar(distId, true);
      setPrevia(null);
      setAviso(p.publicada ? `Publicada. ${p.reasignadas ?? 0} reservas cambian de mesa.` : "No se ha podido publicar: hay reservas que no caben.");
      if (p.publicada) {
        setCambiosSinPublicar(false);
        recargar();
      }
    });

  const sel = seleccion.length === 1 ? seleccion[0] : null;
  const mesaSel = doc.mesas.find((m) => m.id === sel);
  const elSel = doc.elementos.find((e) => e.id === sel);
  const mesasSeleccionadas = doc.mesas.filter((m) => seleccion.includes(m.id));

  return (
    <div className="px-4 pb-16 pt-4 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-niebla"><Link href="/panel/mapa" className="underline">Mapa de mesas</Link> · {zona}</p>
          <h1 className="font-display text-3xl">{nombre}</h1>
          <p className="text-sm text-niebla" role="status">
            {guardado === "guardando" ? "Guardando borrador…" : guardado === "error" ? "Error al guardar el borrador" : cambiosSinPublicar ? "Borrador guardado · sin publicar (el servicio no cambia hasta publicar)" : estado === "publicada" ? "Publicada" : "Borrador"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {cambiosSinPublicar && estado === "publicada" ? (
            <Boton variante="secundario" onClick={() => startTransition(async () => { await descartarBorrador(distId); recargar(); location.reload(); })}>Descartar cambios</Boton>
          ) : null}
          <Boton onClick={pedirPublicar} cargando={publicando}>Publicar</Boton>
        </div>
      </div>

      {aviso ? <p className="mt-3 rounded-xl bg-azafran/20 px-3 py-2 text-sm font-semibold" role="status">{aviso}</p> : null}

      {/* Barra de herramientas */}
      <div className="mt-4 flex flex-wrap items-center gap-2" role="toolbar" aria-label="Herramientas">
        <span className="text-sm font-semibold">Añadir mesa:</span>
        <Herramienta onClick={() => anadirMesa("redonda")}>◯ Redonda</Herramienta>
        <Herramienta onClick={() => anadirMesa("cuadrada")}>▢ Cuadrada</Herramienta>
        <Herramienta onClick={() => anadirMesa("rectangular")}>▭ Rectangular</Herramienta>
        <label className="sr-only" htmlFor="elemento">Añadir elemento fijo</label>
        <select id="elemento" value="" onChange={(e) => e.target.value && anadirElemento(e.target.value as Elemento["tipo"])} className="min-h-11 rounded-full border-0 bg-white px-3 text-sm font-semibold ring-1 ring-tinta/15">
          <option value="">+ Elemento fijo…</option>
          {tiposElemento.map((t) => <option key={t.tipo} value={t.tipo}>{t.texto}</option>)}
        </select>
        <span className="mx-1 h-6 w-px bg-tinta/15" aria-hidden />
        <Herramienta onClick={deshacer} disabled={!pasado.length} etiqueta="Deshacer"><Undo2 className="size-4" /></Herramienta>
        <Herramienta onClick={rehacer} disabled={!futuro.length} etiqueta="Rehacer"><Redo2 className="size-4" /></Herramienta>
        <Herramienta onClick={duplicar} disabled={!seleccion.length} etiqueta="Duplicar"><Copy className="size-4" /> Duplicar</Herramienta>
        <Herramienta onClick={borrar} disabled={!seleccion.length} etiqueta="Borrar"><Trash2 className="size-4" /> Borrar</Herramienta>
        <Herramienta onClick={juntar} disabled={mesasSeleccionadas.length < 2} etiqueta="Se pueden juntar"><Link2 className="size-4" /> Se pueden juntar</Herramienta>
        <span className="mx-1 h-6 w-px bg-tinta/15" aria-hidden />
        <label className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={multiple} onChange={(e) => setMultiple(e.target.checked)} className="size-5 accent-pimenton" /> Selección múltiple</label>
        <label className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={ajustar} onChange={(e) => setAjustar(e.target.checked)} className="size-5 accent-pimenton" /> Ajustar a rejilla y mesas</label>
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <LienzoEditor doc={doc} seleccion={seleccion} combinacionResaltada={combiResaltada} ajustar={ajustar} onSeleccionar={onSeleccionar} onCambiar={onCambiarPieza} />

        <aside className="space-y-5" aria-label="Propiedades">
          {mesaSel ? (
            <section className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-tinta/10">
              <h2 className="font-display text-xl">Mesa {mesaSel.nombre}</h2>
              <Fila etiqueta="Nombre"><input aria-label="Nombre de la mesa" value={mesaSel.nombre} maxLength={12} onChange={(e) => cambiarMesa(mesaSel.id, { nombre: e.target.value })} className="min-h-11 w-28 rounded-xl border-0 bg-arroz px-3 ring-1 ring-tinta/15" /></Fila>
              <Fila etiqueta="Forma">
                <select aria-label="Forma" value={mesaSel.forma} onChange={(e) => { const f = e.target.value as Mesa["forma"]; cambiarMesa(mesaSel.id, { forma: f, ...(f === "redonda" ? { alto: mesaSel.ancho } : {}) }); }} className="min-h-11 rounded-xl border-0 bg-arroz px-3 ring-1 ring-tinta/15">
                  <option value="redonda">Redonda</option>
                  <option value="cuadrada">Cuadrada</option>
                  <option value="rectangular">Rectangular</option>
                </select>
              </Fila>
              <Contador etiqueta="Sillas" valor={mesaSel.sillas} min={0} onCambiar={(v) => cambiarMesa(mesaSel.id, { sillas: v, capacidad_max: Math.max(v, mesaSel.capacidad_min) })} ayuda="La capacidad máxima se ajusta sola." />
              <Contador etiqueta="Capacidad mínima" valor={mesaSel.capacidad_min} min={1} max={mesaSel.capacidad_max} onCambiar={(v) => cambiarMesa(mesaSel.id, { capacidad_min: v })} />
              <Contador etiqueta="Capacidad máxima" valor={mesaSel.capacidad_max} min={Math.max(1, mesaSel.capacidad_min)} onCambiar={(v) => cambiarMesa(mesaSel.id, { capacidad_max: v })} />
              <Contador etiqueta="Tronas" valor={mesaSel.tronas} min={0} onCambiar={(v) => cambiarMesa(mesaSel.id, { tronas: v })} />
              <Contador etiqueta="Plazas silla de ruedas" valor={mesaSel.plazas_silla_ruedas} min={0} onCambiar={(v) => cambiarMesa(mesaSel.id, { plazas_silla_ruedas: v })} />
              <label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={mesaSel.reservable_online} onChange={(e) => cambiarMesa(mesaSel.id, { reservable_online: e.target.checked })} className="size-5 accent-pimenton" /> Reservable online</label>
              <p className="text-xs text-niebla">Gira y redimensiona con las asas; mueve con las flechas del teclado (Mayús = 50 cm).</p>
            </section>
          ) : elSel ? (
            <section className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-tinta/10">
              <h2 className="font-display text-xl">{tiposElemento.find((t) => t.tipo === elSel.tipo)?.texto}</h2>
              <Fila etiqueta="Etiqueta"><input aria-label="Etiqueta" value={elSel.etiqueta ?? ""} maxLength={40} onChange={(e) => cambiarElemento(elSel.id, { etiqueta: e.target.value || null })} className="min-h-11 w-40 rounded-xl border-0 bg-arroz px-3 ring-1 ring-tinta/15" /></Fila>
            </section>
          ) : (
            <p className="rounded-2xl bg-white p-4 text-sm text-niebla ring-1 ring-tinta/10">
              Toca una pieza para editarla. Con «Selección múltiple» (o Mayús) eliges varias mesas para marcarlas como «se pueden juntar».
            </p>
          )}

          <section className="rounded-2xl bg-white p-4 ring-1 ring-tinta/10">
            <h2 className="font-display text-xl">Mesas que se pueden juntar</h2>
            <p className="text-xs text-niebla">Solo estas combinaciones se ofrecen online.</p>
            <ul className="mt-2 space-y-2">
              {doc.combinaciones.map((c) => (
                <li key={c.id} className="rounded-xl bg-arroz p-2 text-sm" onMouseEnter={() => setCombiResaltada(c.id)} onMouseLeave={() => setCombiResaltada(null)}>
                  <div className="flex items-center justify-between gap-2">
                    <button type="button" className="font-semibold underline-offset-4 hover:underline" onClick={() => setCombiResaltada(combiResaltada === c.id ? null : c.id)}>{c.nombre}</button>
                    <button type="button" className="min-h-9 px-2 text-xs underline" onClick={() => aplicar((d) => ({ ...d, combinaciones: d.combinaciones.filter((x) => x.id !== c.id) }))}>Quitar</button>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <label className="text-xs">De <input aria-label={`Capacidad mínima ${c.nombre}`} type="number" min={1} value={c.capacidad_min} onChange={(e) => aplicar((d) => ({ ...d, combinaciones: d.combinaciones.map((x) => (x.id === c.id ? { ...x, capacidad_min: Number(e.target.value) } : x)) }))} className="w-14 rounded-lg border-0 bg-white px-2 py-1 ring-1 ring-tinta/15" /></label>
                    <label className="text-xs">a <input aria-label={`Capacidad máxima ${c.nombre}`} type="number" min={1} value={c.capacidad_max} onChange={(e) => aplicar((d) => ({ ...d, combinaciones: d.combinaciones.map((x) => (x.id === c.id ? { ...x, capacidad_max: Number(e.target.value) } : x)) }))} className="w-14 rounded-lg border-0 bg-white px-2 py-1 ring-1 ring-tinta/15" /> pax</label>
                  </div>
                </li>
              ))}
              {!doc.combinaciones.length ? <li className="text-sm text-niebla">Ninguna.</li> : null}
            </ul>
          </section>
          <details className="rounded-2xl bg-white p-4 ring-1 ring-tinta/10">
            <summary className="cursor-pointer font-semibold">Lista de piezas</summary>
            <ul className="mt-2 grid grid-cols-3 gap-2" aria-label="Piezas">
              {doc.mesas.map((m) => (
                <li key={m.id}>
                  <button type="button" aria-pressed={seleccion.includes(m.id)} onClick={() => onSeleccionar(m.id, false)} className={`min-h-11 w-full rounded-xl text-sm font-semibold ring-1 ${seleccion.includes(m.id) ? "bg-azafran/40 ring-azafran-oscuro" : "bg-arroz ring-tinta/10"}`}>
                    Mesa {m.nombre}
                  </button>
                </li>
              ))}
            </ul>
          </details>
          <p className="text-xs text-niebla">{doc.mesas.length} mesas · {doc.mesas.reduce((s, m) => s + m.capacidad_max, 0)} plazas</p>
        </aside>
      </div>

      <Dialogo titulo="Antes de publicar" abierto={Boolean(previa)} onCerrar={() => setPrevia(null)} ancho="max-w-2xl">
        {previa ? (
          <div>
            {previa.sin_sitio ? (
              <p className="rounded-xl bg-pimenton/15 p-3 font-semibold text-pimenton-oscuro">
                No se puede publicar: {previa.sin_sitio} reserva{previa.sin_sitio > 1 ? "s" : ""} no caben. Muévelas, junta mesas o contacta con el cliente, y vuelve a intentarlo.
              </p>
            ) : (
              <p>Estas reservas futuras pierden su mesa pero caben en otra. Revisa la propuesta: al publicar se aplicará y podrás cambiarla después desde el servicio.</p>
            )}
            <ul className="mt-3 max-h-80 divide-y divide-tinta/10 overflow-y-auto">
              {previa.reservas?.map((r) => (
                <li key={r.reserva_id} className="flex justify-between gap-3 py-2 text-sm">
                  <span><strong className="tabular-nums">{r.fecha} {r.hora}</strong> · {r.nombre} · {r.comensales} pax</span>
                  <span className={r.situacion === "sin_sitio" ? "font-semibold text-pimenton-oscuro" : ""}>{r.antes.join("+") || "—"} → {r.situacion === "sin_sitio" ? "no cabe" : r.despues.join("+")}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex gap-3">
              {!previa.sin_sitio ? <Boton onClick={confirmarPublicar} cargando={publicando}>Aceptar y publicar</Boton> : null}
              <Boton variante="secundario" onClick={() => setPrevia(null)}>Volver al editor</Boton>
            </div>
          </div>
        ) : null}
      </Dialogo>
    </div>
  );
}

function Herramienta({ children, onClick, disabled, etiqueta }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; etiqueta?: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={etiqueta} className="inline-flex min-h-11 items-center gap-1 rounded-full bg-white px-3 text-sm font-semibold ring-1 ring-tinta/15 hover:ring-tinta/40 disabled:opacity-40">
      {children}
    </button>
  );
}

function Fila({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm font-semibold">
      <span>{etiqueta}</span>
      {children}
    </div>
  );
}

function Contador({ etiqueta, valor, min, max, onCambiar, ayuda }: { etiqueta: string; valor: number; min: number; max?: number; onCambiar: (v: number) => void; ayuda?: string }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-sm font-semibold">
        <span>{etiqueta}</span>
        <span className="flex items-center gap-2">
          <button type="button" aria-label={`Quitar ${etiqueta.toLowerCase()}`} disabled={valor <= min} onClick={() => onCambiar(valor - 1)} className="grid size-11 place-items-center rounded-full bg-arroz text-lg ring-1 ring-tinta/15 disabled:opacity-40">−</button>
          <span className="w-6 text-center tabular-nums" aria-live="polite">{valor}</span>
          <button type="button" aria-label={`Añadir ${etiqueta.toLowerCase()}`} disabled={max != null && valor >= max} onClick={() => onCambiar(valor + 1)} className="grid size-11 place-items-center rounded-full bg-arroz text-lg ring-1 ring-tinta/15 disabled:opacity-40">+</button>
        </span>
      </div>
      {ayuda ? <p className="text-xs text-niebla">{ayuda}</p> : null}
    </div>
  );
}
