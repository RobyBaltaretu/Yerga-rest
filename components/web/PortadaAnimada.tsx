"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Secuencia «Del fuego al socarrat» ligada al scroll. GSAP y ScrollTrigger se
 * cargan después del primer pintado; si fallan, la portada sigue siendo útil.
 */
export function ControlesPortada({
  escenas,
  textos,
  sonido,
}: {
  escenas: string[];
  textos: string[];
  sonido: { off: string; on: string };
}) {
  const ancla = useRef<HTMLDivElement>(null);
  const seccion = useRef<HTMLElement | null>(null);
  const [escena, setEscena] = useState(0);
  const [sonando, setSonando] = useState(false);
  const audio = useRef<{ parar: () => void } | null>(null);

  useEffect(() => {
    const el = (seccion.current = ancla.current?.closest<HTMLElement>(".portada-animada") ?? null);
    if (!el) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("ligera")) return;
    let cancelado = false;
    let limpiar: (() => void) | undefined;

    // GSAP se carga al primer gesto o cuando el navegador queda libre: no compite
    // con la carga inicial de la página.
    const cuandoHaga = new Promise<void>((resolver) => {
      const listo = () => resolver();
      for (const ev of ["scroll", "pointerdown", "touchstart", "keydown", "wheel"]) addEventListener(ev, listo, { once: true, passive: true });
      setTimeout(listo, 3500);
    });

    (async () => {
      await cuandoHaga;
      if (cancelado) return;
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
      if (cancelado) return;
      gsap.registerPlugin(ScrollTrigger);
      const q = gsap.utils.selector(el);
      const granos = Array.from(el.querySelectorAll<SVGGElement>(".p-grano"));

      const ctx = gsap.context(() => {
        const tl = gsap.timeline({
          defaults: { ease: "power2.out" },
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.6,
            onUpdate: (st) => setEscena(Math.min(4, Math.floor(st.progress * 5.0001))),
          },
        });
        // 1 · Fuego → el nombre se aparta
        tl.to(q(".portada-marca"), { opacity: 0, y: -60, duration: 0.6 }, 0.5);
        tl.to(q(".p-resplandor"), { opacity: 0.55, duration: 1 }, 0.4);
        // 2 · Sofrito
        tl.to(q(".p-aceite"), { opacity: 0.8, duration: 0.6 }, 1);
        tl.fromTo(q(".p-tomate"), { opacity: 0, scale: 0.6, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 0.6 }, 1.1);
        tl.to(q(".p-pimenton"), { opacity: 0.28, duration: 0.5 }, 1.35);
        // 3 · Ingredientes que caen y se colocan
        tl.set(q(".p-ingredientes"), { opacity: 1 }, 2);
        tl.fromTo(q(".p-ing"), { y: -760, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.16, ease: "bounce.out" }, 2);
        tl.fromTo(q(".portada-etiqueta"), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.25, stagger: 0.16 }, 2.15);
        tl.to(q(".portada-etiqueta"), { opacity: 0, duration: 0.25 }, 2.95);
        // 4 · Caldo y arroz en cruz
        tl.to(q(".p-caldo"), { opacity: 0.82, scale: 1, duration: 0.5 }, 3);
        tl.set(q(".p-granos"), { opacity: 1 }, 3.15);
        tl.fromTo(
          granos,
          { x: (i: number) => Number(granos[i].dataset.dx), y: (i: number) => Number(granos[i].dataset.dy), opacity: 0 },
          { opacity: 1, duration: 0.25, stagger: { amount: 0.25 } },
          3.15,
        );
        tl.to(granos, { x: 0, y: 0, duration: 0.5, ease: "power2.inOut", stagger: { amount: 0.15, from: "center" } }, 3.6);
        // 5 · Socarrat
        tl.to(q(".p-caldo"), { opacity: 0.08, duration: 0.6 }, 4);
        tl.to(q(".p-socarrat"), { opacity: 1, duration: 0.7 }, 4.1);
        tl.to(q(".p-granos"), { attr: { fill: "#e9b44c" }, duration: 0.6 }, 4.1);
        tl.fromTo(q(".portada-final"), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5 }, 4.45);
        tl.to({}, { duration: 0.35 });
      }, el);
      limpiar = () => ctx.revert();
    })().catch(() => {
      // Sin animación: el contenido y el botón de reservar siguen ahí.
    });

    return () => {
      cancelado = true;
      limpiar?.();
    };
  }, []);

  // Sonido opcional del caldo, solo mientras la portada está a la vista.
  useEffect(() => {
    if (!sonando) {
      audio.current?.parar();
      audio.current = null;
      return;
    }
    audio.current = chupChup();
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) setSonando(false);
    });
    if (seccion.current) io.observe(seccion.current);
    return () => {
      io.disconnect();
      audio.current?.parar();
      audio.current = null;
    };
  }, [sonando]);

  return (
    <div ref={ancla} className="pointer-events-none absolute inset-x-0 bottom-24 flex flex-col items-center px-4 text-center sm:bottom-16">
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-azafran">
        {String(escena + 1).padStart(2, "0")} · {escenas[escena]}
      </p>
      <p className="mt-2 max-w-md font-display text-xl text-arroz/90 sm:text-2xl">{textos[escena]}</p>
      <button
        type="button"
        onClick={() => setSonando(!sonando)}
        aria-pressed={sonando}
        className="pointer-events-auto mt-3 min-h-11 rounded-full bg-white/10 px-4 text-sm font-semibold text-arroz ring-1 ring-white/20 backdrop-blur hover:bg-white/20"
      >
        {sonando ? `🔊 ${sonido.on}` : `🔈 ${sonido.off}`}
      </button>
    </div>
  );
}

/** Chup-chup del caldo sintetizado con Web Audio: burbujas al azar sobre un rumor grave. */
function chupChup() {
  const ctx = new AudioContext();
  const salida = ctx.createGain();
  salida.gain.value = 0.25;
  salida.connect(ctx.destination);

  const ruido = ctx.createBufferSource();
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const datos = buffer.getChannelData(0);
  for (let i = 0; i < datos.length; i++) datos[i] = (Math.random() * 2 - 1) * 0.3;
  ruido.buffer = buffer;
  ruido.loop = true;
  const filtro = ctx.createBiquadFilter();
  filtro.type = "lowpass";
  filtro.frequency.value = 380;
  const rumor = ctx.createGain();
  rumor.gain.value = 0.35;
  ruido.connect(filtro).connect(rumor).connect(salida);
  ruido.start();

  const burbuja = () => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const t = ctx.currentTime;
    const f = 280 + Math.random() * 520;
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 1.8, t + 0.06);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    o.connect(g).connect(salida);
    o.start(t);
    o.stop(t + 0.1);
  };
  const intervalo = setInterval(() => {
    if (Math.random() < 0.7) burbuja();
  }, 140);

  return {
    parar() {
      clearInterval(intervalo);
      ruido.stop();
      void ctx.close();
    },
  };
}
