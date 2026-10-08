"use client";

import { useEffect } from "react";

/**
 * Desplazamiento suave con Lenis, sincronizado con ScrollTrigger. No se activa
 * con movimiento reducido ni en modo ligero.
 */
export function ScrollSuave() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("ligera")) return;
    let destruir: (() => void) | undefined;
    let cancelado = false;
    (async () => {
      const [{ default: Lenis }, { gsap }, { ScrollTrigger }] = await Promise.all([import("lenis"), import("gsap"), import("gsap/ScrollTrigger")]);
      if (cancelado) return;
      gsap.registerPlugin(ScrollTrigger);
      const lenis = new Lenis({ lerp: 0.12 });
      lenis.on("scroll", ScrollTrigger.update);
      const tic = (t: number) => lenis.raf(t * 1000);
      gsap.ticker.add(tic);
      gsap.ticker.lagSmoothing(0);
      destruir = () => {
        gsap.ticker.remove(tic);
        lenis.destroy();
      };
    })().catch(() => {});
    return () => {
      cancelado = true;
      destruir?.();
    };
  }, []);
  return null;
}
