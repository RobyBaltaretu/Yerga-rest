import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { ArrowRight, Clock, MapPin, MessageCircle, Phone, Star } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { tr } from "@/lib/i18n";
import { formatPrecio } from "@/lib/format";
import type { Multilingue, Plato } from "@/lib/datos-publicos";
import { CarruselArroces } from "./CarruselArroces";
import { Termino } from "./Termino";
import { LogoCompletoWeb } from "./Logo";
import { ConBrillo, EnlaceBoton } from "./movimiento";

type Turno = { nombre: string; dia_semana: number; inicio: string; fin: string; ultima_hora: string };

/** Cabecera de sección: título con tracking ajustado y entradilla en gris. */
function Titulo({ id, titulo, intro, centrado = false }: { id: string; titulo: string; intro?: string; centrado?: boolean }) {
  return (
    <div className={centrado ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <h2 id={id} className="text-[clamp(2rem,4vw,2.75rem)] font-semibold leading-[1.05] tracking-[-0.03em]">
        {titulo}
      </h2>
      {intro ? <p className="mt-4 text-lg leading-relaxed text-suave">{intro}</p> : null}
    </div>
  );
}

const contenedor = "mx-auto max-w-6xl px-4 sm:px-6";

export async function SeccionArroces({ locale, platos }: { locale: string; platos: Plato[] }) {
  const [t, tn] = await Promise.all([getTranslations("web"), getTranslations("web.nav")]);
  const arroces = platos
    .filter((p) => p.categoria === "arroz")
    .map((p) => ({
      slug: p.slug,
      nombre: tr(p.nombre as Multilingue, locale),
      descripcion: tr(p.descripcion as Multilingue, locale),
      ingredientes: ((p.ingredientes as Record<string, string[]>)?.[locale] ?? (p.ingredientes as Record<string, string[]>)?.es ?? []) as string[],
      alergenos: p.alergenos.map((a) => t(`alergenos.${a}` as "alergenos.gluten")),
      precio: p.precio != null ? (p.precio_por_persona ? t("arroces.porPersona", { precio: formatPrecio(p.precio, locale) }) : formatPrecio(p.precio, locale)) : "",
      minimo: t("arroces.minimo", { n: p.min_comensales }),
    }));
  return (
    <section id="arroces" aria-labelledby="t-arroces" className="scroll-mt-24 py-20 sm:py-28">
      <div className={contenedor}>
        <Titulo id="t-arroces" titulo={t("arroces.titulo")} intro={t("arroces.intro")} />
        <div className="mt-12">
          <CarruselArroces
            arroces={arroces}
            textos={{
              ingredientes: t("arroces.ingredientes"),
              alergenos: t("arroces.alergenos"),
              sinAlergenos: t("arroces.sinAlergenos"),
              reservarCon: t("arroces.reservarCon"),
              verMas: t.raw("arroces.verMas") as string,
              cerrar: tn("cerrar"),
            }}
          />
        </div>
      </div>
    </section>
  );
}

export async function SeccionEntrantes({ locale, platos }: { locale: string; platos: Plato[] }) {
  const t = await getTranslations("web");
  const entrantes = platos.filter((p) => p.categoria === "entrante");
  return (
    <section aria-labelledby="t-entrantes" className="border-t border-linea py-20 sm:py-28">
      <div className={`${contenedor} grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-16`}>
        <Titulo id="t-entrantes" titulo={t("entrantes.titulo")} intro={t("entrantes.intro")} />
        <ul className="divide-y divide-linea border-y border-linea">
          {entrantes.map((p) => {
            const nombreVa = tr(p.nombre as Multilingue, "va");
            const nombre = tr(p.nombre as Multilingue, locale);
            return (
              <li key={p.id} className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 py-5">
                <p className="text-[17px] font-semibold tracking-[-0.015em]">
                  {locale === "va" || nombreVa === nombre ? nombre : <Termino va={nombreVa} traduccion={nombre} />}
                </p>
                <p className="text-right text-[15px] font-medium tabular-nums">{formatPrecio(p.precio, locale)}</p>
                <p className="col-span-2 max-w-[60ch] text-[15px] leading-relaxed text-suave">
                  {tr(p.descripcion as Multilingue, locale)}
                  {p.temporada ? <span className="text-tenue"> · {t("carta.temporada", { t: p.temporada })}</span> : null}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export async function SeccionProducto({ texto }: { texto: string }) {
  const t = await getTranslations("web.producto");
  const origenes = [
    { que: t("arroz"), donde: t("albufera") },
    { que: t("huerta"), donde: t("horta") },
    { que: t("lonja"), donde: t("mar") },
    { que: t("lena"), donde: t("valencia") },
  ];
  return (
    <section id="producto" aria-labelledby="t-producto" className="scroll-mt-24 border-t border-linea py-20 sm:py-28">
      <div className={`${contenedor} grid gap-12 lg:grid-cols-2 lg:gap-16`}>
        <div>
          <Titulo id="t-producto" titulo={t("titulo")} />
          <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-suave">{texto}</p>
        </div>
        <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-3xl bg-linea shadow-tarjeta sm:grid-cols-2">
          {origenes.map((o) => (
            <div key={o.que} className="flex min-h-36 flex-col-reverse justify-between gap-6 bg-superficie p-6">
              <dt className="text-xl font-semibold tracking-[-0.02em]">{o.que}</dt>
              <dd className="flex items-center gap-2 text-[13px] text-suave">
                <MapPin className="size-3.5" strokeWidth={1.75} aria-hidden />
                {o.donde}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export async function SeccionCasa({ historia, equipo }: { historia: string; equipo: string }) {
  const [t, tm] = await Promise.all([getTranslations("web.casa"), getTranslations("web.marca")]);
  return (
    <section id="casa" aria-labelledby="t-casa" className="scroll-mt-24 border-t border-linea py-20 sm:py-28">
      <div className={`${contenedor} grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20`}>
        <figure className="order-last lg:order-first">
          <div className="overflow-hidden rounded-3xl bg-superficie p-1.5 shadow-elevada">
            {/* Fotografía provisional de la identidad: sustituir por una foto real de la familia. */}
            <Image src="/marca/abuela.webp" alt={t("foto")} width={550} height={302} sizes="(min-width: 1024px) 540px, 92vw" className="h-auto w-full rounded-[22px]" />
          </div>
          <figcaption className="mt-3 px-1 text-[13px] text-tenue">{t("foto")}</figcaption>
        </figure>
        <div>
          <LogoCompletoWeb className="h-auto w-36" sizes="144px" />
          <h2 id="t-casa" className="mt-8 text-[clamp(1.75rem,3.4vw,2.5rem)] font-semibold leading-[1.1] tracking-[-0.03em]">
            {t("titulo")}
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-suave">{historia}</p>
          <p className="mt-4 text-lg leading-relaxed">{t("alma")}</p>
          {equipo ? <p className="mt-4 leading-relaxed text-suave">{equipo}</p> : null}
          <p className="mt-8 text-[15px] font-medium text-suave">
            {tm("lema")} · {tm("bienvenidos")}
          </p>
        </div>
      </div>
    </section>
  );
}

export async function SeccionCartaResumen({ locale, platos, ejemplo }: { locale: string; platos: Plato[]; ejemplo: boolean }) {
  const t = await getTranslations("web.carta");
  const destacados = platos.filter((p) => p.destacado || p.categoria === "postre").slice(0, 6);
  return (
    <section aria-labelledby="t-carta" className="border-t border-linea py-20 sm:py-28">
      <div className={`${contenedor} grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-16`}>
        <div>
          <Titulo id="t-carta" titulo={t("titulo")} intro={t("intro")} />
          {ejemplo ? <p className="mt-4 inline-flex rounded-full bg-acento-suave px-3 py-1 text-[13px] font-medium text-acento">{t("avisoEjemplo")}</p> : null}
          <EnlaceBoton href="/carta" variante="secundario" className="mt-8">
            {t("verCompleta")}
            <ArrowRight className="size-4" strokeWidth={2} aria-hidden />
          </EnlaceBoton>
        </div>
        <ul className="divide-y divide-linea border-y border-linea">
          {destacados.map((p) => (
            <li key={p.id} className="flex items-baseline justify-between gap-6 py-4">
              <span className="text-[17px] font-medium tracking-[-0.015em]">{tr(p.nombre as Multilingue, locale)}</span>
              <span className="shrink-0 text-[15px] tabular-nums text-suave">{formatPrecio(p.precio, locale)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export async function SeccionOpiniones({ resenas }: { resenas: { id: string; autor: string; texto: string; puntuacion: number | null; origen: string; url: string | null }[] }) {
  const t = await getTranslations("web.opiniones");
  if (!resenas.length) return null;
  return (
    <section aria-labelledby="t-opiniones" className="border-t border-linea py-20 sm:py-28">
      <div className={contenedor}>
        <Titulo id="t-opiniones" titulo={t("titulo")} />
        <ul className="mt-12 grid gap-4 md:grid-cols-3">
          {resenas.map((r) => (
            <li key={r.id} className="flex flex-col rounded-3xl bg-superficie p-6 shadow-tarjeta">
              {r.puntuacion ? (
                <p className="flex gap-0.5 text-acento" role="img" aria-label={`${r.puntuacion}/5`}>
                  {Array.from({ length: r.puntuacion }, (_, i) => (
                    <Star key={i} className="size-4 fill-current" strokeWidth={0} aria-hidden />
                  ))}
                </p>
              ) : null}
              <blockquote className="mt-4 text-[17px] leading-relaxed tracking-[-0.01em]">«{r.texto}»</blockquote>
              <p className="mt-auto pt-6 text-[13px] text-suave">
                {r.autor} ·{" "}
                {r.url ? (
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="enlace">
                    {t("ver", { origen: r.origen })}
                  </a>
                ) : (
                  r.origen
                )}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export async function SeccionLlegar({
  locale,
  config,
  turnos,
}: {
  locale: string;
  config: { direccion: string; localidad: string; codigo_postal: string; telefono: string; whatsapp: string; url_mapa: string; aparcamiento: unknown };
  turnos: Turno[];
}) {
  const t = await getTranslations("web.llegar");
  const dias = t.raw("dias") as string[];
  const orden = [1, 2, 3, 4, 5, 6, 0];
  const wa = config.whatsapp.replace(/[^0-9]/g, "");
  const enlaceContacto =
    "inline-flex min-h-11 items-center gap-2 rounded-full bg-superficie px-4 text-[15px] font-medium shadow-tarjeta transition-shadow hover:shadow-elevada";
  return (
    <section id="llegar" aria-labelledby="t-llegar" className="scroll-mt-24 border-t border-linea py-20 sm:py-28">
      <div className={`${contenedor} grid gap-12 lg:grid-cols-2 lg:gap-16`}>
        <div>
          <Titulo id="t-llegar" titulo={t("titulo")} />
          <dl className="mt-10 divide-y divide-linea border-y border-linea">
            <div className="grid gap-1 py-5 sm:grid-cols-[9rem_1fr]">
              <dt className="text-[15px] text-suave">{t("direccion")}</dt>
              <dd>
                <p className="text-[17px]">
                  {config.direccion}, {config.codigo_postal} {config.localidad}
                </p>
                {config.url_mapa ? (
                  <a href={config.url_mapa} target="_blank" rel="noopener noreferrer" className="enlace mt-1 inline-block text-[15px] font-medium">
                    {t("mapa")}
                  </a>
                ) : null}
              </dd>
            </div>
            <div className="grid gap-1 py-5 sm:grid-cols-[9rem_1fr]">
              <dt className="text-[15px] text-suave">{t("aparcamiento")}</dt>
              <dd className="text-[17px]">{tr(config.aparcamiento as Multilingue, locale)}</dd>
            </div>
            <div className="grid gap-3 py-5 sm:grid-cols-[9rem_1fr]">
              <dt className="text-[15px] text-suave">{t("contacto")}</dt>
              <dd className="flex flex-wrap gap-2">
                <a href={`tel:${config.telefono.replace(/\s/g, "")}`} className={enlaceContacto}>
                  <Phone className="size-4 text-suave" strokeWidth={1.75} aria-hidden />
                  {t("llamar")} · <span className="tabular-nums">{config.telefono}</span>
                </a>
                {wa ? (
                  <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className={enlaceContacto}>
                    <MessageCircle className="size-4 text-suave" strokeWidth={1.75} aria-hidden />
                    {t("whatsapp")}
                  </a>
                ) : null}
              </dd>
            </div>
          </dl>
        </div>
        <div className="rounded-3xl bg-superficie p-6 shadow-tarjeta sm:p-8">
          <h3 className="flex items-center gap-2 text-xl font-semibold tracking-[-0.02em]">
            <Clock className="size-5 text-suave" strokeWidth={1.75} aria-hidden />
            {t("horario")}
          </h3>
          <table className="mt-6 w-full text-left text-[15px]">
            <tbody className="divide-y divide-linea">
              {orden.map((d) => {
                const del = turnos.filter((x) => x.dia_semana === d);
                return (
                  <tr key={d}>
                    <th scope="row" className="py-3 pr-4 font-medium">
                      {dias[d]}
                    </th>
                    <td className="py-3 text-right tabular-nums text-suave">
                      {del.length ? del.map((x) => `${t(x.nombre as "comida")} ${x.inicio.slice(0, 5)}–${x.fin.slice(0, 5)}`).join(" · ") : <span className="text-tenue">{t("cerrado")}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export async function SeccionReservar() {
  const t = await getTranslations("web");
  return (
    <section aria-labelledby="t-cierre" className="px-4 pb-28 pt-8 sm:px-6 sm:pb-32">
      <ConBrillo as="div" className="mx-auto max-w-6xl overflow-hidden rounded-[32px] bg-superficie shadow-elevada">
        <div className="relative px-6 py-16 text-center sm:py-24">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(60%_100%_at_50%_0%,var(--w-acento-suave),transparent)]" />
          <h2 id="t-cierre" className="relative text-[clamp(2rem,5vw,3.5rem)] font-semibold leading-[1.02] tracking-[-0.04em]">
            {t("cta.titulo")}
          </h2>
          <p className="relative mx-auto mt-4 max-w-[42ch] text-lg text-suave">{t("cta.texto")}</p>
          <EnlaceBoton href="/reservar" tamano="lg" className="relative mt-10">
            {t("nav.reservar")}
            <ArrowRight className="size-4" strokeWidth={2} aria-hidden />
          </EnlaceBoton>
          <p className="relative mt-8 text-[13px] text-tenue">
            <Link href="/carta" className="enlace">
              {t("carta.verCompleta")}
            </Link>
          </p>
        </div>
      </ConBrillo>
    </section>
  );
}
