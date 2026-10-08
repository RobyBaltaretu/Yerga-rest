"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Group, Layer, Stage } from "react-konva";
import type Konva from "konva";
import { FormaElemento, FormaMesa, limites, type ElementoDibujo, type MesaDibujo } from "./formas";
import type { EstadoMesa, SituacionMesa } from "@/lib/panel/estados";
import { estiloEstado } from "./estilos";


export type Validez = { valida: boolean; motivo: string | null; conflicto: string | null };

export type ResolverMesa = (clientX: number, clientY: number) => string | null;

type Props = {
  mesas: MesaDibujo[];
  elementos: ElementoDibujo[];
  situaciones: Record<string, SituacionMesa>;
  validez?: Record<string, Validez> | null;
  seleccionada?: string | null;
  onTocarMesa?: (mesaId: string) => void;
  onEmpezarArrastre?: (mesaId: string, clientX: number, clientY: number) => void;
  registrarResolver?: (fn: ResolverMesa | null) => void;
};

/** Mapa de mesas en modo servicio: estados por color e icono, zoom y arrastre. */
export default function PlanoServicio({
  mesas,
  elementos,
  situaciones,
  validez,
  seleccionada,
  onTocarMesa,
  onEmpezarArrastre,
  registrarResolver,
}: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const stage = useRef<Konva.Stage>(null);
  const [ancho, setAncho] = useState(600);
  const [zoom, setZoom] = useState(1);
  const [desplazamiento, setDesplazamiento] = useState({ x: 0, y: 0 });
  const pinza = useRef<{ distancia: number; zoom: number } | null>(null);

  const caja = useMemo(() => limites(mesas, elementos), [mesas, elementos]);
  const base = ancho / caja.ancho;
  const escala = base * zoom;
  const alto = Math.round(caja.alto * base);

  useLayoutEffect(() => {
    const el = contenedor.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setAncho(Math.max(280, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Traduce un punto de pantalla a la mesa que hay debajo (para soltar arrastres).
  useEffect(() => {
    if (!registrarResolver) return;
    registrarResolver((cx, cy) => {
      const el = contenedor.current;
      if (!el) return null;
      const r = el.getBoundingClientRect();
      if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) return null;
      const lx = (cx - r.left - desplazamiento.x) / escala + caja.x;
      const ly = (cy - r.top - desplazamiento.y) / escala + caja.y;
      for (const m of mesas) {
        const a = (-m.giro * Math.PI) / 180;
        const dx = lx - m.x;
        const dy = ly - m.y;
        const rx = dx * Math.cos(a) - dy * Math.sin(a);
        const ry = dx * Math.sin(a) + dy * Math.cos(a);
        if (Math.abs(rx) <= m.ancho / 2 + 10 && Math.abs(ry) <= m.alto / 2 + 10) return m.id;
      }
      return null;
    });
    return () => registrarResolver(null);
  }, [registrarResolver, mesas, escala, caja, desplazamiento]);

  const cambiarZoom = (z: number) => {
    const nuevo = Math.min(3, Math.max(1, z));
    setZoom(nuevo);
    if (nuevo === 1) setDesplazamiento({ x: 0, y: 0 });
  };

  return (
    <div className="relative">
      <div
        ref={contenedor}
        className="w-full overflow-hidden rounded-2xl bg-[#fbf7f0] ring-1 ring-tinta/10"
        style={{ height: alto, touchAction: zoom > 1 ? "none" : "pan-y" }}
        data-testid="plano-servicio"
        data-escala={escala}
        data-origen-x={caja.x - desplazamiento.x / escala}
        data-origen-y={caja.y - desplazamiento.y / escala}
      >
        <Stage
          ref={stage}
          width={ancho}
          height={alto}
          x={desplazamiento.x}
          y={desplazamiento.y}
          draggable={zoom > 1}
          onDragEnd={(e) => {
            if (e.target === stage.current) setDesplazamiento({ x: e.target.x(), y: e.target.y() });
          }}
          onWheel={(e) => {
            if (!e.evt.ctrlKey) return;
            e.evt.preventDefault();
            cambiarZoom(zoom * (e.evt.deltaY < 0 ? 1.1 : 0.9));
          }}
          onTouchMove={(e) => {
            const t = e.evt.touches;
            if (t.length !== 2) return;
            e.evt.preventDefault();
            const d = Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
            if (!pinza.current) pinza.current = { distancia: d, zoom };
            else cambiarZoom(pinza.current.zoom * (d / pinza.current.distancia));
          }}
          onTouchEnd={() => {
            pinza.current = null;
          }}
        >
          <Layer scaleX={escala} scaleY={escala} x={-caja.x * escala} y={-caja.y * escala} listening>
            {elementos.map((el) => (
              <Group key={el.id} x={el.x} y={el.y} rotation={el.giro} listening={false}>
                <FormaElemento el={el} />
              </Group>
            ))}
            {mesas.map((m) => {
              const s = situaciones[m.id] ?? { estado: "libre" as EstadoMesa };
              const estilo = estiloEstado[s.estado];
              const v = validez?.[m.id];
              const r = s.actual ?? s.siguiente;
              const sub = s.actual
                ? `${s.actual.nombre.split(" ")[0]} · ${s.actual.comensales}`
                : s.siguiente && s.estado === "proxima"
                  ? `${hhmm(s.siguiente.inicio)} · ${s.siguiente.comensales}`
                  : `${m.capacidad_max} pax`;
              const iconos = r ? `${r.alergias ? "⚕" : ""}${r.ocasion ? "★" : ""}${r.arroces.length ? "◉" : ""}` : "";
              return (
                <Group
                  key={m.id}
                  x={m.x}
                  y={m.y}
                  rotation={m.giro}
                  onClick={() => onTocarMesa?.(m.id)}
                  onTap={() => onTocarMesa?.(m.id)}
                  onMouseDown={(e) => {
                    if (r && onEmpezarArrastre) {
                      e.cancelBubble = true;
                      stage.current?.stopDrag();
                      onEmpezarArrastre(m.id, e.evt.clientX, e.evt.clientY);
                    }
                  }}
                  onTouchStart={(e) => {
                    if (r && onEmpezarArrastre && e.evt.touches.length === 1) {
                      e.cancelBubble = true;
                      onEmpezarArrastre(m.id, e.evt.touches[0].clientX, e.evt.touches[0].clientY);
                    }
                  }}
                >
                  <FormaMesa
                    mesa={m}
                    relleno={v && !v.valida ? "#f2eee8" : estilo.relleno}
                    borde={seleccionada === m.id ? "#1b110c" : v?.valida ? "#4f6a2c" : estilo.borde}
                    grosor={seleccionada === m.id || v?.valida ? 5 : 2}
                    opacidad={v && !v.valida ? 0.4 : 1}
                    texto={`${m.nombre}${iconos ? ` ${iconos}` : ""}`}
                    subtexto={sub}
                    icono={estilo.icono}
                    colorTexto={v && !v.valida ? "#2b1f17" : estilo.texto}
                  />
                </Group>
              );
            })}
          </Layer>
        </Stage>
      </div>
      <div className="absolute right-2 top-2 flex gap-1">
        <button type="button" onClick={() => cambiarZoom(zoom * 1.25)} className="grid size-11 place-items-center rounded-full bg-white text-xl shadow ring-1 ring-tinta/10" aria-label="Acercar">+</button>
        <button type="button" onClick={() => cambiarZoom(zoom / 1.25)} className="grid size-11 place-items-center rounded-full bg-white text-xl shadow ring-1 ring-tinta/10" aria-label="Alejar">−</button>
        {zoom > 1 ? (
          <button type="button" onClick={() => cambiarZoom(1)} className="h-11 rounded-full bg-white px-3 text-sm font-semibold shadow ring-1 ring-tinta/10">Ajustar</button>
        ) : null}
      </div>
    </div>
  );
}

function hhmm(iso: string) {
  return new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}
