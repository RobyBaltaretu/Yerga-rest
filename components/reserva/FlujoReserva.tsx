"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, Timer } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Link } from "@/i18n/navigation";
import {
  apuntarListaEspera,
  cargarHoras,
  confirmar,
  retener,
  type Alternativa,
  type HoraDisponible,
} from "@/app/[locale]/reservar/acciones";
import { fechaLocal, formatFecha, formatHora, formatPrecio } from "@/lib/format";
import { Boton } from "@/components/web/movimiento";
import { AreaTexto, Campo, Casilla, Selector } from "@/components/ui/Campo";
import { Calendario } from "./Calendario";
import { Turnstile } from "./Turnstile";
import { FormGrupo } from "./FormGrupo";
import { ocasiones } from "@/lib/validation/reserva";

export type ArrozOpcion = {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number | null;
  precio_por_persona: boolean;
  min_comensales: number;
};
export type ZonaOpcion = { id: string; nombre: string; slug: string };

type Props = {
  locale: string;
  hoy: string;
  maxDias: number;
  maxOnline: number;
  capacidadMax: number;
  zonas: ZonaOpcion[];
  arroces: ArrozOpcion[];
  telefono: string;
  turnstileSiteKey: string;
  inicial?: { fecha?: string; comensales?: number };
};

type Paso = "inicio" | "hora" | "zona" | "arroz" | "datos" | "ok" | "grupo";
type Retencion = { token: string; caduca_en: string; zona_id: string };
type Encargo = { plato_id: string; raciones: number };

const datosVacios = {
  nombre: "",
  telefono: "",
  correo: "",
  alergias: "",
  consiente_salud: false,
  ocasion: "" as (typeof ocasiones)[number] | "",
  tronas: 0,
  silla_ruedas: false,
  notas: "",
  acepta_privacidad: false,
  consiente_comercial: false,
};

export function FlujoReserva(props: Props) {
  const { locale, zonas, arroces, telefono } = props;
  const t = useTranslations("reserva");
  const uid = useId();

  const [paso, setPaso] = useState<Paso>("inicio");
  const [n, setN] = useState<number | null>(props.inicial?.comensales ?? null);
  const [fecha, setFecha] = useState<string | null>(props.inicial?.fecha ?? null);
  const [horas, setHoras] = useState<HoraDisponible[] | null>(null);
  const [hora, setHora] = useState<HoraDisponible | null>(null);
  const [retencion, setRetencion] = useState<Retencion | null>(null);
  const [encargos, setEncargos] = useState<Encargo[]>([]);
  const [datos, setDatos] = useState(datosVacios);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [fallo, setFallo] = useState<{ motivo: string; alternativas?: Alternativa[] } | null>(null);
  const [resultado, setResultado] = useState<{ codigo: string; inicio: string } | null>(null);
  const [turnstile, setTurnstile] = useState("");
  const [espera, setEspera] = useState<HoraDisponible | null>(null);
  const [pendiente, startTransition] = useTransition();
  const empezo = useRef<number | null>(null);
  const titulo = useRef<HTMLHeadingElement>(null);

  const arrocesPosibles = useMemo(() => arroces.filter((a) => n != null && a.min_comensales <= n), [arroces, n]);
  const zonaNombre = (id?: string | null) => {
    const z = zonas.find((x) => x.id === id);
    return z ? t(`zona.${z.slug === "terraza" ? "terraza" : "sala"}`) : "";
  };

  // Al cambiar de paso, el foco va al título: el lector de pantalla anuncia dónde está.
  // El scroll lo hace el contenedor (con margen para la cabecera fija), para que cada paso
  // empiece arriba con su progreso a la vista y la cabecera no tape nada.
  const contenedor = useRef<HTMLDivElement>(null);
  const primerPaso = useRef(true);
  useEffect(() => {
    titulo.current?.focus({ preventScroll: true });
    if (primerPaso.current) {
      primerPaso.current = false;
      return;
    }
    if ((contenedor.current?.getBoundingClientRect().top ?? 0) < 0 || paso === "ok") {
      contenedor.current?.scrollIntoView({ block: "start" });
    }
  }, [paso]);

  // Abre el paso de horas del día elegido y las carga.
  const abrirDia = (f: string) => {
    setFecha(f);
    setHora(null);
    setHoras(null);
    setFallo(null);
    setPaso("hora");
    startTransition(async () => setHoras(await cargarHoras(f, n!)));
  };

  const elegirComensales = (valor: number) => {
    empezo.current ??= Date.now();
    setN(valor);
    setHora(null);
    if (valor > props.maxOnline || valor > props.capacidadMax) setPaso("grupo");
  };

  const elegirHora = (h: HoraDisponible) =>
    startTransition(async () => {
      setFallo(null);
      const r = await retener({ inicio: h.inicio, comensales: n!, token_anterior: retencion?.token });
      if (!r.ok) {
        setFallo({ motivo: r.motivo, alternativas: r.alternativas });
        setHoras(await cargarHoras(fecha!, n!));
        return;
      }
      setHora(h);
      setRetencion({ token: r.token, caduca_en: r.caduca_en, zona_id: r.zona_id });
      setPaso(h.zonas.length > 1 ? "zona" : arrocesPosibles.length ? "arroz" : "datos");
    });

  const elegirZona = (zonaId: string) =>
    startTransition(async () => {
      if (retencion?.zona_id !== zonaId) {
        const r = await retener({ inicio: hora!.inicio, comensales: n!, zona_id: zonaId, token_anterior: retencion?.token });
        if (!r.ok) {
          setFallo({ motivo: r.motivo, alternativas: r.alternativas });
          setPaso("hora");
          return;
        }
        setRetencion({ token: r.token, caduca_en: r.caduca_en, zona_id: r.zona_id });
      }
      setPaso(arrocesPosibles.length ? "arroz" : "datos");
    });

  const elegirAlternativa = (a: Alternativa) =>
    startTransition(async () => {
      const r = await retener({ inicio: a.inicio, comensales: n!, token_anterior: retencion?.token });
      if (!r.ok) {
        setFallo({ motivo: r.motivo, alternativas: r.alternativas });
        return;
      }
      setFallo(null);
      setFecha(fechaLocal(a.inicio));
      setHora({ inicio: a.inicio, hora: a.hora, turno: a.turno, zonas: [r.zona_id], disponible: true });
      setRetencion({ token: r.token, caduca_en: r.caduca_en, zona_id: r.zona_id });
    });

  const enviar = () =>
    startTransition(async () => {
      setErrores({});
      setFallo(null);
      const r = await confirmar({
        token: retencion?.token ?? null,
        inicio: hora!.inicio,
        comensales: n!,
        zona_id: retencion?.zona_id ?? null,
        arroces: encargos,
        segundos: empezo.current ? Math.round((Date.now() - empezo.current) / 1000) : undefined,
        turnstile,
        datos: { ...datos, idioma: locale },
      });
      if (r.ok) {
        setResultado({ codigo: r.codigo, inicio: r.inicio });
        setPaso("ok");
        return;
      }
      if (r.motivo === "validacion" && r.errores) {
        setErrores(r.errores);
        const primero = Object.keys(r.errores)[0];
        document.getElementById(`${uid}-${primero}`)?.focus();
        return;
      }
      setFallo({ motivo: r.motivo, alternativas: r.alternativas });
    });

  // Pasos numerados: la zona va con la hora (solo aparece si a esa hora hay sitio en las
  // dos), el arroz cuenta si hay arroces en la carta (aunque para pocos comensales se salte)
  // y la confirmación no cuenta. Así el total no cambia a mitad del flujo.
  const pasos: Paso[] = ["inicio", "hora", ...(arroces.length ? (["arroz"] as Paso[]) : []), "datos"];
  const indice = paso === "zona" ? 1 : paso === "ok" ? pasos.length - 1 : Math.max(0, pasos.indexOf(paso));

  return (
    <div ref={contenedor} className="mx-auto w-full max-w-xl scroll-mt-24">
      {paso !== "grupo" ? (
        <div className="mb-6">
          <p className={`text-[13px] font-medium text-suave ${paso === "ok" ? "invisible" : ""}`}>{t("paso", { actual: indice + 1, total: pasos.length })}</p>
          <div className="mt-2 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${pasos.length}, minmax(0, 1fr))` }} aria-hidden>
            {pasos.map((_, i) => (
              <div key={i} className="h-1 overflow-hidden rounded-full bg-linea">
                <motion.div className="h-full rounded-full bg-texto" initial={false} animate={{ scaleX: i <= indice ? 1 : 0 }} style={{ originX: 0 }} />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {paso !== "inicio" && paso !== "ok" && paso !== "grupo" && n && fecha ? (
        <Resumen
          locale={locale}
          n={n}
          fecha={fecha}
          hora={hora?.inicio}
          zona={hora && retencion ? zonaNombre(retencion.zona_id) : undefined}
          caducaEn={paso === "datos" || paso === "arroz" || paso === "zona" ? retencion?.caduca_en : undefined}
          onCambiar={() => setPaso("inicio")}
        />
      ) : null}

      <AnimatePresence initial={false}>
      <motion.div key={paso} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        {paso === "inicio" ? (
          <section aria-labelledby={`${uid}-t`}>
            <h2 id={`${uid}-t`} ref={titulo} tabIndex={-1} className="text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] outline-none">
              {t("comensales.titulo")}
            </h2>
            <div className="mt-4 grid grid-cols-5 gap-2" role="group" aria-label={t("comensales.titulo")}>
              {Array.from({ length: props.maxOnline }, (_, i) => i + 1).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => elegirComensales(v)}
                  aria-pressed={n === v}
                  aria-label={t("comensales.persona", { n: v })}
                  className={`min-h-12 rounded-2xl text-lg font-medium tabular-nums transition-[background-color,box-shadow,color,transform] duration-150 active:scale-[0.96] ${n === v ? "bg-texto text-invertido shadow-tarjeta" : "bg-superficie shadow-tarjeta hover:shadow-elevada"}`}
                >
                  {v}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => elegirComensales(props.maxOnline + 1)}
              className="enlace mt-3 min-h-11 text-[15px] font-medium text-texto"
            >
              {t("comensales.mas", { max: props.maxOnline })}
            </button>
            {n && n > props.capacidadMax && n <= props.maxOnline ? (
              <p className="mt-2 text-sm text-niebla">{t("horas.sinGrupo")}</p>
            ) : null}

            {n && n <= props.capacidadMax ? (
              <div className="mt-8">
                <h3 className="mb-4 text-xl font-semibold tracking-[-0.02em]">{t("calendario.titulo")}</h3>
                <Calendario
                  locale={locale}
                  comensales={n}
                  hoy={props.hoy}
                  maxDias={props.maxDias}
                  seleccion={fecha}
                  onElegir={abrirDia}
                />
              </div>
            ) : null}
          </section>
        ) : null}

        {paso === "hora" && n && fecha ? (
          <section aria-labelledby={`${uid}-t`}>
            <h2 id={`${uid}-t`} ref={titulo} tabIndex={-1} className="text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] outline-none">
              {t("horas.titulo")}
            </h2>
            {fallo ? <Fallo fallo={fallo} telefono={telefono} onAlternativa={(a) => {
              const h = horas?.find((x) => x.inicio === a.inicio);
              if (h) elegirHora(h);
              else elegirAlternativa(a);
            }} /> : null}
            {!horas ? (
              <p className="mt-6 animate-pulse text-niebla">{t("calendario.cargando")}</p>
            ) : horas.length === 0 ? (
              <SinHoras n={n} onOtroDia={() => setPaso("inicio")} />
            ) : (
              <>
                {(["comida", "cena"] as const).map((turno) => {
                  const lista = horas.filter((h) => h.turno === turno);
                  if (!lista.length) return null;
                  return (
                    <div key={turno} className="mt-6">
                      <h3 className="text-[13px] font-medium text-suave">{t(`horas.${turno}`)}</h3>
                      <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4" role="list">
                        {lista.map((h) => (
                          <li key={h.inicio}>
                            {h.disponible ? (
                              <button
                                type="button"
                                onClick={() => elegirHora(h)}
                                disabled={pendiente}
                                className="min-h-12 w-full rounded-2xl bg-superficie text-[17px] font-medium tabular-nums shadow-tarjeta transition-[box-shadow,transform] duration-150 hover:shadow-elevada active:scale-[0.96] disabled:opacity-60"
                              >
                                {h.hora}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setEspera(h)}
                                className="min-h-12 w-full rounded-2xl border border-dashed border-linea-fuerte text-[17px] tabular-nums text-tenue line-through decoration-1 transition-colors hover:text-suave"
                                aria-label={`${h.hora} · ${t("horas.completa")} · ${t("horas.avisame")}`}
                              >
                                {h.hora}
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
                {horas.every((h) => !h.disponible) ? <SinHoras n={n} onOtroDia={() => setPaso("inicio")} /> : null}
                {pendiente ? <p className="mt-4 text-sm text-niebla" role="status">{t("horas.reteniendo")}</p> : null}
                {espera ? (
                  <ListaEspera
                    locale={locale}
                    hora={espera}
                    n={n}
                    fecha={fecha}
                    turnstileSiteKey={props.turnstileSiteKey}
                    onCerrar={() => setEspera(null)}
                  />
                ) : null}
              </>
            )}
            <div className="mt-8">
              <Boton variante="secundario" onClick={() => setPaso("inicio")}>{t("atras")}</Boton>
            </div>
          </section>
        ) : null}

        {paso === "zona" && hora ? (
          <section aria-labelledby={`${uid}-t`}>
            <h2 id={`${uid}-t`} ref={titulo} tabIndex={-1} className="text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] outline-none">
              {t("zona.titulo")}
            </h2>
            <p className="mt-2 text-niebla">{t("zona.ayuda")}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {zonas
                .filter((z) => hora.zonas.includes(z.id))
                .map((z) => (
                  <button
                    key={z.id}
                    type="button"
                    disabled={pendiente}
                    onClick={() => elegirZona(z.id)}
                    aria-pressed={retencion?.zona_id === z.id}
                    className={`min-h-20 rounded-3xl p-5 text-left transition-[box-shadow,transform] duration-150 active:scale-[0.98] ${retencion?.zona_id === z.id ? "bg-superficie shadow-elevada ring-2 ring-texto" : "bg-superficie shadow-tarjeta hover:shadow-elevada"}`}
                  >
                    <span className="text-xl font-semibold tracking-[-0.02em]">{zonaNombre(z.id)}</span>
                  </button>
                ))}
            </div>
            <div className="mt-8">
              <Boton variante="secundario" onClick={() => setPaso("hora")}>{t("atras")}</Boton>
            </div>
          </section>
        ) : null}

        {paso === "arroz" && n ? (
          <section aria-labelledby={`${uid}-t`}>
            <h2 id={`${uid}-t`} ref={titulo} tabIndex={-1} className="text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] outline-none">
              {t("arroz.titulo")}
            </h2>
            <p className="mt-2 text-niebla">{t("arroz.ayuda")}</p>
            <ElegirArroz locale={locale} n={n} arroces={arrocesPosibles} encargos={encargos} onCambiar={setEncargos} />
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Boton onClick={() => setPaso("datos")}>{t("continuar")}</Boton>
              <Boton
                variante="fantasma"
                onClick={() => {
                  setEncargos([]);
                  setPaso("datos");
                }}
              >
                {t("arroz.saltar")}
              </Boton>
            </div>
            <div className="mt-4">
              <Boton variante="secundario" onClick={() => setPaso(hora && hora.zonas.length > 1 ? "zona" : "hora")}>{t("atras")}</Boton>
            </div>
          </section>
        ) : null}

        {paso === "datos" && hora && n ? (
          <section aria-labelledby={`${uid}-t`}>
            <h2 id={`${uid}-t`} ref={titulo} tabIndex={-1} className="text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] outline-none">
              {t("datos.titulo")}
            </h2>
            {fallo ? <Fallo fallo={fallo} telefono={telefono} onAlternativa={elegirAlternativa} /> : null}
            <form
              className="mt-6 space-y-5"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                enviar();
              }}
            >
              <Campo id={`${uid}-nombre`} etiqueta={t("datos.nombre")} autoComplete="name" required value={datos.nombre} onChange={(e) => setDatos({ ...datos, nombre: e.target.value })} error={errores.nombre && t(`errores.${errores.nombre}`)} />
              <div className="grid gap-5 sm:grid-cols-2">
                <Campo id={`${uid}-telefono`} etiqueta={t("datos.telefono")} type="tel" autoComplete="tel" inputMode="tel" required value={datos.telefono} onChange={(e) => setDatos({ ...datos, telefono: e.target.value })} error={errores.telefono && t(`errores.${errores.telefono}`)} />
                <Campo id={`${uid}-correo`} etiqueta={t("datos.correo")} type="email" autoComplete="email" inputMode="email" required value={datos.correo} onChange={(e) => setDatos({ ...datos, correo: e.target.value })} error={errores.correo && t(`errores.${errores.correo}`)} />
              </div>
              <AreaTexto id={`${uid}-alergias`} etiqueta={t("datos.alergias")} ayuda={t("datos.alergiasAyuda")} value={datos.alergias} onChange={(e) => setDatos({ ...datos, alergias: e.target.value })} />
              {datos.alergias.trim() ? (
                <Casilla id={`${uid}-consiente_salud`} etiqueta={t("datos.salud")} checked={datos.consiente_salud} onChange={(e) => setDatos({ ...datos, consiente_salud: e.target.checked })} error={errores.consiente_salud && t(`errores.${errores.consiente_salud}`)} />
              ) : null}
              <div className="grid gap-5 sm:grid-cols-2">
                <Selector id={`${uid}-ocasion`} etiqueta={t("datos.ocasion")} value={datos.ocasion} onChange={(e) => setDatos({ ...datos, ocasion: e.target.value as typeof datos.ocasion })}>
                  {(["", ...ocasiones] as const).map((o) => (
                    <option key={o} value={o}>{t(`datos.ocasiones.${o}`)}</option>
                  ))}
                </Selector>
                <Selector id={`${uid}-tronas`} etiqueta={t("datos.tronas")} value={datos.tronas} onChange={(e) => setDatos({ ...datos, tronas: Number(e.target.value) })}>
                  {[0, 1, 2, 3].map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </Selector>
              </div>
              <Casilla id={`${uid}-silla`} etiqueta={t("datos.sillaRuedas")} checked={datos.silla_ruedas} onChange={(e) => setDatos({ ...datos, silla_ruedas: e.target.checked })} />
              <AreaTexto id={`${uid}-notas`} etiqueta={t("datos.notas")} value={datos.notas} onChange={(e) => setDatos({ ...datos, notas: e.target.value })} />
              <Casilla
                id={`${uid}-acepta_privacidad`}
                etiqueta={t.rich("datos.privacidad", {
                  link: (chunks) => (
                    <Link href="/privacidad" target="_blank" className="font-semibold underline">{chunks}</Link>
                  ),
                })}
                checked={datos.acepta_privacidad}
                onChange={(e) => setDatos({ ...datos, acepta_privacidad: e.target.checked })}
                error={errores.acepta_privacidad && t(`errores.${errores.acepta_privacidad}`)}
              />
              <Casilla id={`${uid}-comercial`} etiqueta={t("datos.comercial")} checked={datos.consiente_comercial} onChange={(e) => setDatos({ ...datos, consiente_comercial: e.target.checked })} />
              <Turnstile siteKey={props.turnstileSiteKey} onToken={setTurnstile} idioma={locale} />
              {Object.keys(errores).length && !errores.nombre && !errores.telefono && !errores.correo && !errores.acepta_privacidad && !errores.consiente_salud ? (
                <p className="text-[14px] font-medium text-peligro" role="alert">{t("errores.form")}</p>
              ) : null}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Boton type="submit" cargando={pendiente} className="w-full sm:w-auto">
                  {pendiente ? t("datos.enviando") : t("datos.reservar")}
                </Boton>
                <Boton type="button" variante="secundario" onClick={() => setPaso(arrocesPosibles.length ? "arroz" : hora.zonas.length > 1 ? "zona" : "hora")}>
                  {t("atras")}
                </Boton>
              </div>
            </form>
          </section>
        ) : null}

        {paso === "ok" && resultado && n ? (
          <section aria-labelledby={`${uid}-t`} className="rounded-[28px] bg-superficie p-6 text-center shadow-elevada sm:p-10">
            <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mx-auto grid size-14 place-items-center rounded-full bg-huerta-claro text-exito" aria-hidden>
              <Check className="size-6" strokeWidth={2.25} />
            </motion.div>
            <h2 id={`${uid}-t`} ref={titulo} tabIndex={-1} className="mt-4 text-[2rem] font-semibold leading-tight tracking-[-0.03em] outline-none">
              {t("ok.titulo")}
            </h2>
            <p className="mt-3 text-lg">
              {t("ok.texto", { fecha: formatFecha(resultado.inicio, locale), hora: formatHora(resultado.inicio) })}
            </p>
            <p className="mt-1 text-suave">{t("resumen.comensales", { n })}{retencion ? ` · ${zonaNombre(retencion.zona_id)}` : ""}</p>
            <p className="mt-4 text-sm text-niebla">{t("ok.correo", { correo: datos.correo })}</p>
            <div className="mt-6 flex flex-col items-center gap-3">
              <a
                href={`/api/reserva/ics?codigo=${encodeURIComponent(resultado.codigo)}`}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-texto px-5 font-medium text-invertido shadow-tarjeta transition-colors hover:bg-texto/88 active:scale-[0.98]"
              >
                {t("ok.calendario")}
              </a>
              <Link href={`/reservar/gestion/${resultado.codigo}`} className="enlace min-h-11 py-2 font-medium">
                {t("ok.gestionar")}
              </Link>
              <Link href="/" className="enlace text-[14px] text-suave">{t("ok.volver")}</Link>
            </div>
          </section>
        ) : null}

        {paso === "grupo" ? (
          <FormGrupo
            locale={locale}
            hoy={props.hoy}
            comensales={Math.max(n ?? 0, props.maxOnline + 1)}
            turnstileSiteKey={props.turnstileSiteKey}
            titulo={titulo}
            onVolver={() => {
              setN(null);
              setPaso("inicio");
            }}
          />
        ) : null}
      </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Resumen({
  locale,
  n,
  fecha,
  hora,
  zona,
  caducaEn,
  onCambiar,
}: {
  locale: string;
  n: number;
  fecha: string;
  hora?: string;
  zona?: string;
  caducaEn?: string;
  onCambiar: () => void;
}) {
  const t = useTranslations("reserva");
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-linea bg-sutil px-4 py-2.5 text-[14px]">
      <p className="font-medium">
        {t("resumen.comensales", { n })} · {formatFecha(hora ?? `${fecha}T12:00:00Z`, locale)}
        {hora ? ` · ${formatHora(hora)}` : ""}
        {zona ? ` · ${zona}` : ""}
      </p>
      <div className="flex items-center gap-3">
        {caducaEn ? <CuentaAtras hasta={caducaEn} /> : null}
        <button type="button" onClick={onCambiar} className="enlace min-h-11 font-medium">
          {t("pasos.comensales")}
        </button>
      </div>
    </div>
  );
}

function CuentaAtras({ hasta }: { hasta: string }) {
  const t = useTranslations("reserva");
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const resto = Math.max(0, Math.floor((Date.parse(hasta) - ahora) / 1000));
  const tiempo = t("cuentaAtras", { min: Math.floor(resto / 60), seg: String(resto % 60).padStart(2, "0") });
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium tabular-nums ${resto > 60 ? "bg-superficie shadow-tarjeta" : "bg-peligro text-invertido"}`} title={resto ? t("datos.retenida", { tiempo }) : t("datos.caducada")}>
      <span className="sr-only">{resto ? t("datos.retenida", { tiempo }) : t("datos.caducada")}</span>
      <span aria-hidden className="inline-flex items-center gap-1"><Timer className="size-3.5" strokeWidth={2} />{tiempo}</span>
    </span>
  );
}

function SinHoras({ n, onOtroDia }: { n: number; onOtroDia: () => void }) {
  const t = useTranslations("reserva.horas");
  return (
    <div className="mt-6 rounded-3xl bg-superficie p-5 shadow-tarjeta">
      <p>{t("ninguna", { n })}</p>
      <Boton variante="secundario" className="mt-3" onClick={onOtroDia}>{t("otroDia")}</Boton>
    </div>
  );
}

function Fallo({
  fallo,
  telefono,
  onAlternativa,
}: {
  fallo: { motivo: string; alternativas?: Alternativa[] };
  telefono: string;
  onAlternativa: (a: Alternativa) => void;
}) {
  const t = useTranslations("reserva.fallo");
  const ocupada = fallo.motivo === "ocupada" || fallo.motivo === "no_disponible";
  return (
    <div className="mt-4 rounded-2xl border border-peligro/25 bg-peligro/[0.06] p-4" role="alert">
      <p className="font-medium text-peligro">
        {ocupada ? t("ocupada") : fallo.motivo === "limite" ? t("limite") : fallo.motivo === "turnstile" ? t("turnstile") : t("general", { telefono })}
      </p>
      {fallo.alternativas?.length ? (
        <>
          <p className="mt-2 text-sm">{t("alternativas")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {fallo.alternativas.map((a) => (
              <button key={a.inicio} type="button" onClick={() => onAlternativa(a)} className="min-h-11 rounded-full bg-superficie px-4 font-medium tabular-nums shadow-tarjeta transition-shadow hover:shadow-elevada">
                {a.hora}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function ElegirArroz({
  locale,
  n,
  arroces,
  encargos,
  onCambiar,
}: {
  locale: string;
  n: number;
  arroces: ArrozOpcion[];
  encargos: Encargo[];
  onCambiar: (e: Encargo[]) => void;
}) {
  const t = useTranslations("reserva.arroz");
  const usadas = encargos.reduce((s, e) => s + e.raciones, 0);
  const restantes = n - usadas;

  return (
    <ul className="mt-6 space-y-3" role="list">
      {arroces.map((a) => {
        const encargo = encargos.find((e) => e.plato_id === a.id);
        const maximo = (encargo?.raciones ?? 0) + restantes;
        const puede = encargo || restantes >= a.min_comensales;
        return (
          <li key={a.id} className={`rounded-3xl bg-superficie p-4 transition-shadow sm:p-5 ${encargo ? "shadow-elevada ring-2 ring-texto" : "shadow-tarjeta"}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[17px] font-semibold tracking-[-0.015em]">{a.nombre}</p>
                <p className="mt-1 text-[14px] leading-relaxed text-suave">{a.descripcion}</p>
                <p className="mt-1.5 text-[13px] text-tenue">
                  {t("minimo", { n: a.min_comensales })}
                  {a.precio != null ? ` · ${a.precio_por_persona ? t("porPersona", { precio: formatPrecio(a.precio, locale) }) : formatPrecio(a.precio, locale)}` : ""}
                </p>
              </div>
              {encargo ? (
                <button type="button" onClick={() => onCambiar(encargos.filter((e) => e.plato_id !== a.id))} className="enlace min-h-11 shrink-0 rounded-full px-3 text-[14px] font-medium">
                  {t("quitar")}
                </button>
              ) : (
                <Boton
                  variante="secundario"
                  disabled={!puede}
                  className="shrink-0"
                  onClick={() => onCambiar([...encargos, { plato_id: a.id, raciones: Math.max(a.min_comensales, restantes) }])}
                  aria-label={`${t("elegir")} ${a.nombre}`}
                >
                  {t("elegir")}
                </Boton>
              )}
            </div>
            {encargo ? (
              <div className="mt-3 flex items-center gap-3">
                <span className="text-sm font-semibold">{t("raciones")}</span>
                <button type="button" aria-label="−" disabled={encargo.raciones <= a.min_comensales} onClick={() => onCambiar(encargos.map((e) => (e.plato_id === a.id ? { ...e, raciones: e.raciones - 1 } : e)))} className="grid size-11 place-items-center rounded-full bg-sutil text-xl transition-[background-color,transform] hover:bg-linea-fuerte active:scale-[0.92] disabled:opacity-40">−</button>
                <span className="w-8 text-center text-lg font-semibold tabular-nums" aria-live="polite">{encargo.raciones}</span>
                <button type="button" aria-label="+" disabled={encargo.raciones >= maximo} onClick={() => onCambiar(encargos.map((e) => (e.plato_id === a.id ? { ...e, raciones: e.raciones + 1 } : e)))} className="grid size-11 place-items-center rounded-full bg-sutil text-xl transition-[background-color,transform] hover:bg-linea-fuerte active:scale-[0.92] disabled:opacity-40">+</button>
              </div>
            ) : null}
          </li>
        );
      })}
      {restantes <= 0 && encargos.length ? <li className="text-sm text-niebla">{t("max")}</li> : null}
    </ul>
  );
}

function ListaEspera({
  locale,
  hora,
  n,
  fecha,
  turnstileSiteKey,
  onCerrar,
}: {
  locale: string;
  hora: HoraDisponible;
  n: number;
  fecha: string;
  turnstileSiteKey: string;
  onCerrar: () => void;
}) {
  const t = useTranslations("reserva");
  const uid = useId();
  const [d, setD] = useState({ nombre: "", telefono: "", correo: "", acepta_privacidad: false });
  const [token, setToken] = useState("");
  const [estado, setEstado] = useState<"form" | "ok">("form");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [pendiente, startTransition] = useTransition();
  const onToken = useCallback((v: string) => setToken(v), []);

  return (
    <div className="mt-6 rounded-3xl bg-superficie p-5 shadow-elevada" role="dialog" aria-labelledby={`${uid}-t`}>
      <h3 id={`${uid}-t`} className="text-[17px] font-semibold tracking-[-0.015em]">{t("espera.titulo")}</h3>
      {estado === "ok" ? (
        <p className="mt-2" role="status">{t("espera.ok")}</p>
      ) : (
        <form
          className="mt-3 space-y-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const r = await apuntarListaEspera({ ...d, fecha, turno: hora.turno, hora: hora.hora, comensales: n, idioma: locale, turnstile: token });
              if (r.ok) setEstado("ok");
              else setErrores(r.errores ?? { form: "form" });
            });
          }}
        >
          <p className="text-sm text-niebla">{t("espera.texto", { n, fecha: formatFecha(`${fecha}T12:00:00Z`, locale), turno: t(`horas.${hora.turno as "comida" | "cena"}`) })}</p>
          <Campo id={`${uid}-n`} etiqueta={t("datos.nombre")} value={d.nombre} onChange={(e) => setD({ ...d, nombre: e.target.value })} error={errores.nombre && t(`errores.${errores.nombre}`)} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo id={`${uid}-tel`} type="tel" etiqueta={t("datos.telefono")} value={d.telefono} onChange={(e) => setD({ ...d, telefono: e.target.value })} error={errores.telefono && t(`errores.${errores.telefono}`)} />
            <Campo id={`${uid}-c`} type="email" etiqueta={t("datos.correo")} value={d.correo} onChange={(e) => setD({ ...d, correo: e.target.value })} error={errores.correo && t(`errores.${errores.correo}`)} />
          </div>
          <Casilla
            id={`${uid}-p`}
            etiqueta={t.rich("datos.privacidad", { link: (c) => <Link href="/privacidad" target="_blank" className="underline">{c}</Link> })}
            checked={d.acepta_privacidad}
            onChange={(e) => setD({ ...d, acepta_privacidad: e.target.checked })}
            error={errores.acepta_privacidad && t(`errores.${errores.acepta_privacidad}`)}
          />
          <Turnstile siteKey={turnstileSiteKey} onToken={onToken} idioma={locale} />
          <div className="flex gap-3">
            <Boton type="submit" cargando={pendiente}>{t("espera.enviar")}</Boton>
            <Boton type="button" variante="fantasma" onClick={onCerrar}>{t("espera.cerrar")}</Boton>
          </div>
        </form>
      )}
    </div>
  );
}
