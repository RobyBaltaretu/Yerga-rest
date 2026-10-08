import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { tr } from "@/lib/i18n";
import { formatPrecio } from "@/lib/format";
import type { Multilingue, Plato } from "@/lib/datos-publicos";
import { Aparecer } from "./Aparecer";
import { CarruselArroces } from "./CarruselArroces";
import { MapaProducto } from "./MapaProducto";
import { Parallax } from "./Parallax";
import { Termino } from "./Termino";

type Turno = { nombre: string; dia_semana: number; inicio: string; fin: string; ultima_hora: string };

export async function SeccionArroces({ locale, platos }: { locale: string; platos: Plato[] }) {
  const t = await getTranslations("web");
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
    <section id="arroces" aria-labelledby="t-arroces" className="scroll-mt-20 py-20">
      <div className="mx-auto max-w-6xl px-4">
        <h2 id="t-arroces" className="font-display text-4xl sm:text-5xl">{t("arroces.titulo")}</h2>
        <p className="mt-3 max-w-2xl text-lg text-niebla">{t("arroces.intro")}</p>
      </div>
      <div className="mt-10">
        <CarruselArroces
          arroces={arroces}
          textos={{
            ingredientes: t("arroces.ingredientes"),
            alergenos: t("arroces.alergenos"),
            sinAlergenos: t("arroces.sinAlergenos"),
            reservarCon: t("arroces.reservarCon"),
            verMas: t.raw("arroces.verMas") as string,
            anterior: "‹",
            siguiente: "›",
          }}
        />
      </div>
    </section>
  );
}

export async function SeccionEntrantes({ locale, platos }: { locale: string; platos: Plato[] }) {
  const t = await getTranslations("web");
  const entrantes = platos.filter((p) => p.categoria === "entrante");
  return (
    <section aria-labelledby="t-entrantes" className="bg-arroz-2/60 py-20">
      <div className="mx-auto max-w-6xl px-4">
        <h2 id="t-entrantes" className="font-display text-4xl sm:text-5xl">{t("entrantes.titulo")}</h2>
        <p className="mt-3 text-lg text-niebla">{t("entrantes.intro")}</p>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entrantes.map((p, i) => {
            const nombreVa = tr(p.nombre as Multilingue, "va");
            const nombre = tr(p.nombre as Multilingue, locale);
            return (
              <Aparecer as="li" key={p.id} retraso={i * 90} className="rounded-3xl bg-white p-6 ring-1 ring-tinta/10">
                <p className="font-display text-2xl">
                  {locale === "va" || nombreVa === nombre ? nombre : <Termino va={nombreVa} traduccion={nombre} />}
                </p>
                <p className="mt-2 text-niebla">{tr(p.descripcion as Multilingue, locale)}</p>
                <p className="mt-3 text-sm font-semibold">
                  {formatPrecio(p.precio, locale)}
                  {p.temporada ? <span className="ml-2 font-normal text-niebla">· {t("carta.temporada", { t: p.temporada })}</span> : null}
                </p>
              </Aparecer>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export async function SeccionProducto({ texto }: { texto: string }) {
  const t = await getTranslations("web.producto");
  return (
    <section id="producto" aria-labelledby="t-producto" className="scroll-mt-20 py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <h2 id="t-producto" className="font-display text-4xl sm:text-5xl">{t("titulo")}</h2>
          <p className="mt-4 text-lg leading-relaxed">{texto}</p>
          <ul className="mt-6 grid grid-cols-2 gap-3 text-sm font-semibold">
            {[t("arroz"), t("huerta"), t("lonja"), t("lena")].map((x) => (
              <li key={x} className="rounded-2xl bg-white px-3 py-2 ring-1 ring-tinta/10">{x}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl bg-[#f3ead8] p-4 ring-1 ring-tinta/10">
          <MapaProducto
            textos={{ albufera: t("albufera"), horta: t("horta"), mar: t("mar"), valencia: t("valencia"), arroz: t("arroz"), huerta: t("huerta"), lonja: t("lonja"), lena: t("lena") }}
          />
        </div>
      </div>
    </section>
  );
}

export async function SeccionCasa({ historia, equipo }: { historia: string; equipo: string }) {
  const t = await getTranslations("web.casa");
  const paneles = [
    { titulo: t("historia"), texto: historia, fondo: "from-[#3a1d0f] via-[#7a4515] to-[#e3a13a]" },
    { titulo: t("equipo"), texto: equipo, fondo: "from-[#1b110c] via-[#5a2c10] to-[#b23f1d]" },
    { titulo: t("sala"), texto: t("salaTexto"), fondo: "from-[#2f3d1d] via-[#4f6a2c] to-[#dfe8cf]" },
  ];
  return (
    <section id="casa" aria-labelledby="t-casa" className="scroll-mt-20 overflow-hidden bg-brasa py-20 text-arroz">
      <div className="mx-auto max-w-6xl px-4">
        <h2 id="t-casa" className="font-display text-4xl sm:text-5xl">{t("titulo")}</h2>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {paneles.map((p, i) => (
            <Aparecer key={p.titulo} retraso={i * 120}>
              <div className="relative h-64 overflow-hidden rounded-3xl">
                {/* Ilustración provisional hasta tener la sesión de fotos. */}
                <Parallax factor={0.12} className="absolute -inset-y-12 inset-x-0">
                  <div className={`h-full w-full bg-gradient-to-br ${p.fondo}`} />
                  <svg viewBox="0 0 200 120" className="absolute inset-x-0 bottom-10 mx-auto w-3/4 opacity-40" aria-hidden>
                    <ellipse cx="100" cy="90" rx="80" ry="18" fill="#000" opacity="0.3" />
                    <circle cx="100" cy="60" r="44" fill="none" stroke="#f7efe1" strokeWidth="3" />
                    <circle cx="100" cy="60" r="34" fill="#f7efe1" opacity="0.25" />
                  </svg>
                </Parallax>
              </div>
              <h3 className="mt-4 font-display text-2xl text-azafran">{p.titulo}</h3>
              <p className="mt-2 text-arroz/85">{p.texto}</p>
            </Aparecer>
          ))}
        </div>
      </div>
    </section>
  );
}

export async function SeccionCartaResumen({ locale, platos, ejemplo }: { locale: string; platos: Plato[]; ejemplo: boolean }) {
  const t = await getTranslations("web.carta");
  const destacados = platos.filter((p) => p.destacado || p.categoria === "postre").slice(0, 6);
  return (
    <section aria-labelledby="t-carta" className="py-20">
      <div className="mx-auto max-w-4xl px-4 text-center">
        <h2 id="t-carta" className="font-display text-4xl sm:text-5xl">{t("titulo")}</h2>
        <p className="mt-3 text-niebla">{t("intro")}</p>
        {ejemplo ? <p className="mt-2 text-sm font-semibold text-pimenton-oscuro">{t("avisoEjemplo")}</p> : null}
        <ul className="mx-auto mt-8 max-w-xl divide-y divide-tinta/10 text-left">
          {destacados.map((p) => (
            <li key={p.id} className="flex items-baseline justify-between gap-4 py-3">
              <span className="font-display text-xl">{tr(p.nombre as Multilingue, locale)}</span>
              <span className="tabular-nums">{formatPrecio(p.precio, locale)}</span>
            </li>
          ))}
        </ul>
        <Link href="/carta" className="mt-8 inline-flex min-h-12 items-center rounded-full bg-tinta px-6 font-semibold text-arroz">{t("verCompleta")}</Link>
      </div>
    </section>
  );
}

export async function SeccionOpiniones({ resenas }: { resenas: { id: string; autor: string; texto: string; puntuacion: number | null; origen: string; url: string | null }[] }) {
  const t = await getTranslations("web.opiniones");
  if (!resenas.length) return null;
  return (
    <section aria-labelledby="t-opiniones" className="bg-arroz-2/60 py-20">
      <div className="mx-auto max-w-6xl px-4">
        <h2 id="t-opiniones" className="font-display text-4xl sm:text-5xl">{t("titulo")}</h2>
        <ul className="mt-10 grid gap-6 md:grid-cols-3">
          {resenas.map((r) => (
            <li key={r.id} className="rounded-3xl bg-white p-6 ring-1 ring-tinta/10">
              {r.puntuacion ? <p className="text-azafran-oscuro" aria-label={`${r.puntuacion}/5`}>{"★".repeat(r.puntuacion)}</p> : null}
              <blockquote className="mt-2 font-display text-xl leading-snug">“{r.texto}”</blockquote>
              <p className="mt-4 text-sm text-niebla">
                {r.autor} · {r.url ? <a href={r.url} target="_blank" rel="noopener noreferrer" className="underline">{t("ver", { origen: r.origen })}</a> : r.origen}
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
  return (
    <section id="llegar" aria-labelledby="t-llegar" className="scroll-mt-20 py-20">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-2">
        <div>
          <h2 id="t-llegar" className="font-display text-4xl sm:text-5xl">{t("titulo")}</h2>
          <dl className="mt-8 space-y-6">
            <div>
              <dt className="text-sm font-semibold uppercase tracking-widest text-niebla">{t("direccion")}</dt>
              <dd className="mt-1 text-lg">{config.direccion}, {config.codigo_postal} {config.localidad}</dd>
              {config.url_mapa ? <dd><a href={config.url_mapa} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-4">{t("mapa")}</a></dd> : null}
            </div>
            <div>
              <dt className="text-sm font-semibold uppercase tracking-widest text-niebla">{t("aparcamiento")}</dt>
              <dd className="mt-1">{tr(config.aparcamiento as Multilingue, locale)}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold uppercase tracking-widest text-niebla">{t("contacto")}</dt>
              <dd className="mt-2 flex flex-wrap gap-3">
                <a href={`tel:${config.telefono.replace(/\s/g, "")}`} className="inline-flex min-h-11 items-center rounded-full bg-white px-5 font-semibold ring-1 ring-tinta/15">{t("llamar")} · {config.telefono}</a>
                {wa ? <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-full bg-huerta px-5 font-semibold text-white">{t("whatsapp")}</a> : null}
              </dd>
            </div>
          </dl>
        </div>
        <div className="rounded-3xl bg-white p-6 ring-1 ring-tinta/10">
          <h3 className="font-display text-2xl">{t("horario")}</h3>
          <table className="mt-4 w-full text-left">
            <tbody className="divide-y divide-tinta/10">
              {orden.map((d) => {
                const del = turnos.filter((x) => x.dia_semana === d);
                return (
                  <tr key={d}>
                    <th scope="row" className="py-2 pr-4 font-semibold">{dias[d]}</th>
                    <td className="py-2 tabular-nums">
                      {del.length ? del.map((x) => `${t(x.nombre as "comida")} ${x.inicio.slice(0, 5)}–${x.fin.slice(0, 5)}`).join(" · ") : <span className="text-niebla">{t("cerrado")}</span>}
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
    <section className="bg-pimenton py-20 text-center text-white">
      <div className="mx-auto max-w-3xl px-4">
        <h2 className="font-display text-4xl sm:text-5xl">{t("cta.titulo")}</h2>
        <p className="mt-3 text-lg text-white/90">{t("cta.texto")}</p>
        <Link href="/reservar" className="mt-8 inline-flex min-h-12 items-center rounded-full bg-arroz px-8 text-lg font-semibold text-tinta hover:bg-white">{t("nav.reservar")}</Link>
      </div>
    </section>
  );
}
