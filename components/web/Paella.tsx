import { brasas, granos, piezas, r1, RADIO_PAELLA } from "./geometria";

/**
 * Paella vista desde arriba, dibujada en SVG. `escena` fija un estado estático
 * (0 fuego · 1 sofrito · 2 ingredientes · 3 caldo y arroz · 4 socarrat); sin
 * escena se dibuja el estado inicial y la anima GSAP a partir de las clases p-*.
 */
export function Paella({
  escena,
  nGranos = 220,
  nBrasas = 46,
  id = "p",
  className,
  etiqueta,
}: {
  escena?: number;
  nGranos?: number;
  nBrasas?: number;
  id?: string;
  className?: string;
  etiqueta: string;
}) {
  const e = escena ?? 0;
  const animada = escena === undefined;
  const lista = granos(nGranos);
  const pollo = piezas(9, 11);
  const conejo = piezas(7, 23);
  const garrofo = piezas(16, 37);
  const bajoqueta = piezas(12, 51);
  const ascuas = brasas(nBrasas);

  const visible = (desde: number) => (e >= desde ? 1 : 0);
  const caldo = e === 3 ? 0.82 : e === 4 ? 0.08 : 0;
  const cruz = e === 3;

  return (
    <svg viewBox="-430 -430 860 860" className={className} role="img" aria-label={etiqueta} data-paella={animada ? "animada" : undefined}>
      <defs>
        <radialGradient id={`${id}-acero`} cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#4a443f" />
          <stop offset="80%" stopColor="#2c2825" />
          <stop offset="100%" stopColor="#1a1715" />
        </radialGradient>
        <radialGradient id={`${id}-aceite`} cx="45%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#f4c64d" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#c98a1c" stopOpacity="0.55" />
        </radialGradient>
        <radialGradient id={`${id}-caldo`} cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#e7a33b" />
          <stop offset="100%" stopColor="#b8681a" />
        </radialGradient>
        <radialGradient id={`${id}-socarrat`} cx="50%" cy="50%" r="50%">
          <stop offset="78%" stopColor="#7a4515" stopOpacity="0" />
          <stop offset="92%" stopColor="#7a4515" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#3d1f08" stopOpacity="0.95" />
        </radialGradient>
        <radialGradient id={`${id}-resplandor`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ff8a2a" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ff8a2a" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Fuego: resplandor y brasas de leña de naranjo */}
      <circle className="p-resplandor" r="430" fill={`url(#${id}-resplandor)`} opacity={animada ? 0.9 : e === 0 ? 1 : 0.6} />
      <g className="p-brasas">
        {ascuas.map((b, i) => (
          <circle key={i} className="p-brasa" cx={b.x} cy={b.y} r={b.r} fill={b.color} style={{ animationDelay: `${b.retraso}s` }} />
        ))}
      </g>

      {/* Asas y paella */}
      <rect x={-405} y={-26} width={90} height={52} rx={22} fill="#2c2825" />
      <rect x={315} y={-26} width={90} height={52} rx={22} fill="#2c2825" />
      <circle r={RADIO_PAELLA + 26} fill="#1f1b18" />
      <circle r={RADIO_PAELLA} fill={`url(#${id}-acero)`} />

      {/* Sofrito: aceite, tomate y pimentón */}
      <circle className="p-aceite" r={RADIO_PAELLA - 6} fill={`url(#${id}-aceite)`} opacity={e >= 1 ? 0.8 : 0} />
      <g className="p-tomate" opacity={e >= 1 ? 1 : 0}>
        {piezas(14, 61, RADIO_PAELLA - 80).map((p, i) => (
          <ellipse key={i} cx={p.x} cy={p.y} rx={r1(34 * p.escala)} ry={r1(24 * p.escala)} transform={`rotate(${p.giro} ${p.x} ${p.y})`} fill="#c7361b" opacity="0.55" />
        ))}
      </g>
      <circle className="p-pimenton" r={RADIO_PAELLA - 6} fill="#a8401c" opacity={e >= 1 ? 0.28 : 0} />

      {/* Caldo */}
      <circle className="p-caldo" r={RADIO_PAELLA - 4} fill={`url(#${id}-caldo)`} opacity={caldo} />

      {/* Arroz: en cruz y después repartido */}
      <g className="p-granos" fill={e >= 4 ? "#e9b44c" : "#f6ecd2"} opacity={visible(3)}>
        {lista.map((g, i) => (
          <g key={i} className="p-grano" data-dx={r1(g.cx - g.x)} data-dy={r1(g.cy - g.y)} transform={cruz ? `translate(${r1(g.cx - g.x)} ${r1(g.cy - g.y)})` : undefined}>
            <ellipse cx={g.x} cy={g.y} rx={7} ry={3} transform={`rotate(${g.giro} ${g.x} ${g.y})`} />
          </g>
        ))}
      </g>

      {/* Ingredientes: pollo, conejo, garrofó y bajoqueta */}
      <g className="p-ingredientes" opacity={visible(2)}>
        <g className="p-ing p-pollo">
          {pollo.map((p, i) => (
            <g key={i} transform={`translate(${p.x} ${p.y}) rotate(${p.giro}) scale(${p.escala})`}>
              <path d="M-30 -14 C-34 -30 10 -34 26 -18 C40 -4 30 20 8 22 C-14 24 -26 6 -30 -14Z" fill="#d9a35f" />
              <path d="M-16 -8 C-8 -18 12 -18 18 -6" stroke="#a8692b" strokeWidth="5" fill="none" strokeLinecap="round" />
            </g>
          ))}
        </g>
        <g className="p-ing p-conejo">
          {conejo.map((p, i) => (
            <g key={i} transform={`translate(${p.x} ${p.y}) rotate(${p.giro}) scale(${p.escala})`}>
              <path d="M-24 -10 C-20 -24 18 -24 24 -8 C28 6 14 18 -4 18 C-20 18 -28 4 -24 -10Z" fill="#b98352" />
            </g>
          ))}
        </g>
        <g className="p-ing p-garrofo">
          {garrofo.map((p, i) => (
            <ellipse key={i} cx={p.x} cy={p.y} rx={r1(15 * p.escala)} ry={r1(11 * p.escala)} transform={`rotate(${p.giro} ${p.x} ${p.y})`} fill="#efe6c8" stroke="#cbbf98" strokeWidth="2" />
          ))}
        </g>
        <g className="p-ing p-bajoqueta">
          {bajoqueta.map((p, i) => (
            <rect key={i} x={r1(p.x - 30)} y={r1(p.y - 7)} width={60} height={14} rx={7} transform={`rotate(${p.giro} ${p.x} ${p.y})`} fill="#5f8a2e" stroke="#3f6a1c" strokeWidth="2" />
          ))}
        </g>
      </g>

      {/* Socarrat: el borde se dora */}
      <circle className="p-socarrat" r={RADIO_PAELLA} fill={`url(#${id}-socarrat)`} opacity={e >= 4 ? 1 : 0} />
      {/* Brillo del metal */}
      <ellipse cx={-120} cy={-170} rx={120} ry={40} transform="rotate(-30 -120 -170)" fill="#ffffff" opacity="0.05" />
    </svg>
  );
}
