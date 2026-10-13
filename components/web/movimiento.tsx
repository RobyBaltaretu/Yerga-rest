"use client";

import { forwardRef, useCallback, useRef, type ComponentProps, type PointerEvent, type ReactNode } from "react";
import { MotionConfig, motion, type HTMLMotionProps } from "motion/react";
import { Link } from "@/i18n/navigation";

/** El muelle de toda la web: natural, sin rebote visible. */
export const muelle = { type: "spring", stiffness: 300, damping: 30 } as const;

/** Respeta «reducir movimiento» del sistema y fija el muelle por defecto. */
export function ProveedorMovimiento({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={muelle}>
      {children}
    </MotionConfig>
  );
}

type Variante = "primario" | "secundario" | "fantasma";
type Tamano = "sm" | "md" | "lg";

const base =
  "inline-flex select-none items-center justify-center gap-2 rounded-full font-medium tracking-[-0.01em] transition-[background-color,box-shadow,color,opacity] duration-150 disabled:cursor-not-allowed disabled:opacity-50";
const variantes: Record<Variante, string> = {
  primario: "bg-cobre text-invertido shadow-tarjeta hover:bg-cobre-oscuro",
  secundario: "bg-superficie text-texto shadow-tarjeta hover:shadow-elevada",
  fantasma: "text-texto hover:bg-sutil",
};
const tamanos: Record<Tamano, string> = {
  sm: "min-h-9 px-4 text-[14px]",
  md: "min-h-11 px-5 text-[15px]",
  lg: "min-h-12 px-6 text-base",
};

export function claseBoton(variante: Variante = "primario", tamano: Tamano = "md", extra = "") {
  return `${base} ${variantes[variante]} ${tamanos[tamano]} ${extra}`;
}

const pulsar = { scale: 0.98 };

/** Botón de la web: escala 0,98 al pulsar con el muelle. Misma API que el del panel. */
export const Boton = forwardRef<
  HTMLButtonElement,
  Omit<HTMLMotionProps<"button">, "children"> & { variante?: Variante | "peligro"; tamano?: Tamano; cargando?: boolean; children?: ReactNode }
>(function Boton({ variante = "primario", tamano = "md", cargando = false, className = "", children, disabled, ...props }, ref) {
  const v: Variante = variante === "peligro" ? "secundario" : variante;
  return (
    <motion.button
      ref={ref}
      whileTap={disabled || cargando ? undefined : pulsar}
      {...props}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      className={`${claseBoton(v, tamano)} ${variante === "peligro" ? "text-peligro" : ""} ${className}`}
    >
      {cargando ? <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden /> : null}
      {children}
    </motion.button>
  );
});

const LinkMovil = motion.create(Link);

/** Enlace con forma de botón (navegación interna, con idioma). */
export function EnlaceBoton({
  variante = "primario",
  tamano = "md",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variante?: Variante; tamano?: Tamano }) {
  return <LinkMovil whileTap={pulsar} {...(props as object)} className={claseBoton(variante, tamano, className)} />;
}

/**
 * Superficie con brillo radial y borde iluminado que siguen al puntero. Solo con ratón:
 * en pantallas táctiles el CSS lo desactiva.
 */
export function ConBrillo({ children, className = "", as = "div" }: { children: ReactNode; className?: string; as?: "div" | "section" | "article" }) {
  const ref = useRef<HTMLElement>(null);
  const mover = useCallback((e: PointerEvent<HTMLElement>) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--x", `${e.clientX - r.left}px`);
    el.style.setProperty("--y", `${e.clientY - r.top}px`);
    el.style.setProperty("--brillo", "1");
  }, []);
  const salir = useCallback(() => ref.current?.style.setProperty("--brillo", "0"), []);
  const Tag = as;
  return (
    <Tag ref={ref as never} onPointerMove={mover} onPointerLeave={salir} className={`brillo ${className}`}>
      {children}
    </Tag>
  );
}
