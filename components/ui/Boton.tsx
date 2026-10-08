import type { ButtonHTMLAttributes } from "react";

type Variante = "primario" | "secundario" | "fantasma" | "peligro";

const estilos: Record<Variante, string> = {
  primario:
    "bg-pimenton text-white hover:bg-pimenton-oscuro disabled:bg-niebla/60 shadow-sm",
  secundario:
    "bg-white text-tinta ring-1 ring-tinta/15 hover:ring-tinta/40 disabled:text-niebla",
  fantasma: "text-tinta underline-offset-4 hover:underline disabled:text-niebla",
  peligro: "bg-white text-pimenton-oscuro ring-1 ring-pimenton/40 hover:bg-pimenton/5",
};

export function Boton({
  variante = "primario",
  className = "",
  cargando = false,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; cargando?: boolean }) {
  return (
    <button
      {...props}
      disabled={props.disabled || cargando}
      aria-busy={cargando || undefined}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-base font-semibold transition-colors disabled:cursor-not-allowed ${estilos[variante]} ${className}`}
    >
      {cargando ? (
        <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
      ) : null}
      {children}
    </button>
  );
}
