"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { actualizarUsuario, crearUsuario, restablecerClave } from "@/app/panel/config-acciones";
import { Boton } from "@/components/ui/Boton";

type Rol = "administrador" | "encargado" | "sala";
type Usuario = { id: string; nombre: string; correo: string; rol: Rol; activo: boolean; debe_cambiar_clave: boolean };

function claveProvisional() {
  const a = new Uint32Array(3);
  crypto.getRandomValues(a);
  return `Yerga-${[...a].map((n) => n.toString(36)).join("").slice(0, 10)}`;
}

export function GestionUsuarios({ usuarios, yo }: { usuarios: Usuario[]; yo: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [nuevo, setNuevo] = useState({ nombre: "", correo: "", rol: "sala" as Rol, clave: "" });
  const [pendiente, startTransition] = useTransition();

  const hacer = (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) =>
    startTransition(async () => {
      const r = await fn();
      setMsg({ ok: r.ok, texto: r.ok ? ok : (r.error ?? "No se ha podido") });
      router.refresh();
    });

  const campo = "mt-1 block w-full rounded-xl border-0 bg-arroz px-3 py-2 ring-1 ring-tinta/15";
  return (
    <div className="space-y-8 px-4 py-6 sm:px-6">
      {msg ? <p className={`rounded-xl px-3 py-2 text-sm font-semibold ${msg.ok ? "bg-huerta-claro text-huerta" : "bg-pimenton/15 text-pimenton-oscuro"}`} role="status">{msg.texto}</p> : null}
      <ul className="divide-y divide-tinta/10 rounded-2xl bg-white ring-1 ring-tinta/10">
        {usuarios.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
            <div>
              <p className={`font-semibold ${u.activo ? "" : "text-niebla line-through"}`}>{u.nombre}{u.id === yo ? " (tú)" : ""}</p>
              <p className="text-sm text-niebla">{u.correo}{u.debe_cambiar_clave ? " · debe cambiar la contraseña" : ""}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor={`rol-${u.id}`}>Rol de {u.nombre}</label>
              <select id={`rol-${u.id}`} value={u.rol} disabled={u.id === yo} onChange={(e) => hacer(() => actualizarUsuario(u.id, { rol: e.target.value as Rol }), `Rol de ${u.nombre} actualizado`)} className="min-h-11 rounded-full border-0 bg-arroz px-3 ring-1 ring-tinta/15">
                <option value="sala">Sala</option>
                <option value="encargado">Encargado</option>
                <option value="administrador">Administrador</option>
              </select>
              {u.id !== yo ? (
                <button type="button" className="min-h-11 rounded-full bg-arroz px-4 text-sm font-semibold ring-1 ring-tinta/15" onClick={() => hacer(() => actualizarUsuario(u.id, { activo: !u.activo }), u.activo ? `${u.nombre} ya no tiene acceso` : `${u.nombre} vuelve a tener acceso`)}>
                  {u.activo ? "Quitar acceso" : "Dar acceso"}
                </button>
              ) : null}
              <button
                type="button"
                className="min-h-11 rounded-full bg-arroz px-4 text-sm font-semibold ring-1 ring-tinta/15"
                onClick={() => {
                  const clave = claveProvisional();
                  hacer(() => restablecerClave(u.id, clave), `Contraseña provisional de ${u.nombre}: ${clave} (deberá cambiarla al entrar)`);
                }}
              >
                Restablecer contraseña
              </button>
            </div>
          </li>
        ))}
      </ul>

      <form
        className="grid gap-4 rounded-2xl bg-white p-4 ring-1 ring-tinta/10 sm:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          const clave = nuevo.clave || claveProvisional();
          hacer(() => crearUsuario({ ...nuevo, clave }), `Usuario creado. Contraseña provisional: ${clave}`);
          setNuevo({ nombre: "", correo: "", rol: "sala", clave: "" });
        }}
      >
        <h2 className="font-display text-2xl sm:col-span-4">Nuevo usuario</h2>
        <label className="text-sm font-semibold">Nombre<input required value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} className={campo} /></label>
        <label className="text-sm font-semibold">Correo<input required type="email" value={nuevo.correo} onChange={(e) => setNuevo({ ...nuevo, correo: e.target.value })} className={campo} /></label>
        <label className="text-sm font-semibold">Rol<select value={nuevo.rol} onChange={(e) => setNuevo({ ...nuevo, rol: e.target.value as Rol })} className={campo}><option value="sala">Sala</option><option value="encargado">Encargado</option><option value="administrador">Administrador</option></select></label>
        <label className="text-sm font-semibold">Contraseña provisional<input value={nuevo.clave} onChange={(e) => setNuevo({ ...nuevo, clave: e.target.value })} placeholder="Se genera sola" className={campo} /></label>
        <div className="sm:col-span-4"><Boton type="submit" cargando={pendiente}>Crear usuario</Boton></div>
      </form>
    </div>
  );
}
