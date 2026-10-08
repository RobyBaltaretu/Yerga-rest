"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Group, Layer, Line, Rect, Stage, Transformer } from "react-konva";
import type Konva from "konva";
import { FormaElemento, FormaMesa, limites } from "./formas";
import type { Borrador } from "@/lib/panel/borrador";

export const REJILLA = 10; // cm
const IMAN = 12; // cm: distancia a la que una mesa se pega al borde de otra

type Cambio = { x?: number; y?: number; giro?: number; ancho?: number; alto?: number };

type Props = {
  doc: Borrador;
  seleccion: string[];
  combinacionResaltada?: string | null;
  ajustar: boolean;
  onSeleccionar: (id: string | null, aditivo: boolean) => void;
  onCambiar: (id: string, cambio: Cambio) => void;
};

const redondear = (v: number, paso = REJILLA) => Math.round(v / paso) * paso;

/** Lienzo del modo «Editar distribución». */
export default function LienzoEditor({ doc, seleccion, combinacionResaltada, ajustar, onSeleccionar, onCambiar }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const transformer = useRef<Konva.Transformer>(null);
  const nodos = useRef(new Map<string, Konva.Group>());
  const [ancho, setAncho] = useState(800);
  const [zoom, setZoom] = useState(1);

  // El lienzo cubre al menos 12 × 8 m, o lo que ocupen las piezas.
  const caja = useMemo(() => {
    const l = limites(doc.mesas, doc.elementos);
    const x = Math.min(0, l.x);
    const y = Math.min(0, l.y);
    return { x, y, ancho: Math.max(1200, l.x + l.ancho - x), alto: Math.max(800, l.y + l.alto - y) };
  }, [doc.mesas, doc.elementos]);
  const escala = (ancho / caja.ancho) * zoom;
  const alto = Math.round(caja.alto * escala);

  useLayoutEffect(() => {
    const el = contenedor.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setAncho(Math.max(300, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // El transformador (girar y redimensionar) se engancha a la pieza seleccionada.
  useEffect(() => {
    const tr = transformer.current;
    if (!tr) return;
    const nodo = seleccion.length === 1 ? nodos.current.get(seleccion[0]) : undefined;
    tr.nodes(nodo ? [nodo] : []);
    tr.getLayer()?.batchDraw();
  }, [seleccion, doc]);

  const mesasCombi = useMemo(
    () => new Set(doc.combinaciones.find((c) => c.id === combinacionResaltada)?.mesas ?? []),
    [doc.combinaciones, combinacionResaltada],
  );

  // Imán: alinea con los bordes y centros de las otras mesas.
  const imantar = (id: string, x: number, y: number, w: number, h: number) => {
    let nx = ajustar ? redondear(x) : x;
    let ny = ajustar ? redondear(y) : y;
    if (!ajustar) return { x: nx, y: ny };
    for (const o of doc.mesas) {
      if (o.id === id) continue;
      const candidatosX = [o.x, o.x - o.ancho / 2 - w / 2, o.x + o.ancho / 2 + w / 2, o.x - o.ancho / 2 + w / 2, o.x + o.ancho / 2 - w / 2];
      const candidatosY = [o.y, o.y - o.alto / 2 - h / 2, o.y + o.alto / 2 + h / 2, o.y - o.alto / 2 + h / 2, o.y + o.alto / 2 - h / 2];
      for (const cx of candidatosX) if (Math.abs(cx - x) < IMAN) nx = cx;
      for (const cy of candidatosY) if (Math.abs(cy - y) < IMAN) ny = cy;
    }
    return { x: nx, y: ny };
  };

  const lineas = useMemo(() => {
    const out: number[][] = [];
    for (let x = Math.ceil(caja.x / 50) * 50; x <= caja.x + caja.ancho; x += 50) out.push([x, caja.y, x, caja.y + caja.alto]);
    for (let y = Math.ceil(caja.y / 50) * 50; y <= caja.y + caja.alto; y += 50) out.push([caja.x, y, caja.x + caja.ancho, y]);
    return out;
  }, [caja]);

  const pieza = (id: string, x: number, y: number, giro: number, w: number, h: number, hijos: React.ReactNode, redonda = false) => (
    <Group
      key={id}
      ref={(n) => {
        if (n) nodos.current.set(id, n);
        else nodos.current.delete(id);
      }}
      x={x}
      y={y}
      rotation={giro}
      draggable
      onMouseDown={(e) => onSeleccionar(id, e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey)}
      onTap={() => onSeleccionar(id, false)}
      onDragMove={(e) => {
        const p = imantar(id, e.target.x(), e.target.y(), w, h);
        e.target.position(p);
      }}
      onDragEnd={(e) => onCambiar(id, { x: Math.round(e.target.x()), y: Math.round(e.target.y()) })}
      onTransformEnd={(e) => {
        const n = e.target;
        const sx = n.scaleX();
        const sy = n.scaleY();
        n.scaleX(1);
        n.scaleY(1);
        const nw = Math.max(30, redondear(w * sx, 5));
        const nh = redonda ? nw : Math.max(10, redondear(h * sy, 5));
        onCambiar(id, { giro: Math.round(n.rotation()) % 360, ancho: nw, alto: nh, x: Math.round(n.x()), y: Math.round(n.y()) });
      }}
    >
      {hijos}
    </Group>
  );

  return (
    <div className="relative">
      <div ref={contenedor} className="w-full overflow-auto rounded-2xl bg-white ring-1 ring-tinta/10" style={{ maxHeight: "70dvh" }} data-testid="lienzo-editor">
        <Stage
          width={Math.round(caja.ancho * escala)}
          height={alto}
          onMouseDown={(e) => {
            if (e.target === e.target.getStage()) onSeleccionar(null, false);
          }}
          onTap={(e) => {
            if (e.target === e.target.getStage()) onSeleccionar(null, false);
          }}
        >
          <Layer scaleX={escala} scaleY={escala} x={-caja.x * escala} y={-caja.y * escala}>
            <Rect x={caja.x} y={caja.y} width={caja.ancho} height={caja.alto} fill="#fbf7f0" listening={false} />
            {lineas.map((l, i) => (
              <Line key={i} points={l} stroke="#2b1f17" opacity={0.06} strokeWidth={1} listening={false} />
            ))}
            {doc.elementos.map((el) => pieza(el.id, el.x, el.y, el.giro, el.ancho, el.alto, (
              <>
                <FormaElemento el={el} />
                {seleccion.includes(el.id) ? <Rect x={-el.ancho / 2 - 4} y={-el.alto / 2 - 4} width={el.ancho + 8} height={el.alto + 8} stroke="#e3a13a" strokeWidth={3} dash={[6, 4]} /> : null}
              </>
            ), el.tipo === "columna" || el.tipo === "planta"))}
            {doc.mesas.map((m) =>
              pieza(m.id, m.x, m.y, m.giro, m.ancho, m.alto, (
                <FormaMesa
                  mesa={m}
                  relleno={mesasCombi.has(m.id) ? "#dfe8cf" : seleccion.includes(m.id) ? "#f6dfb0" : "#ffffff"}
                  borde={seleccion.includes(m.id) ? "#9a5f0f" : mesasCombi.has(m.id) ? "#4f6a2c" : "#6f6259"}
                  grosor={seleccion.includes(m.id) ? 4 : 2}
                  texto={m.nombre}
                  subtexto={`${m.capacidad_min}–${m.capacidad_max}`}
                />
              ), m.forma === "redonda"),
            )}
            <Transformer
              ref={transformer}
              rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
              rotationSnapTolerance={8}
              anchorSize={14}
              borderStroke="#9a5f0f"
              anchorStroke="#9a5f0f"
              keepRatio={false}
              boundBoxFunc={(viejo, nuevo) => (nuevo.width < 20 || nuevo.height < 8 ? viejo : nuevo)}
            />
          </Layer>
        </Stage>
      </div>
      <div className="absolute right-3 top-3 flex gap-1">
        <button type="button" onClick={() => setZoom(Math.min(3, zoom * 1.25))} className="grid size-11 place-items-center rounded-full bg-white text-xl shadow ring-1 ring-tinta/10" aria-label="Acercar">+</button>
        <button type="button" onClick={() => setZoom(Math.max(0.5, zoom / 1.25))} className="grid size-11 place-items-center rounded-full bg-white text-xl shadow ring-1 ring-tinta/10" aria-label="Alejar">−</button>
      </div>
    </div>
  );
}
