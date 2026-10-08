"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { crearReserva, horasPersonal } from "@/app/panel/acciones";
import { Boton } from "@/components/ui/Boton";
import { AreaTexto, Campo } from "@/components/ui/Campo";

type Hora = { inicio: string; hora: string; turno: string; disponible: boolean; zonas: string[] };

const motivos: Record<string, string> = {
  fuera_de_horario: "Esa hora está fuera del horario de reservas",
  bloqueado: "El día o el turno está bloqueado",
  tope_franja: "Se supera el tope de comensales de esa franja",
  sin_mesa: "No queda mesa libre para ese grupo a esa hora",
  capacidad: "La mesa elegida no tiene capacidad suficiente",
  mesa_ocupada: "La mesa está ocupada",
  datos_invalidos: "Faltan datos",
  permiso: "Sin permiso",
};

/** Alta rápida para teléfono o puerta: personas, hora y nombre. */
export function NuevaReserva({ fechaInicial, hoy, zonas, horasIniciales }: { fechaInicial: string; hoy: string; zonas: { id: string; nombre: string }[]; horasIniciales: Hora[] }) {
  const [origen, setOrigen] = useState<"telefono" | "puerta">("telefono");
  const [n, setN] = useState(2);
  const [fecha, setFecha] = useState(fechaInicial);
  const [horas, setHoras] = useState<Hora[] | null>(horasIniciales);
  const [inicio, setInicio] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [notas, setNotas] = useState("");
  const [alergias, setAlergias] = useState("");
  const [zona, setZona] = useState("");
  const [resultado, setResultado] = useState<{ ok: boolean; texto: string; forzable?: boolean } | null>(null);
  const [pendiente, startTransition] = useTransition();

  const cargar = (f: string, personas: number) =>
    startTransition(async () => {
      setHoras(null);
      setHoras(await horasPersonal(f, personas));
    });

  const enviar = (forzar = false) =>
    startTransition(async () => {
      const r = await crearReserva(
        {
          origen,
          comensales: n,
          inicio: origen === "puerta" ? undefined : inicio ?? undefined,
          nombre: nombre || (origen === "puerta" ? "Sin reserva" : ""),
          telefono: telefono || undefined,
          correo: correo || undefined,
          notas: notas || undefined,
          alergias: alergias || undefined,
          zona_id: zona || undefined,
        },
        forzar,
      );
      if (r.ok) {
        setResultado({ ok: true, texto: `Reserva creada${r.mesas?.length ? "" : " sin mesa asignada"}.${r.aviso ? " (forzada)" : ""}` });
        setNombre("");
        setTelefono("");
        setCorreo("");
        setNotas("");
        setAlergias("");
        setInicio(null);
        if (origen === "telefono") cargar(fecha, n);
      } else {
        setResultado({ ok: false, texto: motivos[r.motivo ?? ""] ?? "No se ha podido crear", forzable: r.puede_forzar });
      }
    });

  const listo = n > 0 && (origen === "puerta" || inicio) && (origen === "puerta" || nombre.trim().length >= 2);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex gap-2" role="tablist" aria-label="Tipo">
        <button type="button" role="tab" aria-selected={origen === "telefono"} onClick={() => setOrigen("telefono")} className={`min-h-12 flex-1 rounded-full font-semibold ${origen === "telefono" ? "bg-tinta text-arroz" : "bg-white ring-1 ring-tinta/15"}`}>Por teléfono</button>
        <button type="button" role="tab" aria-selected={origen === "puerta"} onClick={() => setOrigen("puerta")} className={`min-h-12 flex-1 rounded-full font-semibold ${origen === "puerta" ? "bg-tinta text-arroz" : "bg-white ring-1 ring-tinta/15"}`}>Cliente sin reserva (ahora)</button>
      </div>

      <section aria-labelledby="t-personas">
        <h2 id="t-personas" className="font-display text-xl">1 · Personas</h2>
        <div className="mt-2 grid grid-cols-6 gap-2 sm:grid-cols-12">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => {
                setN(v);
                setInicio(null);
                if (origen === "telefono") cargar(fecha, v);
              }}
              aria-pressed={n === v}
              className={`min-h-12 rounded-xl text-lg font-semibold tabular-nums ring-1 ${n === v ? "bg-pimenton text-white ring-pimenton" : "bg-white ring-tinta/15"}`}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="mt-2 w-40">
          <Campo id="n-otro" type="number" min={1} max={200} etiqueta="Otro número" value={n} onChange={(e) => setN(Number(e.target.value) || 1)} onBlur={() => origen === "telefono" && cargar(fecha, n)} />
        </div>
      </section>

      {origen === "telefono" ? (
        <section aria-labelledby="t-hora">
          <h2 id="t-hora" className="font-display text-xl">2 · Día y hora</h2>
          <div className="mt-2 w-56">
            <Campo id="n-fecha" type="date" etiqueta="Día" min={hoy} value={fecha} onChange={(e) => { setFecha(e.target.value); setInicio(null); cargar(e.target.value, n); }} />
          </div>
          {!horas ? (
            <p className="mt-3 animate-pulse text-niebla">Calculando huecos…</p>
          ) : horas.length === 0 ? (
            <p className="mt-3 text-niebla">Ese día no hay turnos.</p>
          ) : (
            <ul className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-8" aria-label="Horas">
              {horas.map((h) => (
                <li key={h.inicio}>
                  <button
                    type="button"
                    onClick={() => setInicio(h.inicio)}
                    aria-pressed={inicio === h.inicio}
                    title={h.disponible ? "Hay mesa" : "Sin mesa libre: se puede forzar"}
                    className={`min-h-12 w-full rounded-xl font-semibold tabular-nums ring-1 ${inicio === h.inicio ? "bg-pimenton text-white ring-pimenton" : h.disponible ? "bg-white ring-tinta/15" : "bg-arroz-2 text-niebla line-through ring-tinta/5"}`}
                  >
                    {h.hora}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <section aria-labelledby="t-nombre" className="space-y-4">
        <h2 id="t-nombre" className="font-display text-xl">{origen === "telefono" ? "3 · Nombre" : "2 · Nombre (opcional)"}</h2>
        <Campo id="n-nombre" etiqueta="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="off" />
        <details className="rounded-2xl bg-white p-4 ring-1 ring-tinta/10">
          <summary className="min-h-8 cursor-pointer font-semibold">Más datos (teléfono, correo, alergias, zona…)</summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Campo id="n-tel" type="tel" etiqueta="Teléfono" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
            <Campo id="n-correo" type="email" etiqueta="Correo (envía confirmación)" value={correo} onChange={(e) => setCorreo(e.target.value)} />
            <Campo id="n-alergias" etiqueta="Alergias" value={alergias} onChange={(e) => setAlergias(e.target.value)} />
            <div>
              <label htmlFor="n-zona" className="block text-sm font-semibold">Zona preferida</label>
              <select id="n-zona" value={zona} onChange={(e) => setZona(e.target.value)} className="mt-1 block min-h-12 w-full rounded-xl border-0 bg-white px-3 ring-1 ring-tinta/20">
                <option value="">Cualquiera</option>
                {zonas.map((z) => <option key={z.id} value={z.id}>{z.nombre}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-4"><AreaTexto id="n-notas" etiqueta="Notas" value={notas} onChange={(e) => setNotas(e.target.value)} /></div>
        </details>
      </section>

      {resultado ? (
        <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 font-semibold ${resultado.ok ? "bg-huerta-claro text-huerta" : "bg-pimenton/15 text-pimenton-oscuro"}`} role="status">
          <span>{resultado.texto}</span>
          {resultado.ok ? <Link href="/panel" className="underline">Ir al servicio</Link> : null}
          {!resultado.ok && resultado.forzable ? <Boton onClick={() => enviar(true)} cargando={pendiente}>Forzar (queda registrado)</Boton> : null}
        </div>
      ) : null}

      <Boton onClick={() => enviar(false)} disabled={!listo} cargando={pendiente} className="w-full sm:w-auto">
        {origen === "puerta" ? "Sentar ahora" : "Crear reserva"}
      </Boton>
    </div>
  );
}
