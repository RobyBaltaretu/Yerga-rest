"use client";

import { createContext, useCallback, useContext, useEffect, useState, type DependencyList, type ReactNode } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import type { Rol, Sesion } from "@/lib/panel/sesion";

/**
 * El panel es una aplicación de navegador: el servidor solo comprueba la sesión
 * (proxy.ts) y entrega la carcasa estática. Los datos se leen aquí con la sesión del
 * usuario, así que los permisos los aplica la base de datos (RLS y RPC), no la interfaz.
 */
export type Db = SupabaseClient<Database>;

// ---------------------------------------------------------------------------
// Sesión
// ---------------------------------------------------------------------------
const ContextoSesion = createContext<Sesion | null>(null);

export function useSesion(): Sesion {
  const s = useContext(ContextoSesion);
  if (!s) throw new Error("useSesion fuera de ProveedorSesion");
  return s;
}

export const puedeGestionar = (rol: Rol) => rol === "administrador" || rol === "encargado";

/** Carga el usuario del panel y su rol. Sin sesión válida, vuelve al acceso. */
export function ProveedorSesion({ children, permitirCambioClave = false }: { children: ReactNode; permitirCambioClave?: boolean }) {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  useEffect(() => {
    let vivo = true;
    (async () => {
      const db = getBrowserClient();
      const {
        data: { user },
      } = await db.auth.getUser();
      if (!user) return location.replace(`/panel/acceso?siguiente=${encodeURIComponent(location.pathname)}`);
      const { data: perfil } = await db.from("usuario").select("id, nombre, correo, rol, activo, debe_cambiar_clave").eq("id", user.id).maybeSingle();
      if (!perfil?.activo) return location.replace("/panel/acceso?error=sin_permiso");
      if (perfil.debe_cambiar_clave && !permitirCambioClave) return location.replace("/panel/clave");
      if (vivo) setSesion(perfil as Sesion);
    })();
    return () => {
      vivo = false;
    };
  }, [permitirCambioClave]);
  if (!sesion) return <Cargando pantalla />;
  return <ContextoSesion.Provider value={sesion}>{children}</ContextoSesion.Provider>;
}

/** Pantallas solo de encargado o administrador. El resto vuelve al servicio de hoy. */
export function RequiereRol({ rol, children }: { rol: "gestion" | "admin"; children: ReactNode }) {
  const s = useSesion();
  const router = useRouter();
  const ok = rol === "admin" ? s.rol === "administrador" : puedeGestionar(s.rol);
  useEffect(() => {
    if (!ok) router.replace("/panel?error=permiso");
  }, [ok, router]);
  return ok ? children : null;
}

// ---------------------------------------------------------------------------
// Recarga: Tiempo Real y las acciones avisan aquí para volver a pedir los datos.
// ---------------------------------------------------------------------------
const ContextoRecarga = createContext<{ version: number; recargar: () => void }>({ version: 0, recargar: () => {} });

export function ProveedorRecarga({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0);
  const recargar = useCallback(() => setVersion((v) => v + 1), []);
  return <ContextoRecarga.Provider value={{ version, recargar }}>{children}</ContextoRecarga.Provider>;
}

/** Vuelve a pedir los datos de la pantalla (tras una acción o un cambio en tiempo real). */
export const useRecargar = () => useContext(ContextoRecarga).recargar;

// ---------------------------------------------------------------------------
// Datos
// ---------------------------------------------------------------------------
type Estado<T> = { datos?: T; error?: string };

/**
 * Pide los datos de una pantalla con el cliente del navegador. Se repite al cambiar
 * `deps` y con cada recarga; mientras tanto se siguen mostrando los anteriores.
 */
export function useDatos<T>(cargar: (db: Db) => Promise<T>, deps: DependencyList): Estado<T> {
  const { version } = useContext(ContextoRecarga);
  const [estado, setEstado] = useState<Estado<T>>({});
  useEffect(() => {
    let vivo = true;
    cargar(getBrowserClient())
      .then((datos) => vivo && setEstado({ datos }))
      .catch((e: unknown) => vivo && setEstado((s) => ({ ...s, error: e instanceof Error ? e.message : String(e) })));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `cargar` cambia en cada render; mandan `deps`.
  }, [version, ...deps]);
  return estado;
}

/** Muestra un indicador hasta tener datos y después pinta `children(datos)`. */
export function ConDatos<T>({ estado, children }: { estado: Estado<T>; children: (datos: T) => ReactNode }) {
  if (estado.datos !== undefined) return children(estado.datos);
  if (estado.error) {
    return (
      <p role="alert" className="m-6 rounded-2xl bg-white p-4 text-pimenton-oscuro ring-1 ring-tinta/10">
        No se han podido cargar los datos: {estado.error}
      </p>
    );
  }
  return <Cargando />;
}

export function Cargando({ pantalla = false }: { pantalla?: boolean }) {
  return (
    <div role="status" aria-live="polite" className={`grid place-items-center ${pantalla ? "min-h-dvh bg-arroz" : "min-h-64"}`}>
      <span className="flex items-center gap-3 text-niebla">
        <span className="size-5 animate-spin rounded-full border-2 border-tinta/20 border-t-pimenton" aria-hidden />
        Cargando…
      </span>
    </div>
  );
}

/** Parámetro de la URL validado (fechas, filtros…). */
export function useParam(nombre: string, valido?: (v: string) => boolean): string | null {
  const v = useSearchParams().get(nombre);
  return v != null && (!valido || valido(v)) ? v : null;
}

export const esFecha = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

/** Lanza el error de una consulta de Supabase para que `useDatos` lo muestre. */
export function sinError<T>(r: { data: T; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data;
}

/** Identificador de la ruta (`[id]`) si tiene forma de UUID. */
export function useIdRuta(): string | null {
  const { id } = useParams<{ id: string }>();
  return /^[0-9a-f-]{36}$/.test(id ?? "") ? id : null;
}

export function NoEncontrado({ que }: { que: string }) {
  return (
    <main className="px-6 py-16 text-center">
      <h1 className="font-display text-3xl">{que} no encontrado</h1>
      <p className="mt-2 text-niebla">Puede que se haya borrado o que el enlace no sea correcto.</p>
    </main>
  );
}
