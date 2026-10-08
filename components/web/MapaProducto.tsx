"use client";

import { useEffect, useRef } from "react";

/**
 * Mapa ilustrado de l'Albufera y l'Horta que se dibuja al avanzar. Con
 * movimiento reducido aparece ya dibujado.
 */
export function MapaProducto({ textos }: { textos: { albufera: string; horta: string; mar: string; valencia: string; arroz: string; huerta: string; lonja: string; lena: string } }) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = ref.current;
    if (!svg || matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("ligera")) return;
    let limpiar: (() => void) | undefined;
    let cancelado = false;
    (async () => {
      await new Promise<void>((r) => {
        for (const ev of ["scroll", "pointerdown", "touchstart", "keydown", "wheel"]) addEventListener(ev, () => r(), { once: true, passive: true });
        setTimeout(r, 3500);
      });
      if (cancelado) return;
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
      if (cancelado) return;
      gsap.registerPlugin(ScrollTrigger);
      const ctx = gsap.context(() => {
        const trazos = svg.querySelectorAll<SVGGeometryElement>(".trazo");
        trazos.forEach((p) => {
          const l = p.getTotalLength();
          gsap.set(p, { strokeDasharray: l, strokeDashoffset: l });
        });
        const tl = gsap.timeline({ scrollTrigger: { trigger: svg, start: "top 80%", end: "bottom 40%", scrub: 0.8 } });
        tl.to(trazos, { strokeDashoffset: 0, duration: 1, stagger: 0.08, ease: "none" });
        tl.fromTo(svg.querySelectorAll(".rotulo"), { opacity: 0 }, { opacity: 1, stagger: 0.1, duration: 0.3 }, 0.5);
        tl.fromTo(svg.querySelectorAll(".relleno"), { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.3);
      }, svg);
      limpiar = () => ctx.revert();
    })().catch(() => {});
    return () => {
      cancelado = true;
      limpiar?.();
    };
  }, []);

  return (
    <svg ref={ref} viewBox="0 0 800 520" className="h-auto w-full" role="img" aria-label={`${textos.horta}, ${textos.albufera}, ${textos.mar}`}>
      {/* Mar */}
      <path className="relleno" d="M640 0 L800 0 L800 520 L560 520 C600 420 610 330 600 250 C590 160 610 80 640 0Z" fill="#dfe6f4" />
      <path className="trazo" d="M640 0 C610 80 590 160 600 250 C610 330 600 420 560 520" fill="none" stroke="#4a68b8" strokeWidth="3" />
      <text className="rotulo" x="700" y="300" fontSize="20" fill="#1f3f99" textAnchor="middle" fontStyle="italic" transform="rotate(80 700 300)">{textos.mar}</text>
      {/* L'Albufera */}
      <path className="relleno" d="M450 300 C470 260 540 250 570 290 C595 330 580 400 540 420 C500 440 450 420 440 380 C432 350 436 325 450 300Z" fill="#b9c8ea" />
      <path className="trazo" d="M450 300 C470 260 540 250 570 290 C595 330 580 400 540 420 C500 440 450 420 440 380 C432 350 436 325 450 300Z" fill="none" stroke="#1f3f99" strokeWidth="3" />
      <text className="rotulo" x="510" y="350" fontSize="22" fill="#1f3f99" textAnchor="middle" fontFamily="var(--font-marcellus)">{textos.albufera}</text>
      {/* Arrozales alrededor del lago */}
      {Array.from({ length: 9 }, (_, i) => (
        <path key={i} className="trazo" d={`M${360 + i * 12} ${440 + (i % 3) * 8} l120 -40`} stroke="#a3a457" strokeWidth="2" fill="none" />
      ))}
      <text className="rotulo" x="330" y="470" fontSize="16" fill="#66683a">{textos.arroz}</text>
      {/* L'Horta: parcelas */}
      {Array.from({ length: 6 }, (_, i) => (
        <rect key={i} className="trazo" x={90 + (i % 3) * 110} y={60 + Math.floor(i / 3) * 90} width="90" height="70" rx="6" fill="none" stroke="#66683a" strokeWidth="3" />
      ))}
      <text className="rotulo" x="240" y="250" fontSize="24" fill="#66683a" textAnchor="middle" fontFamily="var(--font-marcellus)">{textos.horta}</text>
      <text className="rotulo" x="240" y="275" fontSize="15" fill="#66683a" textAnchor="middle">{textos.huerta}</text>
      {/* València */}
      <circle className="rotulo" cx="520" cy="150" r="10" fill="#ab4e29" />
      <text className="rotulo" x="540" y="156" fontSize="18" fill="#3b2416">{textos.valencia}</text>
      <text className="rotulo" x="560" y="200" fontSize="14" fill="#1f3f99">{textos.lonja}</text>
      {/* Naranjos: leña */}
      {Array.from({ length: 7 }, (_, i) => (
        <g key={i} className="rotulo">
          <circle cx={70 + i * 40} cy={400 + (i % 2) * 22} r="13" fill="#66683a" />
          <circle cx={74 + i * 40} cy={396 + (i % 2) * 22} r="4" fill="#d9a467" />
        </g>
      ))}
      <text className="rotulo" x="70" y="470" fontSize="15" fill="#7a4515">{textos.lena}</text>
      {/* Caminos */}
      <path className="trazo" d="M240 300 C320 320 380 280 450 310" stroke="#b07a43" strokeWidth="2.5" strokeDasharray="0" fill="none" />
      <path className="trazo" d="M380 200 C430 190 470 170 510 152" stroke="#b07a43" strokeWidth="2.5" fill="none" />
    </svg>
  );
}
