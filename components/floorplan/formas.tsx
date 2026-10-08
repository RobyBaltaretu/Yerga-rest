"use client";

import { Circle, Group, Rect, Text } from "react-konva";

// Piezas de dibujo comunes al editor y a la vista de servicio. Las coordenadas
// están en centímetros del local; x/y son el centro de cada pieza.

export type MesaDibujo = {
  id: string;
  nombre: string;
  forma: "redonda" | "cuadrada" | "rectangular";
  x: number;
  y: number;
  giro: number;
  ancho: number;
  alto: number;
  sillas: number;
  capacidad_max: number;
  reservable_online: boolean;
  tronas?: number;
  plazas_silla_ruedas?: number;
};

export type ElementoDibujo = {
  id: string;
  tipo: string;
  x: number;
  y: number;
  giro: number;
  ancho: number;
  alto: number;
  etiqueta: string | null;
};

export const coloresElemento: Record<string, string> = {
  pared: "#3a2a20",
  barra: "#7a4515",
  columna: "#6f6259",
  puerta: "#4f6a2c",
  ventana: "#8fb3c9",
  cocina: "#b23f1d",
  planta: "#4f6a2c",
};

/** Posiciones de las sillas repartidas por el perímetro de la mesa. */
export function posicionesSillas(m: Pick<MesaDibujo, "forma" | "ancho" | "alto" | "sillas">): { x: number; y: number }[] {
  const n = m.sillas;
  if (n <= 0) return [];
  const sep = 14;
  if (m.forma === "redonda") {
    const r = Math.min(m.ancho, m.alto) / 2 + sep;
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      return { x: Math.cos(a) * r, y: Math.sin(a) * r };
    });
  }
  const w = m.ancho;
  const h = m.alto;
  // Mesas alargadas: sillas en los lados largos; cuadradas: alrededor.
  if (m.forma === "rectangular" && n % 2 === 0 && n >= 4) {
    const porLado = n / 2;
    const largoHoriz = w >= h;
    return Array.from({ length: n }, (_, i) => {
      const lado = i < porLado ? -1 : 1;
      const k = i % porLado;
      const t = ((k + 0.5) / porLado - 0.5) * (largoHoriz ? w : h);
      return largoHoriz ? { x: t, y: lado * (h / 2 + sep) } : { x: lado * (w / 2 + sep), y: t };
    });
  }
  const P = 2 * (w + h);
  return Array.from({ length: n }, (_, i) => {
    let d = ((i + 0.5) / n) * P + w / 2; // empieza en el centro del lado superior
    d %= P;
    if (d < w) return { x: -w / 2 + d, y: -h / 2 - sep };
    d -= w;
    if (d < h) return { x: w / 2 + sep, y: -h / 2 + d };
    d -= h;
    if (d < w) return { x: w / 2 - d, y: h / 2 + sep };
    d -= w;
    return { x: -w / 2 - sep, y: h / 2 - d };
  });
}

export function FormaMesa({
  mesa,
  relleno,
  borde,
  grosor = 2,
  opacidad = 1,
  texto,
  subtexto,
  icono,
  colorTexto = "#2b1f17",
}: {
  mesa: MesaDibujo;
  relleno: string;
  borde: string;
  grosor?: number;
  opacidad?: number;
  texto: string;
  subtexto?: string;
  icono?: string;
  colorTexto?: string;
}) {
  const w = mesa.ancho;
  const h = mesa.alto;
  const sillas = posicionesSillas(mesa);
  const tam = Math.max(16, Math.min(24, Math.min(w, h) / 3));
  return (
    <Group opacity={opacidad}>
      {sillas.map((s, i) => (
        <Circle key={i} x={s.x} y={s.y} radius={9} fill="#efe3cd" stroke="#6f6259" strokeWidth={1} />
      ))}
      {mesa.forma === "redonda" ? (
        <Circle radius={Math.min(w, h) / 2} fill={relleno} stroke={borde} strokeWidth={grosor} />
      ) : (
        <Rect x={-w / 2} y={-h / 2} width={w} height={h} cornerRadius={8} fill={relleno} stroke={borde} strokeWidth={grosor} />
      )}
      {!mesa.reservable_online ? (
        <Rect x={-w / 2 + 4} y={-h / 2 + 4} width={10} height={10} cornerRadius={2} fill="#6f6259" />
      ) : null}
      {/* El texto no gira con la mesa, para leerse siempre derecho. */}
      <Group rotation={-mesa.giro}>
        <Text
          text={texto}
          fontSize={tam}
          fontStyle="bold"
          fill={colorTexto}
          width={Math.max(w, 90)}
          x={-Math.max(w, 90) / 2}
          y={subtexto ? -tam : -tam / 2}
          align="center"
        />
        {subtexto ? (
          <Text text={subtexto} fontSize={tam * 0.72} fill={colorTexto} width={Math.max(w, 110)} x={-Math.max(w, 110) / 2} y={2} align="center" />
        ) : null}
        {icono ? (
          <Text text={icono} fontSize={tam * 0.8} fill={colorTexto} x={w / 2 - tam * 0.9} y={-h / 2 + 2} />
        ) : null}
      </Group>
    </Group>
  );
}

export function FormaElemento({ el }: { el: ElementoDibujo }) {
  const color = coloresElemento[el.tipo] ?? "#999";
  if (el.tipo === "columna" || el.tipo === "planta") {
    return (
      <Group>
        <Circle radius={Math.min(el.ancho, el.alto) / 2} fill={el.tipo === "planta" ? "#dfe8cf" : color} stroke={color} strokeWidth={2} />
      </Group>
    );
  }
  return (
    <Group>
      <Rect
        x={-el.ancho / 2}
        y={-el.alto / 2}
        width={el.ancho}
        height={el.alto}
        fill={el.tipo === "puerta" ? "#dfe8cf" : el.tipo === "ventana" ? "#dbe9f1" : color}
        stroke={color}
        strokeWidth={el.tipo === "pared" ? 0 : 2}
        dash={el.tipo === "puerta" ? [6, 4] : undefined}
        cornerRadius={el.tipo === "barra" ? 6 : 0}
      />
      {el.etiqueta && el.tipo !== "pared" ? (
        <Group rotation={-el.giro}>
          <Text text={el.etiqueta} fontSize={14} fill={el.tipo === "barra" || el.tipo === "cocina" ? "#f7efe1" : "#2b1f17"} width={160} x={-80} y={el.alto > 40 ? -7 : el.alto / 2 + 4} align="center" />
        </Group>
      ) : null}
    </Group>
  );
}

/** Rectángulo que contiene todo el plano, para encajarlo en pantalla. */
export function limites(mesas: MesaDibujo[], elementos: ElementoDibujo[]) {
  const piezas = [...mesas, ...elementos];
  if (!piezas.length) return { x: 0, y: 0, ancho: 1000, alto: 700 };
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  const esMesa = new Set(mesas.map((m) => m.id));
  for (const p of piezas) {
    const a = (p.giro * Math.PI) / 180;
    const margen = esMesa.has(p.id) ? 26 : 4; // sillas alrededor de las mesas
    const hx = Math.abs((p.ancho / 2) * Math.cos(a)) + Math.abs((p.alto / 2) * Math.sin(a)) + margen;
    const hy = Math.abs((p.ancho / 2) * Math.sin(a)) + Math.abs((p.alto / 2) * Math.cos(a)) + margen;
    minX = Math.min(minX, p.x - hx);
    minY = Math.min(minY, p.y - hy);
    maxX = Math.max(maxX, p.x + hx);
    maxY = Math.max(maxY, p.y + hy);
  }
  minX -= 12;
  minY -= 12;
  maxX += 12;
  maxY += 12;
  return { x: minX, y: minY, ancho: maxX - minX, alto: maxY - minY };
}
