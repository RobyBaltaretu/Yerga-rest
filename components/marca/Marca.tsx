import Image from "next/image";

/**
 * Piezas de la identidad de Yerga («Arroces con alma»): el logotipo ilustrado
 * (espiga, casa y paella), el monograma con la Y, el adorno con corazón y la
 * cenefa de azulejo valenciano.
 */

/** Logotipo completo: emblema, «YERGA» y «Arroces con alma». */
export function LogoCompleto({
  tono = "color",
  className = "",
  preload = false,
  sizes = "(min-width: 640px) 420px, 78vw",
}: {
  tono?: "color" | "claro";
  className?: string;
  preload?: boolean;
  sizes?: string;
}) {
  return (
    <Image
      src={tono === "claro" ? "/marca/logo-claro.webp" : "/marca/logo.webp"}
      alt="Yerga · Arroces con alma"
      width={640}
      height={436}
      sizes={sizes}
      preload={preload}
      className={className}
    />
  );
}

/** Logotipo horizontal para cabeceras: emblema pequeño y el nombre. */
export function LogoHorizontal({ tono = "claro", className = "" }: { tono?: "color" | "claro"; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Image
        src={tono === "claro" ? "/marca/emblema-claro.webp" : "/marca/emblema.webp"}
        alt=""
        width={360}
        height={213}
        sizes="72px"
        className="h-9 w-auto"
      />
      <span className={`font-display text-2xl tracking-[0.12em] ${tono === "claro" ? "text-arroz" : "text-tinta"}`}>YERGA</span>
    </span>
  );
}

export function Corazon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 22" className={className} aria-hidden fill="currentColor">
      <path d="M12 21.5 10.3 20C4.2 14.5 0 10.8 0 6.4 0 2.8 2.8 0 6.4 0c2 0 4 .9 5.6 2.5C13.6.9 15.6 0 17.6 0 21.2 0 24 2.8 24 6.4c0 4.4-4.2 8.1-10.3 13.6L12 21.5Z" />
    </svg>
  );
}

/** Línea — corazón — línea, como bajo el logotipo. */
export function Adorno({ className = "", oscuro = false }: { className?: string; oscuro?: boolean }) {
  const linea = oscuro ? "bg-azafran/60" : "bg-pimenton/45";
  return (
    <span className={`flex items-center gap-3 ${className}`} aria-hidden>
      <span className={`h-px w-12 ${linea}`} />
      <Corazon className={`size-4 ${oscuro ? "text-azafran" : "text-pimenton"}`} />
      <span className={`h-px w-12 ${linea}`} />
    </span>
  );
}

/** Monograma: la Y con la espiga de arroz y el corazón (sello de la marca). */
export function Monograma({ className = "", color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden fill="none">
      <path d="M60 10a50 50 0 1 0 49 60" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      {/* Espiga sobre el arco */}
      <g fill={color}>
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const a = (-150 + i * 17) * (Math.PI / 180);
          const x = 60 + 50 * Math.cos(a);
          const y = 60 + 50 * Math.sin(a);
          const giro = (-150 + i * 17) + 90;
          return (
            <g key={i} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${giro})`}>
              <ellipse cx="-5" cy="-3" rx="2.4" ry="5.2" transform="rotate(-35)" />
              <ellipse cx="5" cy="-3" rx="2.4" ry="5.2" transform="rotate(35)" />
            </g>
          );
        })}
      </g>
      <text x="60" y="80" textAnchor="middle" fontSize="62" fill={color} fontFamily="var(--font-marcellus), Georgia, serif">
        Y
      </text>
      <path
        fill={color}
        transform="translate(53.5 92) scale(0.54)"
        d="M12 21.5 10.3 20C4.2 14.5 0 10.8 0 6.4 0 2.8 2.8 0 6.4 0c2 0 4 .9 5.6 2.5C13.6.9 15.6 0 17.6 0 21.2 0 24 2.8 24 6.4c0 4.4-4.2 8.1-10.3 13.6L12 21.5Z"
      />
    </svg>
  );
}

/** Cenefa de azulejos valencianos (cobalto, ocre y oliva sobre cal). */
export function CenefaAzulejo({ className = "" }: { className?: string }) {
  return <div className={`cenefa-azulejo ${className}`} aria-hidden />;
}
