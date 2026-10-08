"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSesion } from "@/lib/panel/sesion";

// Carta, contenidos, configuración y usuarios. La base de datos vuelve a
// comprobar el rol de quien llama (RLS y disparadores).

type R = { ok: boolean; error?: string };

const multilingue = z.object({ es: z.string().max(2000), va: z.string().max(2000), en: z.string().max(2000) });
const alergenos = ["gluten", "crustaceos", "huevo", "pescado", "cacahuetes", "soja", "lacteos", "frutos_cascara", "apio", "mostaza", "sesamo", "sulfitos", "altramuces", "moluscos"] as const;

function refrescarWeb() {
  revalidatePath("/", "layout");
}

function mensajeError(e: { code?: string; message: string } | null): string | undefined {
  if (!e) return undefined;
  if (e.code === "42501" || /permission|administrador/i.test(e.message)) return "No tienes permiso para este cambio.";
  if (e.code === "23505") return "Ya existe un elemento con ese nombre.";
  return e.message;
}

// ---------------------------------------------------------------------------
// Carta
// ---------------------------------------------------------------------------
const esquemaPlato = z.object({
  id: z.guid().optional(),
  categoria: z.enum(["arroz", "entrante", "postre", "menu_grupo", "bebida"]),
  slug: z.string().regex(/^[a-z0-9-]{2,60}$/),
  nombre: multilingue,
  descripcion: multilingue,
  precio: z.number().min(0).max(999).nullable(),
  precio_por_persona: z.boolean(),
  alergenos: z.array(z.enum(alergenos)),
  min_comensales: z.number().int().min(1).max(40),
  encargable: z.boolean(),
  visible: z.boolean(),
  destacado: z.boolean(),
  temporada: z.string().max(40).nullable(),
  orden: z.number().int(),
  es_ejemplo: z.boolean(),
});
export type PlatoEditable = z.infer<typeof esquemaPlato>;

export async function guardarPlato(plato: PlatoEditable): Promise<R> {
  const p = esquemaPlato.safeParse(plato);
  if (!p.success) return { ok: false, error: "Revisa los datos del plato." };
  const supabase = await createClient();
  const { id, ...datos } = p.data;
  const { error } = id
    ? await supabase.from("plato").update(datos).eq("id", id)
    : await supabase.from("plato").insert(datos);
  refrescarWeb();
  return { ok: !error, error: mensajeError(error) };
}

export async function borrarPlato(id: string): Promise<R> {
  const supabase = await createClient();
  const { count } = await supabase.from("encargo_arroz").select("id", { count: "exact", head: true }).eq("plato_id", id);
  // Con encargos se oculta en lugar de borrarse, para no perder el historial.
  const { error } = count
    ? await supabase.from("plato").update({ visible: false }).eq("id", id)
    : await supabase.from("plato").delete().eq("id", id);
  refrescarWeb();
  return { ok: !error, error: count ? "Tenía encargos: se ha ocultado en lugar de borrarlo." : mensajeError(error) };
}

export async function guardarContenido(clave: string, valor: { es: string; va: string; en: string }): Promise<R> {
  if (!/^[a-z.]{3,40}$/.test(clave) || !multilingue.safeParse(valor).success) return { ok: false, error: "Datos no válidos" };
  const supabase = await createClient();
  const { error } = await supabase.from("contenido").upsert({ clave, valor });
  refrescarWeb();
  return { ok: !error, error: mensajeError(error) };
}

export async function guardarResena(r: { id?: string; autor: string; texto: string; puntuacion: number | null; origen: string; url: string | null; visible: boolean; orden: number }): Promise<R> {
  const supabase = await createClient();
  const { id, ...datos } = r;
  const { error } = id ? await supabase.from("resena").update(datos).eq("id", id) : await supabase.from("resena").insert(datos);
  refrescarWeb();
  return { ok: !error, error: mensajeError(error) };
}

export async function borrarResena(id: string): Promise<R> {
  const supabase = await createClient();
  const { error } = await supabase.from("resena").delete().eq("id", id);
  refrescarWeb();
  return { ok: !error, error: mensajeError(error) };
}

// ---------------------------------------------------------------------------
// Configuración, turnos, bloqueos y plantillas
// ---------------------------------------------------------------------------
const camposConfig = z
  .object({
    intervalo_min: z.number().int().min(5).max(60),
    duracion_hasta_4: z.number().int().min(30).max(360),
    duracion_desde_5: z.number().int().min(30).max(360),
    umbral_duracion_larga: z.number().int().min(2).max(40),
    margen_min: z.number().int().min(0).max(120),
    antelacion_min_min: z.number().int().min(0).max(10080),
    antelacion_max_dias: z.number().int().min(1).max(365),
    max_comensales_online: z.number().int().min(1).max(40),
    retencion_min: z.number().int().min(1).max(30),
    cortesia_min: z.number().int().min(0).max(120),
    cancelacion_libre_horas: z.number().int().min(0).max(168),
    recordatorio_horas: z.number().int().min(1).max(96),
    sin_confirmar_horas: z.number().int().min(1).max(48),
    aviso_conflicto_min: z.number().int().min(0).max(120),
    nombre_local: z.string().min(1).max(80),
    direccion: z.string().max(200),
    localidad: z.string().max(80),
    codigo_postal: z.string().max(10),
    telefono: z.string().max(30),
    whatsapp: z.string().max(30),
    correo: z.string().max(120),
    url_mapa: z.string().max(500),
    url_resenas: z.string().max(500),
    aparcamiento: multilingue,
    razon_social: z.string().max(200),
    cif: z.string().max(20),
    domicilio_social: z.string().max(300),
  })
  .partial();

export async function guardarConfiguracion(datos: z.infer<typeof camposConfig>): Promise<R> {
  const p = camposConfig.safeParse(datos);
  if (!p.success) return { ok: false, error: `Valor no válido: ${p.error.issues[0]?.path.join(".")}` };
  const supabase = await createClient();
  const { error } = await supabase.from("configuracion").update(p.data as never).eq("id", 1);
  refrescarWeb();
  return { ok: !error, error: mensajeError(error) };
}

const hora = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/);

export async function guardarTurno(t: { id?: string; nombre: "comida" | "cena"; dia_semana: number; inicio: string; fin: string; ultima_hora: string; tope_franja: number; activo: boolean }): Promise<R> {
  const p = z
    .object({ id: z.guid().optional(), nombre: z.enum(["comida", "cena"]), dia_semana: z.number().int().min(0).max(6), inicio: hora, fin: hora, ultima_hora: hora, tope_franja: z.number().int().min(1).max(500), activo: z.boolean() })
    .safeParse(t);
  if (!p.success) return { ok: false, error: "Revisa las horas del turno." };
  if (p.data.ultima_hora < p.data.inicio) return { ok: false, error: "La última hora reservable no puede ser anterior al inicio." };
  const supabase = await createClient();
  const { id, ...datos } = p.data;
  const { error } = id ? await supabase.from("turno").update(datos).eq("id", id) : await supabase.from("turno").insert(datos);
  refrescarWeb();
  return { ok: !error, error: mensajeError(error) };
}

export async function borrarTurno(id: string): Promise<R> {
  const supabase = await createClient();
  const { error } = await supabase.from("turno").delete().eq("id", id);
  refrescarWeb();
  return { ok: !error, error: mensajeError(error) };
}

export async function crearBloqueo(b: { desde: string; hasta: string; turno_nombre: string; zona_id: string; mesa_id: string; motivo: string }): Promise<R> {
  const p = z
    .object({ desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), turno_nombre: z.enum(["", "comida", "cena"]), zona_id: z.union([z.guid(), z.literal("")]), mesa_id: z.union([z.guid(), z.literal("")]), motivo: z.string().max(200) })
    .safeParse(b);
  if (!p.success || p.data.hasta < p.data.desde) return { ok: false, error: "Revisa las fechas." };
  const supabase = await createClient();
  // Días completos en hora de Valencia: desde las 00:00 del primero hasta las 00:00 del día siguiente al último.
  const [{ data: ini }, { data: fin }] = await Promise.all([
    supabase.rpc("hora_local", { p_fecha: p.data.desde, p_hora: "00:00" }),
    supabase.rpc("hora_local", { p_fecha: new Date(Date.parse(`${p.data.hasta}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10), p_hora: "00:00" }),
  ]);
  const sesion = await getSesion();
  const { error } = await supabase.from("bloqueo").insert({
    rango: `[${ini},${fin})`,
    turno_nombre: p.data.turno_nombre || null,
    zona_id: p.data.zona_id || null,
    mesa_id: p.data.mesa_id || null,
    motivo: p.data.motivo,
    creado_por: sesion.id,
  });
  refrescarWeb();
  return { ok: !error, error: mensajeError(error) };
}

export async function borrarBloqueo(id: string): Promise<R> {
  const supabase = await createClient();
  const { error } = await supabase.from("bloqueo").delete().eq("id", id);
  refrescarWeb();
  return { ok: !error, error: mensajeError(error) };
}

export async function guardarPlantilla(tipo: string, idioma: string, asunto: string, cuerpo: string): Promise<R> {
  if (!["es", "va", "en"].includes(idioma) || !asunto.trim() || !cuerpo.trim()) return { ok: false, error: "Asunto y texto son obligatorios." };
  const supabase = await createClient();
  const { error } = await supabase.from("plantilla_mensaje").upsert({ tipo, idioma, asunto: asunto.trim(), cuerpo });
  revalidatePath("/panel/configuracion");
  return { ok: !error, error: mensajeError(error) };
}

// ---------------------------------------------------------------------------
// Usuarios (solo administrador)
// ---------------------------------------------------------------------------
async function exigirAdmin(): Promise<boolean> {
  const s = await getSesion();
  return s.rol === "administrador";
}

export async function crearUsuario(u: { nombre: string; correo: string; rol: "administrador" | "encargado" | "sala"; clave: string }): Promise<R> {
  if (!(await exigirAdmin())) return { ok: false, error: "Solo el administrador gestiona usuarios." };
  const p = z.object({ nombre: z.string().min(2).max(80), correo: z.email(), rol: z.enum(["administrador", "encargado", "sala"]), clave: z.string().min(10) }).safeParse(u);
  if (!p.success) return { ok: false, error: "Nombre, correo válido y contraseña provisional de al menos 10 caracteres." };
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({ email: p.data.correo, password: p.data.clave, email_confirm: true, user_metadata: { nombre: p.data.nombre } });
  if (error || !data.user) return { ok: false, error: error?.message.includes("already") ? "Ya existe un usuario con ese correo." : (error?.message ?? "Error") };
  const supabase = await createClient();
  const { error: e2 } = await supabase.from("usuario").insert({ id: data.user.id, nombre: p.data.nombre, correo: p.data.correo, rol: p.data.rol, debe_cambiar_clave: true });
  if (e2) await admin.auth.admin.deleteUser(data.user.id);
  revalidatePath("/panel/usuarios");
  return { ok: !e2, error: mensajeError(e2) };
}

export async function actualizarUsuario(id: string, cambios: { rol?: "administrador" | "encargado" | "sala"; activo?: boolean; nombre?: string }): Promise<R> {
  if (!(await exigirAdmin())) return { ok: false, error: "Solo el administrador gestiona usuarios." };
  const sesion = await getSesion();
  if (id === sesion.id && (cambios.activo === false || (cambios.rol && cambios.rol !== "administrador"))) {
    return { ok: false, error: "No puedes quitarte a ti mismo el acceso de administrador." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("usuario").update(cambios).eq("id", id);
  if (!error && cambios.activo === false) {
    // Cierra sus sesiones abiertas.
    await createAdminClient().auth.admin.signOut(id).catch(() => {});
  }
  revalidatePath("/panel/usuarios");
  return { ok: !error, error: mensajeError(error) };
}

export async function restablecerClave(id: string, clave: string): Promise<R> {
  if (!(await exigirAdmin())) return { ok: false, error: "Solo el administrador gestiona usuarios." };
  if (clave.length < 10) return { ok: false, error: "La contraseña provisional debe tener al menos 10 caracteres." };
  const { error } = await createAdminClient().auth.admin.updateUserById(id, { password: clave });
  if (error) return { ok: false, error: error.message };
  const supabase = await createClient();
  await supabase.from("usuario").update({ debe_cambiar_clave: true }).eq("id", id);
  revalidatePath("/panel/usuarios");
  return { ok: true };
}
