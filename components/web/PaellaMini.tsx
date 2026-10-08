import { aleatorio, r1 } from "./geometria";

// Paella cenital pequeña para el carrusel: el color del arroz y los tropezones
// cambian según el plato.
const estilos: Record<string, { arroz: string; borde: string; extras: { color: string; forma: "pieza" | "gamba" | "verde" | "fideo" | "bogavante" | "morcilla" }[]; recipiente?: "cazuela" }> = {
  "paella-valenciana": { arroz: "#e9b44c", borde: "#7a4515", extras: [{ color: "#d9a35f", forma: "pieza" }, { color: "#5f8a2e", forma: "verde" }, { color: "#efe6c8", forma: "pieza" }] },
  "arros-a-banda": { arroz: "#e08a3a", borde: "#7a3a10", extras: [{ color: "#f3efe4", forma: "pieza" }] },
  "arros-del-senyoret": { arroz: "#e4923e", borde: "#7a3a10", extras: [{ color: "#e2553b", forma: "gamba" }, { color: "#f3efe4", forma: "pieza" }] },
  "arros-negre": { arroz: "#2a2622", borde: "#0e0c0b", extras: [{ color: "#f3efe4", forma: "pieza" }] },
  fideua: { arroz: "#e6a447", borde: "#7a4515", extras: [{ color: "#f0c070", forma: "fideo" }, { color: "#e2553b", forma: "gamba" }] },
  "arros-al-forn": { arroz: "#c9802f", borde: "#5a2c10", recipiente: "cazuela", extras: [{ color: "#3a1a10", forma: "morcilla" }, { color: "#e9d9a8", forma: "pieza" }] },
  "meloso-de-bogavante": { arroz: "#d9763a", borde: "#6a2a0c", extras: [{ color: "#c9341b", forma: "bogavante" }] },
};

export function PaellaMini({ slug, nombre, className }: { slug: string; nombre: string; className?: string }) {
  const e = estilos[slug] ?? estilos["paella-valenciana"];
  const r = aleatorio(slug.length * 97 + slug.charCodeAt(0));
  const puntos = Array.from({ length: 70 }, () => {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * 82;
    return { x: r1(Math.cos(a) * d), y: r1(Math.sin(a) * d), g: Math.round(r() * 180) };
  });
  const tropezones = e.extras.flatMap((x, k) =>
    Array.from({ length: x.forma === "bogavante" ? 2 : 6 }, (_, i) => {
      const a = r() * Math.PI * 2;
      const d = 18 + Math.sqrt(r()) * 58;
      return { ...x, x: r1(Math.cos(a) * d), y: r1(Math.sin(a) * d), g: Math.round(r() * 360), k: `${k}-${i}` };
    }),
  );
  const cazuela = e.recipiente === "cazuela";
  return (
    <svg viewBox="-120 -120 240 240" className={className} role="img" aria-label={nombre}>
      {!cazuela ? (
        <>
          <rect x={-118} y={-9} width={30} height={18} rx={8} fill="#2c2825" />
          <rect x={88} y={-9} width={30} height={18} rx={8} fill="#2c2825" />
        </>
      ) : null}
      <circle r={102} fill={cazuela ? "#8a4a22" : "#1f1b18"} />
      <circle r={95} fill={e.arroz} />
      <circle r={95} fill="none" stroke={e.borde} strokeWidth={10} opacity={0.6} />
      {puntos.map((p, i) => (
        <ellipse key={i} cx={p.x} cy={p.y} rx={3.2} ry={1.4} transform={`rotate(${p.g} ${p.x} ${p.y})`} fill="#ffffff" opacity={0.22} />
      ))}
      {tropezones.map((t) =>
        t.forma === "gamba" ? (
          <path key={t.k} d="M-10 0 C-10 -10 8 -12 10 0 C8 6 2 8 -2 6" transform={`translate(${t.x} ${t.y}) rotate(${t.g})`} fill="none" stroke={t.color} strokeWidth={6} strokeLinecap="round" />
        ) : t.forma === "verde" ? (
          <rect key={t.k} x={r1(t.x - 12)} y={r1(t.y - 3)} width={24} height={6} rx={3} transform={`rotate(${t.g} ${t.x} ${t.y})`} fill={t.color} />
        ) : t.forma === "fideo" ? (
          <path key={t.k} d={`M${r1(t.x - 14)} ${t.y} q7 -6 14 0 t14 0`} stroke={t.color} strokeWidth={2.5} fill="none" />
        ) : t.forma === "bogavante" ? (
          <g key={t.k} transform={`translate(${t.x} ${t.y}) rotate(${t.g})`}>
            <ellipse rx={30} ry={12} fill={t.color} />
            <circle cx={-34} cy={-10} r={9} fill={t.color} />
            <circle cx={-34} cy={10} r={9} fill={t.color} />
          </g>
        ) : t.forma === "morcilla" ? (
          <circle key={t.k} cx={t.x} cy={t.y} r={9} fill={t.color} />
        ) : (
          <ellipse key={t.k} cx={t.x} cy={t.y} rx={10} ry={7} transform={`rotate(${t.g} ${t.x} ${t.y})`} fill={t.color} />
        ),
      )}
    </svg>
  );
}
