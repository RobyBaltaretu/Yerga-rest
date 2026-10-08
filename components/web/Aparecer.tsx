"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Aparición escalonada al entrar en pantalla (desactivada con movimiento reducido). */
export function Aparecer({ children, retraso = 0, className = "", as: Tag = "div" }: { children: ReactNode; retraso?: number; className?: string; as?: "div" | "li" }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add("visible");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref as never} className={`aparece ${className}`} style={{ ["--retraso" as string]: `${retraso}ms` }}>
      {children}
    </Tag>
  );
}
