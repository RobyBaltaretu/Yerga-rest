/**
 * Permisos por rol aplicados en la base de datos: cada rol intenta operaciones
 * llamando directamente a la API de Supabase (como haría alguien saltándose el
 * panel) y solo puede hacer lo que le corresponde.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const MESA_S1 = "00000000-0000-4000-c000-000000000101";
const USUARIO_SALA = "00000000-0000-4000-e000-000000000003";

type Cliente = SupabaseClient<Database>;

async function como(correo: string, clave: string): Promise<Cliente> {
  const c = createClient<Database>(url, anonKey, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email: correo, password: clave });
  if (error) throw error;
  return c;
}

let anon: Cliente;
let sala: Cliente;
let encargado: Cliente;
let admin: Cliente;

beforeAll(async () => {
  anon = createClient<Database>(url, anonKey, { auth: { persistSession: false } });
  [sala, encargado, admin] = await Promise.all([
    como("sala@yerga.test", "Yerga-Sala-2026"),
    como("encargado@yerga.test", "Yerga-Encargado-2026"),
    como("administrador@yerga.test", "Yerga-Admin-2026"),
  ]);
});

afterAll(async () => {
  await admin.from("bloqueo").delete().eq("motivo", "prueba-permisos");
  await admin.from("configuracion").update({ razon_social: "[Razón social S.L.]" }).eq("id", 1);
});

describe("Visitante anónimo", () => {
  it("lee la carta pero no reservas ni clientes", async () => {
    const platos = await anon.from("plato").select("slug").limit(1);
    expect(platos.data?.length).toBe(1);
    expect((await anon.from("reserva").select("id")).error).not.toBeNull();
    expect((await anon.from("cliente").select("id")).error).not.toBeNull();
  });

  it("no puede darse de alta como usuario del panel", async () => {
    const { error } = await anon.auth.signUp({ email: `intruso-${Date.now()}@example.com`, password: "Intruso-123456" });
    expect(error).not.toBeNull();
  });

  it("no puede usar el motor ni crear reservas directamente", async () => {
    expect((await anon.rpc("confirmar_reserva", { p_token: crypto.randomUUID(), p_datos: {} })).error).not.toBeNull();
    expect((await anon.rpc("crear_reserva_personal", { p_datos: {} })).error).not.toBeNull();
    expect((await anon.from("reserva").insert({ nombre: "x", inicio: new Date().toISOString(), fin: new Date(Date.now() + 1e6).toISOString(), comensales: 2, duracion_min: 60 })).error).not.toBeNull();
  });
});

describe("Rol sala", () => {
  it("ve y opera las reservas del día", async () => {
    const { data } = await sala.from("reserva").select("id").limit(5);
    expect(data?.length).toBeGreaterThan(0);
    const inicio = new Date(Date.now() + 40 * 86_400_000);
    const r = await sala.rpc("crear_reserva_personal", {
      p_datos: { inicio: inicio.toISOString(), comensales: 2, nombre: "Permisos sala", origen: "telefono", mesas: [MESA_S1] },
      p_forzar: true,
    });
    expect(r.error).toBeNull();
    const id = (r.data as { reserva_id: string }).reserva_id;
    expect((await sala.rpc("cambiar_estado", { p_reserva: id, p_estado: "cancelada" })).error).toBeNull();
  });

  it("no puede editar la distribución, la configuración, la carta ni los usuarios", async () => {
    const mesa = await sala.from("mesa").update({ capacidad_max: 12 }).eq("id", MESA_S1).select();
    expect(mesa.data ?? []).toHaveLength(0);
    const conf = await sala.from("configuracion").update({ margen_min: 0 }).eq("id", 1).select();
    expect(conf.data ?? []).toHaveLength(0);
    const plato = await sala.from("plato").update({ precio: 1 }).eq("slug", "paella-valenciana").select();
    expect(plato.data ?? []).toHaveLength(0);
    const usuario = await sala.from("usuario").update({ rol: "administrador" }).eq("id", USUARIO_SALA).select();
    expect(usuario.data ?? []).toHaveLength(0);
    const { data: yo } = await sala.from("usuario").select("rol").eq("id", USUARIO_SALA).single();
    expect(yo?.rol).toBe("sala");
  });

  it("puede bloquear una mesa concreta, pero no el local entero", async () => {
    const rango = `[${new Date(Date.now() + 50 * 86_400_000).toISOString()},${new Date(Date.now() + 50 * 86_400_000 + 3_600_000).toISOString()})`;
    expect((await sala.from("bloqueo").insert({ rango, mesa_id: MESA_S1, motivo: "prueba-permisos" })).error).toBeNull();
    expect((await sala.from("bloqueo").insert({ rango, motivo: "prueba-permisos" })).error).not.toBeNull();
  });

  it("no ve el registro de cambios ni puede borrar clientes", async () => {
    const { data } = await sala.from("registro_cambios").select("id").limit(1);
    expect(data ?? []).toHaveLength(0);
    const { data: clientes } = await sala.from("cliente").select("id").limit(1);
    const borrado = await sala.from("cliente").delete().eq("id", clientes![0].id).select();
    expect(borrado.data ?? []).toHaveLength(0);
  });
});

describe("Rol encargado", () => {
  it("edita la distribución y la configuración", async () => {
    const mesa = await encargado.from("mesa").update({ tronas: 1 }).eq("id", MESA_S1).select();
    expect(mesa.data).toHaveLength(1);
    await encargado.from("mesa").update({ tronas: 0 }).eq("id", MESA_S1);
    const conf = await encargado.from("configuracion").update({ margen_min: 15 }).eq("id", 1).select();
    expect(conf.data).toHaveLength(1);
  });

  it("no puede tocar usuarios ni datos legales", async () => {
    const legal = await encargado.from("configuracion").update({ razon_social: "Otra S.L." }).eq("id", 1);
    expect(legal.error?.message).toMatch(/administrador/);
    const usuario = await encargado.from("usuario").update({ rol: "administrador" }).eq("id", USUARIO_SALA).select();
    expect(usuario.data ?? []).toHaveLength(0);
  });

  it("ve el registro de cambios", async () => {
    const { error } = await encargado.from("registro_cambios").select("id").limit(1);
    expect(error).toBeNull();
  });
});

describe("Rol administrador", () => {
  it("cambia datos legales y usuarios", async () => {
    const legal = await admin.from("configuracion").update({ razon_social: "Yerga S.L." }).eq("id", 1).select();
    expect(legal.data).toHaveLength(1);
    const usuario = await admin.from("usuario").update({ nombre: "Recepción" }).eq("id", USUARIO_SALA).select();
    expect(usuario.data).toHaveLength(1);
  });

  it("cada cambio queda registrado con su usuario", async () => {
    const { data } = await admin
      .from("registro_cambios")
      .select("usuario_id, entidad")
      .eq("entidad", "configuracion")
      .order("creado_en", { ascending: false })
      .limit(1);
    expect(data?.[0].usuario_id).toBe("00000000-0000-4000-e000-000000000001");
  });
});
