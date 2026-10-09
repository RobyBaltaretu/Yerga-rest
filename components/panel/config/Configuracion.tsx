"use client";

import { useState, useTransition } from "react";
import { borrarBloqueo, borrarTurno, crearBloqueo, guardarConfiguracion, guardarPlantilla, guardarTurno } from "@/app/panel/config-acciones";
import { Boton } from "@/components/ui/Boton";
import type { Tables } from "@/lib/supabase/types";
import { useRecargar } from "@/components/panel/DatosPanel";

type Config = Tables<"configuracion">;
type Turno = Tables<"turno">;
type Plantilla = Tables<"plantilla_mensaje">;
type Bloqueo = { id: string; desde: string; hasta: string; turno_nombre: string | null; zona_id: string | null; mesa_id: string | null; motivo: string };

const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const ordenDias = [1, 2, 3, 4, 5, 6, 0];

const reglas: { k: keyof Config; etiqueta: string; unidad: string; ayuda: string }[] = [
  { k: "intervalo_min", etiqueta: "Intervalo entre horas ofrecidas", unidad: "min", ayuda: "Reparte las llegadas y evita picos en cocina." },
  { k: "duracion_hasta_4", etiqueta: "Duración de la estancia (hasta el umbral)", unidad: "min", ayuda: "Bloquea la mesa durante ese tiempo." },
  { k: "duracion_desde_5", etiqueta: "Duración de la estancia (desde el umbral)", unidad: "min", ayuda: "" },
  { k: "umbral_duracion_larga", etiqueta: "Umbral de estancia larga", unidad: "personas", ayuda: "A partir de cuántas personas se usa la duración larga." },
  { k: "margen_min", etiqueta: "Margen entre reservas de una mesa", unidad: "min", ayuda: "Tiempo para recoger y montar." },
  { k: "antelacion_min_min", etiqueta: "Antelación mínima", unidad: "min", ayuda: "Evita reservas imposibles de preparar." },
  { k: "antelacion_max_dias", etiqueta: "Antelación máxima", unidad: "días", ayuda: "" },
  { k: "max_comensales_online", etiqueta: "Tamaño máximo online", unidad: "personas", ayuda: "Por encima, solicitud de grupo que confirma el restaurante." },
  { k: "retencion_min", etiqueta: "Retención de mesa mientras el cliente escribe", unidad: "min", ayuda: "" },
  { k: "espera_plazo_min", etiqueta: "Plazo para aceptar una mesa de la lista de espera", unidad: "min", ayuda: "La mesa queda guardada; después pasa al siguiente." },
  { k: "cortesia_min", etiqueta: "Cortesía antes de proponer liberar", unidad: "min", ayuda: "" },
  { k: "cancelacion_libre_horas", etiqueta: "Cancelación libre hasta", unidad: "horas antes", ayuda: "Después, por teléfono." },
  { k: "recordatorio_horas", etiqueta: "Recordatorio", unidad: "horas antes", ayuda: "" },
  { k: "sin_confirmar_horas", etiqueta: "Marcar «sin confirmar» si no responde", unidad: "horas antes", ayuda: "" },
  { k: "aviso_conflicto_min", etiqueta: "Aviso de mesa que se alarga", unidad: "min antes", ayuda: "" },
];

const datosLocal: { k: keyof Config; etiqueta: string }[] = [
  { k: "nombre_local", etiqueta: "Nombre" },
  { k: "direccion", etiqueta: "Dirección" },
  { k: "codigo_postal", etiqueta: "Código postal" },
  { k: "localidad", etiqueta: "Localidad" },
  { k: "telefono", etiqueta: "Teléfono" },
  { k: "whatsapp", etiqueta: "WhatsApp" },
  { k: "correo", etiqueta: "Correo" },
  { k: "url_mapa", etiqueta: "Enlace al mapa" },
  { k: "url_resenas", etiqueta: "Enlace para dejar reseña (Google)" },
];

const tiposPlantilla: Record<string, string> = {
  confirmacion: "Confirmación",
  recordatorio: "Recordatorio",
  agradecimiento: "Agradecimiento",
  cancelacion: "Cancelación",
  modificacion: "Modificación",
  lista_espera: "Lista de espera",
  solicitud_grupo: "Solicitud de grupo",
};

export function Configuracion({ esAdmin, config, turnos, bloqueos, plantillas, zonas, mesas, hoy }: { esAdmin: boolean; config: Config; turnos: Turno[]; bloqueos: Bloqueo[]; plantillas: Plantilla[]; zonas: { id: string; nombre: string }[]; mesas: { id: string; nombre: string }[]; hoy: string }) {
  const recargar = useRecargar();
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendiente, startTransition] = useTransition();
  const [c, setC] = useState(config);
  const [bloqueo, setBloqueo] = useState({ desde: hoy, hasta: hoy, turno_nombre: "", zona_id: "", mesa_id: "", motivo: "" });
  const [plantilla, setPlantilla] = useState({ tipo: "confirmacion", idioma: "es" });
  const actual = plantillas.find((p) => p.tipo === plantilla.tipo && p.idioma === plantilla.idioma);
  const [textoPlantilla, setTextoPlantilla] = useState<{ asunto: string; cuerpo: string } | null>(null);

  const hacer = (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) =>
    startTransition(async () => {
      const r = await fn();
      setMsg({ ok: r.ok, texto: r.ok ? ok : (r.error ?? "No se ha podido guardar") });
      recargar();
    });

  const campo = "mt-1 block w-full rounded-xl border-0 bg-arroz px-3 py-2 ring-1 ring-tinta/15";
  const nav = [["reglas", "Reglas"], ["local", "Datos del local"], ...(esAdmin ? [["legal", "Datos legales"]] : []), ["turnos", "Horarios"], ["bloqueos", "Bloqueos"], ["plantillas", "Mensajes"]];

  return (
    <div className="px-4 py-6 sm:px-6">
      <nav aria-label="Secciones" className="sticky top-14 z-10 -mx-4 mb-6 flex gap-2 overflow-x-auto bg-arroz/95 px-4 py-2 backdrop-blur lg:top-0">
        {nav.map(([id, t]) => <a key={id} href={`#${id}`} className="min-h-10 shrink-0 rounded-full bg-white px-4 py-2 text-sm font-semibold ring-1 ring-tinta/15">{t}</a>)}
      </nav>
      {msg ? <p className={`mb-4 rounded-xl px-3 py-2 text-sm font-semibold ${msg.ok ? "bg-huerta-claro text-huerta" : "bg-pimenton/15 text-pimenton-oscuro"}`} role="status">{msg.texto}</p> : null}

      <section id="reglas" aria-labelledby="t-reglas" className="scroll-mt-24">
        <h2 id="t-reglas" className="font-display text-2xl">Reglas de disponibilidad</h2>
        <form className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" onSubmit={(e) => { e.preventDefault(); hacer(() => guardarConfiguracion(Object.fromEntries(reglas.map((r) => [r.k, Number(c[r.k])]))), "Reglas guardadas: la web ya las aplica"); }}>
          {reglas.map((r) => (
            <label key={r.k} className="rounded-2xl bg-white p-3 text-sm font-semibold ring-1 ring-tinta/10">
              {r.etiqueta}
              <span className="mt-1 flex items-center gap-2">
                <input type="number" min={0} value={Number(c[r.k])} onChange={(e) => setC({ ...c, [r.k]: Number(e.target.value) })} className="block w-24 rounded-xl border-0 bg-arroz px-3 py-2 ring-1 ring-tinta/15" />
                <span className="font-normal text-niebla">{r.unidad}</span>
              </span>
              {r.ayuda ? <span className="mt-1 block text-xs font-normal text-niebla">{r.ayuda}</span> : null}
            </label>
          ))}
          <div className="sm:col-span-2 xl:col-span-3"><Boton type="submit" cargando={pendiente}>Guardar reglas</Boton></div>
        </form>
        <p className="mt-3 text-sm text-niebla">El tope por franja (comensales nuevos cada intervalo) se ajusta en cada turno, más abajo. Las mesas combinables y las no reservables online, en el mapa de mesas.</p>
      </section>

      <section id="local" aria-labelledby="t-local" className="mt-12 scroll-mt-24">
        <h2 id="t-local" className="font-display text-2xl">Datos del local</h2>
        <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); hacer(() => guardarConfiguracion({ ...Object.fromEntries(datosLocal.map((d) => [d.k, String(c[d.k] ?? "")])), aparcamiento: c.aparcamiento as { es: string; va: string; en: string } }), "Datos del local guardados"); }}>
          {datosLocal.map((d) => (
            <label key={d.k} className="text-sm font-semibold">{d.etiqueta}<input value={String(c[d.k] ?? "")} onChange={(e) => setC({ ...c, [d.k]: e.target.value })} className={campo} /></label>
          ))}
          {(["es", "va", "en"] as const).map((l) => (
            <label key={l} className="text-sm font-semibold">Aparcamiento ({l})<input value={(c.aparcamiento as Record<string, string>)?.[l] ?? ""} onChange={(e) => setC({ ...c, aparcamiento: { ...(c.aparcamiento as object), [l]: e.target.value } })} className={campo} /></label>
          ))}
          <div className="sm:col-span-2"><Boton type="submit" cargando={pendiente}>Guardar datos</Boton></div>
        </form>
      </section>

      {esAdmin ? (
        <section id="legal" aria-labelledby="t-legal" className="mt-12 scroll-mt-24">
          <h2 id="t-legal" className="font-display text-2xl">Datos legales</h2>
          <p className="text-sm text-niebla">Solo el administrador. Aparecen en el aviso legal y la política de privacidad.</p>
          <form className="mt-4 grid gap-4 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); hacer(() => guardarConfiguracion({ razon_social: c.razon_social, cif: c.cif, domicilio_social: c.domicilio_social }), "Datos legales guardados"); }}>
            <label className="text-sm font-semibold">Razón social<input value={c.razon_social} onChange={(e) => setC({ ...c, razon_social: e.target.value })} className={campo} /></label>
            <label className="text-sm font-semibold">NIF/CIF<input value={c.cif} onChange={(e) => setC({ ...c, cif: e.target.value })} className={campo} /></label>
            <label className="text-sm font-semibold">Domicilio social<input value={c.domicilio_social} onChange={(e) => setC({ ...c, domicilio_social: e.target.value })} className={campo} /></label>
            <div className="sm:col-span-3"><Boton type="submit" cargando={pendiente}>Guardar datos legales</Boton></div>
          </form>
        </section>
      ) : null}

      <section id="turnos" aria-labelledby="t-turnos" className="mt-12 scroll-mt-24">
        <h2 id="t-turnos" className="font-display text-2xl">Horarios y turnos</h2>
        <p className="text-sm text-niebla">Un turno por día y servicio. Sin turnos, el día está cerrado.</p>
        <div className="mt-4 space-y-3">
          {ordenDias.map((d) => (
            <div key={d} className="rounded-2xl bg-white p-3 ring-1 ring-tinta/10">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{dias[d]}</p>
                <div className="flex gap-2">
                  {(["comida", "cena"] as const).filter((n) => !turnos.some((t) => t.dia_semana === d && t.nombre === n)).map((n) => (
                    <button key={n} type="button" className="min-h-10 rounded-full bg-arroz px-3 text-sm font-semibold ring-1 ring-tinta/10" onClick={() => hacer(() => guardarTurno({ nombre: n, dia_semana: d, inicio: n === "comida" ? "13:00" : "20:30", fin: n === "comida" ? "16:30" : "23:30", ultima_hora: n === "comida" ? "15:30" : "22:30", tope_franja: 20, activo: true }), `Añadida ${n} del ${dias[d].toLowerCase()}`)}>+ {n}</button>
                  ))}
                </div>
              </div>
              {turnos.filter((t) => t.dia_semana === d).map((t) => <FilaTurno key={t.id} turno={t} onGuardar={(x) => hacer(() => guardarTurno({ ...x, nombre: x.nombre as "comida" | "cena" }), "Turno guardado")} onBorrar={() => confirm("¿Quitar este turno?") && hacer(() => borrarTurno(t.id), "Turno quitado")} />)}
              {!turnos.some((t) => t.dia_semana === d) ? <p className="text-sm text-niebla">Cerrado</p> : null}
            </div>
          ))}
        </div>
      </section>

      <section id="bloqueos" aria-labelledby="t-bloqueos" className="mt-12 scroll-mt-24">
        <h2 id="t-bloqueos" className="font-display text-2xl">Bloqueos</h2>
        <p className="text-sm text-niebla">Vacaciones, eventos privados, terraza con lluvia… Sin zona ni mesa, se bloquea todo el local.</p>
        <form className="mt-4 grid gap-3 rounded-2xl bg-white p-4 ring-1 ring-tinta/10 sm:grid-cols-3 lg:grid-cols-6" onSubmit={(e) => { e.preventDefault(); hacer(() => crearBloqueo(bloqueo), "Bloqueo creado: la web ya no ofrece esas horas"); }}>
          <label className="text-sm font-semibold">Desde<input type="date" required value={bloqueo.desde} onChange={(e) => setBloqueo({ ...bloqueo, desde: e.target.value, hasta: e.target.value > bloqueo.hasta ? e.target.value : bloqueo.hasta })} className={campo} /></label>
          <label className="text-sm font-semibold">Hasta<input type="date" required min={bloqueo.desde} value={bloqueo.hasta} onChange={(e) => setBloqueo({ ...bloqueo, hasta: e.target.value })} className={campo} /></label>
          <label className="text-sm font-semibold">Turno<select value={bloqueo.turno_nombre} onChange={(e) => setBloqueo({ ...bloqueo, turno_nombre: e.target.value })} className={campo}><option value="">Todo el día</option><option value="comida">Comida</option><option value="cena">Cena</option></select></label>
          <label className="text-sm font-semibold">Zona<select value={bloqueo.zona_id} onChange={(e) => setBloqueo({ ...bloqueo, zona_id: e.target.value, mesa_id: "" })} className={campo}><option value="">Todo el local</option>{zonas.map((z) => <option key={z.id} value={z.id}>{z.nombre}</option>)}</select></label>
          <label className="text-sm font-semibold">Mesa<select value={bloqueo.mesa_id} onChange={(e) => setBloqueo({ ...bloqueo, mesa_id: e.target.value })} className={campo}><option value="">—</option>{mesas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select></label>
          <label className="text-sm font-semibold">Motivo<input value={bloqueo.motivo} onChange={(e) => setBloqueo({ ...bloqueo, motivo: e.target.value })} placeholder="Vacaciones" className={campo} /></label>
          <div className="sm:col-span-3 lg:col-span-6"><Boton type="submit" cargando={pendiente}>Bloquear</Boton></div>
        </form>
        <ul className="mt-3 divide-y divide-tinta/10 rounded-2xl bg-white ring-1 ring-tinta/10">
          {bloqueos.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
              <span>
                <strong>{fmtRango(b.desde, b.hasta)}</strong> · {b.mesa_id ? `mesa ${mesas.find((m) => m.id === b.mesa_id)?.nombre ?? ""}` : b.zona_id ? zonas.find((z) => z.id === b.zona_id)?.nombre : "todo el local"}
                {b.turno_nombre ? ` · ${b.turno_nombre}` : ""} {b.motivo ? `· ${b.motivo}` : ""}
              </span>
              <button type="button" onClick={() => hacer(() => borrarBloqueo(b.id), "Bloqueo quitado")} className="min-h-10 px-2 underline">Quitar</button>
            </li>
          ))}
          {!bloqueos.length ? <li className="p-3 text-sm text-niebla">Sin bloqueos futuros.</li> : null}
        </ul>
      </section>

      <section id="plantillas" aria-labelledby="t-plantillas" className="mt-12 scroll-mt-24">
        <h2 id="t-plantillas" className="font-display text-2xl">Plantillas de mensajes</h2>
        <p className="text-sm text-niebla">Variables: {"{nombre} {fecha} {hora} {comensales} {enlace} {telefono} {restaurante} {resena}"}. Separa párrafos con una línea en blanco.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <select aria-label="Mensaje" value={plantilla.tipo} onChange={(e) => { setPlantilla({ ...plantilla, tipo: e.target.value }); setTextoPlantilla(null); }} className="min-h-11 rounded-full border-0 bg-white px-3 ring-1 ring-tinta/15">
            {Object.entries(tiposPlantilla).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
          </select>
          <select aria-label="Idioma" value={plantilla.idioma} onChange={(e) => { setPlantilla({ ...plantilla, idioma: e.target.value }); setTextoPlantilla(null); }} className="min-h-11 rounded-full border-0 bg-white px-3 ring-1 ring-tinta/15">
            <option value="es">Castellano</option><option value="va">Valencià</option><option value="en">English</option>
          </select>
        </div>
        <form
          className="mt-3 space-y-3 rounded-2xl bg-white p-4 ring-1 ring-tinta/10"
          onSubmit={(e) => {
            e.preventDefault();
            const t = textoPlantilla ?? { asunto: actual?.asunto ?? "", cuerpo: actual?.cuerpo ?? "" };
            hacer(() => guardarPlantilla(plantilla.tipo, plantilla.idioma, t.asunto, t.cuerpo), "Plantilla guardada");
          }}
        >
          <label className="block text-sm font-semibold">Asunto<input value={textoPlantilla?.asunto ?? actual?.asunto ?? ""} onChange={(e) => setTextoPlantilla({ asunto: e.target.value, cuerpo: textoPlantilla?.cuerpo ?? actual?.cuerpo ?? "" })} className={campo} /></label>
          <label className="block text-sm font-semibold">Texto<textarea rows={8} value={textoPlantilla?.cuerpo ?? actual?.cuerpo ?? ""} onChange={(e) => setTextoPlantilla({ asunto: textoPlantilla?.asunto ?? actual?.asunto ?? "", cuerpo: e.target.value })} className={campo} /></label>
          <Boton type="submit" cargando={pendiente}>Guardar plantilla</Boton>
        </form>
      </section>
    </div>
  );
}

function FilaTurno({ turno, onGuardar, onBorrar }: { turno: Turno; onGuardar: (t: Turno) => void; onBorrar: () => void }) {
  const [t, setT] = useState(turno);
  const campo = "mt-1 block w-28 rounded-xl border-0 bg-arroz px-2 py-2 ring-1 ring-tinta/15";
  return (
    <form className="mt-2 flex flex-wrap items-end gap-3 text-sm" onSubmit={(e) => { e.preventDefault(); onGuardar(t); }}>
      <span className="w-16 pb-2 font-semibold capitalize">{t.nombre}</span>
      <label className="font-semibold">Abre<input type="time" value={t.inicio.slice(0, 5)} onChange={(e) => setT({ ...t, inicio: e.target.value })} className={campo} /></label>
      <label className="font-semibold">Cierra<input type="time" value={t.fin.slice(0, 5)} onChange={(e) => setT({ ...t, fin: e.target.value })} className={campo} /></label>
      <label className="font-semibold">Última hora<input type="time" value={t.ultima_hora.slice(0, 5)} onChange={(e) => setT({ ...t, ultima_hora: e.target.value })} className={campo} /></label>
      <label className="font-semibold">Tope por franja<input type="number" min={1} value={t.tope_franja} onChange={(e) => setT({ ...t, tope_franja: Number(e.target.value) })} className={campo} /></label>
      <label className="flex items-center gap-2 pb-2 font-semibold"><input type="checkbox" className="size-5 accent-pimenton" checked={t.activo} onChange={(e) => setT({ ...t, activo: e.target.checked })} /> Activo</label>
      <button type="submit" className="min-h-10 rounded-full bg-tinta px-4 font-semibold text-arroz">Guardar</button>
      <button type="button" onClick={onBorrar} className="min-h-10 px-2 underline">Quitar</button>
    </form>
  );
}

function fmtRango(desde: string, hasta: string) {
  const f = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "short" });
  const fin = new Date(Date.parse(hasta) - 1);
  const a = f.format(new Date(desde));
  const b = f.format(fin);
  return a === b ? a : `${a} – ${b}`;
}
