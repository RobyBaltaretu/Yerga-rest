"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import { ChevronDown } from "lucide-react";
import { Adorno } from "@/components/marca/Marca";
import { muelle } from "./movimiento";

export type Capitulo = { nombre: string; texto: string; imagen: string; ancho: number; alto: number; foto?: boolean };

type Props = {
  titulo: string;
  capitulos: Capitulo[];
  alma: string;
  equipo?: string;
  firma: string;
  fotoAlt: string;
  desliza: string;
  saltar: string;
};

/**
 * La historia de Yerga contada con el scroll: un escenario fijo que recorre los capítulos
 * (la abuela, el arroz, la paella, su casa y el alma). Con movimiento reducido se muestra
 * como una lista; el texto completo está siempre en el documento para lectores de pantalla.
 */
export function HistoriaYerga(props: Props) {
  const reducir = useReducedMotion();
  return reducir ? <HistoriaEstatica {...props} /> : <HistoriaAnimada {...props} />;
}

function HistoriaAnimada({ titulo, capitulos, alma, equipo, firma, fotoAlt, desliza, saltar }: Props) {
  const seccion = useRef<HTMLElement>(null);
  const n = capitulos.length;
  const { scrollYProgress } = useScroll({ target: seccion, offset: ["start start", "end end"] });
  const progreso = useSpring(scrollYProgress, muelle);
  const giro = useTransform(progreso, [0, 1], [-5, 5]);
  const [activo, setActivo] = useState(0);
  const [dir, setDir] = useState(1);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const i = Math.min(n - 1, Math.max(0, Math.floor(v * n * 0.999)));
    if (i !== activo) {
      setDir(i > activo ? 1 : -1);
      setActivo(i);
    }
  });
  const c = capitulos[activo];
  const ultimo = activo === n - 1;

  const saltarHistoria = () => {
    const el = seccion.current;
    if (el) window.scrollTo({ top: el.offsetTop + el.offsetHeight - window.innerHeight + 1, behavior: "smooth" });
  };

  return (
    <section ref={seccion} id="casa" aria-labelledby="t-casa" className="relative scroll-mt-0" style={{ height: `${n * 90 + 40}dvh` }}>
      {/* Texto completo para lectores de pantalla y buscadores. */}
      <div className="sr-only">
        <h2 id="t-casa">{titulo}</h2>
        {capitulos.map((x) => (
          <div key={x.nombre}>
            <h3>{x.nombre}</h3>
            <p>{x.texto}</p>
          </div>
        ))}
        <p>{alma}</p>
        {equipo ? <p>{equipo}</p> : null}
        <p>{firma}</p>
      </div>

      <div aria-hidden className="papel sticky top-0 flex h-dvh flex-col overflow-hidden pt-16">
        <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
          {/* Texto del capítulo */}
          <div className="order-last lg:order-first">
            <p className="font-romana text-lg text-suave sm:text-xl">{titulo}</p>
            <Adorno className="mt-3" />
            <div className="relative mt-6 min-h-[11rem] sm:min-h-[13rem]">
              <AnimatePresence mode="popLayout" initial={false} custom={dir}>
                <motion.div
                  key={activo}
                  custom={dir}
                  variants={{
                    entra: (d: number) => ({ y: d * 28, opacity: 0, filter: "blur(6px)" }),
                    quieto: { y: 0, opacity: 1, filter: "blur(0px)" },
                    sale: (d: number) => ({ y: d * -28, opacity: 0, filter: "blur(6px)" }),
                  }}
                  initial="entra"
                  animate="quieto"
                  exit="sale"
                >
                  <p className="font-romana text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.02] text-texto">{c.nombre}</p>
                  <p className="mt-4 max-w-[40ch] text-lg leading-relaxed text-texto/85 sm:text-xl">{c.texto}</p>
                  {ultimo ? (
                    <>
                      <p className="mt-4 max-w-[44ch] font-medium leading-relaxed">{alma}</p>
                      {equipo ? <p className="mt-2 max-w-[44ch] text-[15px] leading-relaxed text-suave">{equipo}</p> : null}
                      <p className="mt-4 font-firma text-[2.6rem] leading-none text-cobre sm:text-5xl">{firma}</p>
                    </>
                  ) : null}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Escena: medallón con marco de azulejo */}
          <div className="mx-auto w-[min(64vw,42dvh,340px)] lg:w-[min(100%,58dvh,460px)]">
            <motion.div className="mesa-azulejo rounded-[36px] p-[7%]" style={{ rotate: giro }}>
              <div className="relative grid aspect-square place-items-center overflow-hidden rounded-[26px] bg-superficie">
                <AnimatePresence mode="popLayout" initial={false} custom={dir}>
                  <motion.div
                    key={activo}
                    custom={dir}
                    className="absolute inset-0 grid place-items-center"
                    variants={{
                      entra: (d: number) => ({ scale: 0.7, rotate: d * -14, opacity: 0 }),
                      quieto: { scale: 1, rotate: 0, opacity: 1 },
                      sale: (d: number) => ({ scale: 1.15, rotate: d * 14, opacity: 0 }),
                    }}
                    initial="entra"
                    animate="quieto"
                    exit="sale"
                  >
                    {c.foto ? (
                      <Image src={c.imagen} alt={fotoAlt} width={c.ancho} height={c.alto} sizes="460px" className="h-full w-full object-cover sepia-[.25]" />
                    ) : (
                      <Image src={c.imagen} alt="" width={c.ancho} height={c.alto} sizes="240px" className="h-auto w-[52%] drop-shadow-[0_18px_22px_rgba(59,36,22,0.18)]" />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Progreso: un tramo por capítulo, con el nombre del que se está leyendo. */}
        <div className="mx-auto w-full max-w-6xl px-4 pb-6 sm:px-6">
          <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
            {capitulos.map((x, i) => (
              <Tramo key={x.nombre} progreso={progreso} desde={i / n} hasta={(i + 1) / n} />
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between gap-4 text-[13px] text-suave">
            <AnimatePresence initial={false}>
              {activo === 0 ? (
                <motion.span key="desliza" className="flex items-center gap-1.5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <motion.span animate={{ y: [0, 4, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}>
                    <ChevronDown className="size-4" strokeWidth={1.75} />
                  </motion.span>
                  {desliza}
                </motion.span>
              ) : (
                <span key="vacio" />
              )}
            </AnimatePresence>
            {!ultimo ? (
              <button type="button" tabIndex={-1} onClick={saltarHistoria} className="enlace pointer-events-auto">
                {saltar}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function Tramo({ progreso, desde, hasta }: { progreso: MotionValue<number>; desde: number; hasta: number }) {
  const escala = useTransform(progreso, [desde, hasta], [0, 1], { clamp: true });
  return (
    <div className="h-1 overflow-hidden rounded-full bg-linea">
      <motion.div className="h-full origin-left rounded-full bg-cobre" style={{ scaleX: escala }} />
    </div>
  );
}

function HistoriaEstatica({ titulo, capitulos, alma, equipo, firma, fotoAlt }: Props) {
  return (
    <section id="casa" aria-labelledby="t-casa" className="papel scroll-mt-24 py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h2 id="t-casa" className="text-[clamp(2rem,4vw,2.75rem)] leading-[1.1]">
          {titulo}
        </h2>
        <Adorno className="mt-4" />
        <ol className="mt-12 space-y-14">
          {capitulos.map((c) => (
            <li key={c.nombre} className="grid items-center gap-6 sm:grid-cols-[10rem_1fr]">
              <div className="mesa-azulejo rounded-3xl p-3">
                <div className="grid aspect-square place-items-center overflow-hidden rounded-2xl bg-superficie">
                  <Image src={c.imagen} alt={c.foto ? fotoAlt : ""} width={c.ancho} height={c.alto} sizes="160px" className={c.foto ? "h-full w-full object-cover" : "h-auto w-1/2"} />
                </div>
              </div>
              <div>
                <h3 className="font-romana text-3xl">{c.nombre}</h3>
                <p className="mt-2 text-lg leading-relaxed text-suave">{c.texto}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-12 text-lg font-medium leading-relaxed">{alma}</p>
        {equipo ? <p className="mt-3 leading-relaxed text-suave">{equipo}</p> : null}
        <p className="mt-4 font-firma text-5xl leading-none text-cobre">{firma}</p>
      </div>
    </section>
  );
}
