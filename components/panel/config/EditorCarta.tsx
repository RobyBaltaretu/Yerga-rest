"use client";

import { useState, useTransition } from "react";
import { borrarPlato, borrarResena, guardarContenido, guardarPlato, guardarResena, type PlatoEditable } from "@/app/panel/config-acciones";
import { Boton } from "@/components/ui/Boton";
import { useRecargar } from "@/components/panel/DatosPanel";

type Plato = PlatoEditable & { id: string };
type Contenido = { clave: string; etiqueta: string; ayuda?: string; valor: { es: string; va: string; en: string } };
type Resena = { id: string; autor: string; texto: string; puntuacion: number | null; origen: string; url: string | null; visible: boolean; orden: number };

const categorias: Record<string, string> = { arroz: "Arroces", entrante: "Para empezar", postre: "Postres", menu_grupo: "Menús de grupo", bebida: "Bebidas" };
const alergenos: [string, string][] = [
  ["gluten", "Gluten"], ["crustaceos", "Crustáceos"], ["huevo", "Huevo"], ["pescado", "Pescado"], ["cacahuetes", "Cacahuetes"], ["soja", "Soja"], ["lacteos", "Lácteos"],
  ["frutos_cascara", "Frutos de cáscara"], ["apio", "Apio"], ["mostaza", "Mostaza"], ["sesamo", "Sésamo"], ["sulfitos", "Sulfitos"], ["altramuces", "Altramuces"], ["moluscos", "Moluscos"],
];
const idiomas = [["es", "Castellano"], ["va", "Valencià"], ["en", "English"]] as const;

const nuevo = (categoria: string): Plato => ({
  id: "",
  categoria: categoria as Plato["categoria"],
  slug: "",
  nombre: { es: "", va: "", en: "" },
  descripcion: { es: "", va: "", en: "" },
  precio: null,
  precio_por_persona: categoria === "arroz",
  alergenos: [],
  min_comensales: categoria === "arroz" ? 2 : 1,
  encargable: categoria === "arroz",
  visible: true,
  destacado: false,
  temporada: null,
  orden: 99,
  es_ejemplo: false,
});

const slugDe = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

export function EditorCarta({ platos, contenidos, resenas }: { platos: Plato[]; contenidos: Contenido[]; resenas: Resena[] }) {
  const recargar = useRecargar();
  const [editando, setEditando] = useState<Plato | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendiente, startTransition] = useTransition();

  const hacer = (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string, despues?: () => void) =>
    startTransition(async () => {
      const r = await fn();
      setMsg({ ok: r.ok, texto: r.ok ? ok : (r.error ?? "No se ha podido guardar") });
      if (r.ok) despues?.();
      recargar();
    });

  return (
    <div className="space-y-12 px-4 py-6 sm:px-6">
      {msg ? <p className={`rounded-xl px-3 py-2 text-sm font-semibold ${msg.ok ? "bg-huerta-claro text-huerta" : "bg-pimenton/15 text-pimenton-oscuro"}`} role="status">{msg.texto}</p> : null}

      <section aria-labelledby="t-platos">
        <h2 id="t-platos" className="font-display text-2xl">Carta</h2>
        {Object.entries(categorias).map(([cat, nombre]) => {
          const lista = platos.filter((p) => p.categoria === cat);
          return (
            <div key={cat} className="mt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-widest text-niebla">{nombre}</h3>
                <button type="button" className="min-h-10 rounded-full bg-white px-3 text-sm font-semibold ring-1 ring-tinta/15" onClick={() => setEditando(nuevo(cat))}>+ Añadir</button>
              </div>
              <ul className="mt-2 divide-y divide-tinta/10 rounded-2xl bg-white ring-1 ring-tinta/10">
                {lista.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                    <div>
                      <p className={`font-semibold ${p.visible ? "" : "text-niebla line-through"}`}>
                        {p.nombre.es}
                        {p.es_ejemplo ? <span className="ml-2 rounded-full bg-azafran/30 px-2 text-xs">ejemplo</span> : null}
                        {p.destacado ? <span className="ml-2 rounded-full bg-huerta-claro px-2 text-xs">destacado</span> : null}
                      </p>
                      <p className="text-sm text-niebla">
                        {p.precio != null ? `${p.precio.toFixed(2)} €${p.precio_por_persona ? "/persona" : ""}` : "sin precio"}
                        {p.min_comensales > 1 ? ` · mín. ${p.min_comensales}` : ""}
                        {p.alergenos.length ? ` · ${p.alergenos.length} alérgenos` : " · sin alérgenos"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <label className="sr-only" htmlFor={`precio-${p.id}`}>Precio de {p.nombre.es}</label>
                      <input
                        id={`precio-${p.id}`}
                        type="number"
                        step="0.5"
                        min="0"
                        defaultValue={p.precio ?? ""}
                        className="min-h-11 w-24 rounded-xl border-0 bg-arroz px-3 text-right ring-1 ring-tinta/15"
                        onBlur={(e) => {
                          const v = e.target.value === "" ? null : Number(e.target.value);
                          if (v !== p.precio) hacer(() => guardarPlato({ ...p, precio: v }), `Precio de ${p.nombre.es} actualizado`);
                        }}
                      />
                      <button type="button" className="min-h-11 rounded-full bg-tinta px-4 text-sm font-semibold text-arroz" onClick={() => setEditando(p)}>Editar</button>
                    </div>
                  </li>
                ))}
                {!lista.length ? <li className="p-3 text-sm text-niebla">Sin platos.</li> : null}
              </ul>
            </div>
          );
        })}
      </section>

      {editando ? (
        <FormPlato
          plato={editando}
          pendiente={pendiente}
          onCancelar={() => setEditando(null)}
          onGuardar={(p) => hacer(() => guardarPlato({ ...p, id: p.id || undefined }), `«${p.nombre.es}» guardado`, () => setEditando(null))}
          onBorrar={editando.id ? () => confirm(`¿Borrar «${editando.nombre.es}»?`) && hacer(() => borrarPlato(editando.id), "Plato borrado", () => setEditando(null)) : undefined}
        />
      ) : null}

      <section aria-labelledby="t-textos">
        <h2 id="t-textos" className="font-display text-2xl">Textos de la web</h2>
        <div className="mt-4 space-y-4">
          {contenidos.map((c) => (
            <TextoMultilingue key={c.clave} contenido={c} onGuardar={(v) => hacer(() => guardarContenido(c.clave, v), `«${c.etiqueta}» guardado`)} />
          ))}
        </div>
      </section>

      <section aria-labelledby="t-resenas">
        <div className="flex items-center justify-between">
          <h2 id="t-resenas" className="font-display text-2xl">Opiniones</h2>
          <button type="button" className="min-h-10 rounded-full bg-white px-3 text-sm font-semibold ring-1 ring-tinta/15" onClick={() => hacer(() => guardarResena({ autor: "Nombre", texto: "Texto de la reseña", puntuacion: 5, origen: "Google", url: null, visible: false, orden: 99 }), "Reseña añadida (oculta hasta completarla)")}>+ Añadir</button>
        </div>
        <p className="text-sm text-niebla">Reseñas reales, enlazadas a su origen.</p>
        <ul className="mt-3 space-y-3">
          {resenas.map((r) => (
            <FormResena key={r.id} resena={r} onGuardar={(x) => hacer(() => guardarResena(x), "Reseña guardada")} onBorrar={() => hacer(() => borrarResena(r.id), "Reseña borrada")} />
          ))}
        </ul>
      </section>
    </div>
  );
}

function FormPlato({ plato, pendiente, onGuardar, onCancelar, onBorrar }: { plato: Plato; pendiente: boolean; onGuardar: (p: Plato) => void; onCancelar: () => void; onBorrar?: () => void }) {
  const [p, setP] = useState(plato);
  const campo = "mt-1 block w-full rounded-xl border-0 bg-arroz px-3 py-2 ring-1 ring-tinta/15";
  return (
    <section aria-label="Editar plato" className="rounded-3xl bg-white p-5 ring-2 ring-azafran-oscuro">
      <h2 className="font-display text-2xl">{plato.id ? `Editar «${plato.nombre.es}»` : `Nuevo plato · ${categorias[plato.categoria]}`}</h2>
      <form
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onGuardar({ ...p, slug: p.slug || slugDe(p.nombre.es) });
        }}
      >
        <div className="grid gap-4 md:grid-cols-3">
          {idiomas.map(([l, nombre]) => (
            <div key={l} className="space-y-2">
              <label className="block text-sm font-semibold">Nombre · {nombre}<input required={l === "es"} value={p.nombre[l]} onChange={(e) => setP({ ...p, nombre: { ...p.nombre, [l]: e.target.value } })} className={campo} /></label>
              <label className="block text-sm font-semibold">Descripción · {nombre}<textarea rows={3} value={p.descripcion[l]} onChange={(e) => setP({ ...p, descripcion: { ...p.descripcion, [l]: e.target.value } })} className={campo} /></label>
            </div>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <label className="block text-sm font-semibold">Precio (€)<input type="number" step="0.01" min="0" value={p.precio ?? ""} onChange={(e) => setP({ ...p, precio: e.target.value === "" ? null : Number(e.target.value) })} className={campo} /></label>
          <label className="block text-sm font-semibold">Mínimo de personas<input type="number" min="1" value={p.min_comensales} onChange={(e) => setP({ ...p, min_comensales: Number(e.target.value) })} className={campo} /></label>
          <label className="block text-sm font-semibold">Temporada<input value={p.temporada ?? ""} onChange={(e) => setP({ ...p, temporada: e.target.value || null })} className={campo} placeholder="mayo–agosto" /></label>
          <label className="block text-sm font-semibold">Orden<input type="number" value={p.orden} onChange={(e) => setP({ ...p, orden: Number(e.target.value) })} className={campo} /></label>
        </div>
        <fieldset>
          <legend className="text-sm font-semibold">Alérgenos (Reglamento UE 1169/2011)</legend>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {alergenos.map(([k, n]) => (
              <label key={k} className="flex min-h-10 items-center gap-2 text-sm">
                <input type="checkbox" className="size-5 accent-pimenton" checked={p.alergenos.includes(k as never)} onChange={(e) => setP({ ...p, alergenos: e.target.checked ? [...p.alergenos, k as never] : p.alergenos.filter((x) => x !== k) })} />
                {n}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
          {([["precio_por_persona", "Precio por persona"], ["encargable", "Se puede encargar al reservar"], ["visible", "Visible en la web"], ["destacado", "Destacado"], ["es_ejemplo", "Marcar como «ejemplo»"]] as const).map(([k, n]) => (
            <label key={k} className="flex min-h-10 items-center gap-2"><input type="checkbox" className="size-5 accent-pimenton" checked={p[k]} onChange={(e) => setP({ ...p, [k]: e.target.checked })} /> {n}</label>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <Boton type="submit" cargando={pendiente}>Guardar plato</Boton>
          <Boton type="button" variante="secundario" onClick={onCancelar}>Cancelar</Boton>
          {onBorrar ? <Boton type="button" variante="peligro" onClick={onBorrar}>Borrar</Boton> : null}
        </div>
      </form>
    </section>
  );
}

function TextoMultilingue({ contenido, onGuardar }: { contenido: Contenido; onGuardar: (v: { es: string; va: string; en: string }) => void }) {
  const [v, setV] = useState(contenido.valor);
  const cambiado = JSON.stringify(v) !== JSON.stringify(contenido.valor);
  return (
    <form className="rounded-2xl bg-white p-4 ring-1 ring-tinta/10" onSubmit={(e) => { e.preventDefault(); onGuardar(v); }}>
      <p className="font-semibold">{contenido.etiqueta}</p>
      {contenido.ayuda ? <p className="text-xs text-niebla">{contenido.ayuda}</p> : null}
      <div className="mt-2 grid gap-3 md:grid-cols-3">
        {idiomas.map(([l, n]) => (
          <label key={l} className="block text-xs font-semibold text-niebla">
            {n}
            <textarea rows={contenido.clave.startsWith("legal") ? 6 : 2} value={v[l] ?? ""} onChange={(e) => setV({ ...v, [l]: e.target.value })} className="mt-1 block w-full rounded-xl border-0 bg-arroz px-3 py-2 text-sm text-tinta ring-1 ring-tinta/15" />
          </label>
        ))}
      </div>
      <button type="submit" disabled={!cambiado} className="mt-2 min-h-10 rounded-full bg-tinta px-4 text-sm font-semibold text-arroz disabled:opacity-40">Guardar</button>
    </form>
  );
}

function FormResena({ resena, onGuardar, onBorrar }: { resena: Resena; onGuardar: (r: Resena) => void; onBorrar: () => void }) {
  const [r, setR] = useState(resena);
  const campo = "mt-1 block w-full rounded-xl border-0 bg-arroz px-3 py-2 text-sm ring-1 ring-tinta/15";
  return (
    <li className="rounded-2xl bg-white p-4 ring-1 ring-tinta/10">
      <div className="grid gap-3 sm:grid-cols-4">
        <label className="text-xs font-semibold">Autor<input value={r.autor} onChange={(e) => setR({ ...r, autor: e.target.value })} className={campo} /></label>
        <label className="text-xs font-semibold">Origen<input value={r.origen} onChange={(e) => setR({ ...r, origen: e.target.value })} className={campo} /></label>
        <label className="text-xs font-semibold">Enlace<input value={r.url ?? ""} onChange={(e) => setR({ ...r, url: e.target.value || null })} className={campo} /></label>
        <label className="text-xs font-semibold">Estrellas<input type="number" min={1} max={5} value={r.puntuacion ?? ""} onChange={(e) => setR({ ...r, puntuacion: e.target.value ? Number(e.target.value) : null })} className={campo} /></label>
      </div>
      <label className="mt-2 block text-xs font-semibold">Texto<textarea rows={2} value={r.texto} onChange={(e) => setR({ ...r, texto: e.target.value })} className={campo} /></label>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="size-5 accent-pimenton" checked={r.visible} onChange={(e) => setR({ ...r, visible: e.target.checked })} /> Visible</label>
        <button type="button" onClick={() => onGuardar(r)} className="min-h-10 rounded-full bg-tinta px-4 text-sm font-semibold text-arroz">Guardar</button>
        <button type="button" onClick={onBorrar} className="min-h-10 px-2 text-sm underline">Borrar</button>
      </div>
    </li>
  );
}
