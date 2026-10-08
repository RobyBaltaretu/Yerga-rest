"use client";

import { useCallback, useId, useState, useTransition, type RefObject } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { enviarSolicitudGrupo } from "@/app/[locale]/reservar/acciones";
import { Boton } from "@/components/ui/Boton";
import { AreaTexto, Campo, Casilla, Selector } from "@/components/ui/Campo";
import { Turnstile } from "./Turnstile";

const horasGrupo = ["13:00", "13:30", "14:00", "14:30", "15:00", "20:30", "21:00", "21:30", "22:00"];

/** Solicitud para grupos que superan el máximo online: la sala la aprueba a mano. */
export function FormGrupo({
  locale,
  hoy,
  comensales,
  turnstileSiteKey,
  titulo,
  onVolver,
}: {
  locale: string;
  hoy: string;
  comensales: number;
  turnstileSiteKey: string;
  titulo: RefObject<HTMLHeadingElement | null>;
  onVolver: () => void;
}) {
  const t = useTranslations("reserva");
  const uid = useId();
  const [n, setN] = useState(comensales);
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("14:00");
  const [d, setD] = useState({ nombre: "", telefono: "", correo: "", notas: "", acepta_privacidad: false });
  const [token, setToken] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [ok, setOk] = useState(false);
  const [pendiente, startTransition] = useTransition();
  const onToken = useCallback((v: string) => setToken(v), []);

  if (ok) {
    return (
      <section className="rounded-3xl bg-white p-8 text-center ring-1 ring-tinta/10">
        <h2 ref={titulo} tabIndex={-1} className="font-display text-3xl outline-none">{t("grupo.titulo")}</h2>
        <p className="mt-4 text-lg" role="status">{t("grupo.ok")}</p>
        <Link href="/" className="mt-6 inline-block underline underline-offset-4">{t("ok.volver")}</Link>
      </section>
    );
  }

  return (
    <section aria-labelledby={`${uid}-t`}>
      <h2 id={`${uid}-t`} ref={titulo} tabIndex={-1} className="font-display text-3xl outline-none">{t("grupo.titulo")}</h2>
      <p className="mt-2 text-niebla">{t("grupo.texto", { n })}</p>
      <form
        className="mt-6 space-y-5"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            setErrores({});
            const r = await enviarSolicitudGrupo({
              fecha,
              hora,
              comensales: n,
              turnstile: token,
              datos: { ...d, idioma: locale, alergias: "", tronas: 0, silla_ruedas: false, consiente_comercial: false },
            });
            if (r.ok) setOk(true);
            else setErrores(r.errores ?? { form: "form" });
          });
        }}
      >
        <div className="grid gap-5 sm:grid-cols-3">
          <Campo id={`${uid}-n`} etiqueta={t("grupo.personas")} type="number" min={2} max={200} value={n} onChange={(e) => setN(Number(e.target.value))} />
          <Campo id={`${uid}-f`} etiqueta={t("grupo.fecha")} type="date" min={hoy} value={fecha} onChange={(e) => setFecha(e.target.value)} error={errores.fecha && t(`errores.${errores.fecha}`)} />
          <Selector id={`${uid}-h`} etiqueta={t("grupo.hora")} value={hora} onChange={(e) => setHora(e.target.value)}>
            {horasGrupo.map((h) => (
              <option key={h}>{h}</option>
            ))}
          </Selector>
        </div>
        <Campo id={`${uid}-nombre`} etiqueta={t("datos.nombre")} autoComplete="name" value={d.nombre} onChange={(e) => setD({ ...d, nombre: e.target.value })} error={errores.nombre && t(`errores.${errores.nombre}`)} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Campo id={`${uid}-tel`} etiqueta={t("datos.telefono")} type="tel" autoComplete="tel" value={d.telefono} onChange={(e) => setD({ ...d, telefono: e.target.value })} error={errores.telefono && t(`errores.${errores.telefono}`)} />
          <Campo id={`${uid}-c`} etiqueta={t("datos.correo")} type="email" autoComplete="email" value={d.correo} onChange={(e) => setD({ ...d, correo: e.target.value })} error={errores.correo && t(`errores.${errores.correo}`)} />
        </div>
        <AreaTexto id={`${uid}-notas`} etiqueta={t("datos.notas")} value={d.notas} onChange={(e) => setD({ ...d, notas: e.target.value })} />
        <Casilla
          id={`${uid}-p`}
          etiqueta={t.rich("datos.privacidad", { link: (c) => <Link href="/privacidad" target="_blank" className="underline">{c}</Link> })}
          checked={d.acepta_privacidad}
          onChange={(e) => setD({ ...d, acepta_privacidad: e.target.checked })}
          error={errores.acepta_privacidad && t(`errores.${errores.acepta_privacidad}`)}
        />
        <Turnstile siteKey={turnstileSiteKey} onToken={onToken} idioma={locale} />
        {errores.form ? <p className="text-sm font-medium text-pimenton-oscuro" role="alert">{t("errores.form")}</p> : null}
        <div className="flex flex-wrap gap-3">
          <Boton type="submit" cargando={pendiente}>{t("grupo.enviar")}</Boton>
          <Boton type="button" variante="fantasma" onClick={onVolver}>{t("grupo.volverOnline")}</Boton>
        </div>
      </form>
    </section>
  );
}
