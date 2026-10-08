// Geometría de la paella generada en código con una semilla fija: el servidor y
// el navegador dibujan exactamente lo mismo.

export function aleatorio(semilla: number) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const RADIO_PAELLA = 300;

/** Redondeo a un decimal: el SVG pesa mucho menos y se ve igual. */
export const r1 = (v: number) => Math.round(v * 10) / 10;

export type Grano = { x: number; y: number; cx: number; cy: number; giro: number };
export type Pieza = { x: number; y: number; giro: number; escala: number };
export type Brasa = { x: number; y: number; r: number; color: string; retraso: number };

export function granos(n: number, semilla = 7): Grano[] {
  const r = aleatorio(semilla);
  return Array.from({ length: n }, (_, i) => {
    // Posición final: repartidos por toda la paella.
    const ang = r() * Math.PI * 2;
    const rad = Math.sqrt(r()) * (RADIO_PAELLA - 22);
    // Posición inicial: en cruz, como manda la tradición.
    const brazo = i % 2 === 0;
    const largo = (r() * 2 - 1) * (RADIO_PAELLA - 40);
    const ancho = (r() * 2 - 1) * 14;
    return {
      x: r1(Math.cos(ang) * rad),
      y: r1(Math.sin(ang) * rad),
      cx: r1(brazo ? largo : ancho),
      cy: r1(brazo ? ancho : largo),
      giro: Math.round(r() * 180),
    };
  });
}

export function piezas(n: number, semilla: number, radio = RADIO_PAELLA - 70): Pieza[] {
  const r = aleatorio(semilla);
  return Array.from({ length: n }, () => {
    const ang = r() * Math.PI * 2;
    const rad = 30 + Math.sqrt(r()) * (radio - 30);
    return { x: r1(Math.cos(ang) * rad), y: r1(Math.sin(ang) * rad), giro: Math.round(r() * 360), escala: Math.round((0.85 + r() * 0.3) * 100) / 100 };
  });
}

const coloresBrasa = ["#ff7a1a", "#ffb23e", "#e8471c", "#ff9a2e", "#c4310f"];

export function brasas(n: number, semilla = 3): Brasa[] {
  const r = aleatorio(semilla);
  return Array.from({ length: n }, () => {
    const ang = r() * Math.PI * 2;
    const rad = 250 + r() * 160;
    return {
      x: r1(Math.cos(ang) * rad),
      y: r1(Math.sin(ang) * rad * 0.92 + 30),
      r: r1(3 + r() * 9),
      color: coloresBrasa[Math.floor(r() * coloresBrasa.length)],
      retraso: r1(r() * 2),
    };
  });
}
