"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Desplazamiento en profundidad suave: la capa se mueve más despacio que la página. */
export function Parallax({ children, factor = 0.15, className = "" }: { children: ReactNode; factor?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let marco = 0;
    const actualizar = () => {
      marco = 0;
      const r = el.getBoundingClientRect();
      const centro = r.top + r.height / 2 - innerHeight / 2;
      el.style.transform = `translate3d(0, ${(-centro * factor).toFixed(1)}px, 0)`;
    };
    const alDesplazar = () => {
      if (!marco) marco = requestAnimationFrame(actualizar);
    };
    actualizar();
    addEventListener("scroll", alDesplazar, { passive: true });
    return () => {
      removeEventListener("scroll", alDesplazar);
      cancelAnimationFrame(marco);
    };
  }, [factor]);
  return (
    <div ref={ref} className={`will-change-transform ${className}`}>
      {children}
    </div>
  );
}
