/**
 * Pruebas del motor de disponibilidad (funciones de PostgreSQL), una por regla de
 * la tabla «Reglas de disponibilidad» y las garantías contra la sobreventa.
 * Se ejecutan contra Supabase local; cada prueba vive en una transacción que se
 * deshace, salvo la de concurrencia, que limpia lo que confirma.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client } from "pg";
import {
  MESA,
  ZONA,
  connect,
  datosCliente,
  enTransaccion,
  horas,
  instante,
  proximaFecha,
  rpc,
} from "@/tests/db";

let db: Client;
let sabado: string; // comida y cena
let martes: string; // solo comida

beforeAll(async () => {
  db = await connect();
  sabado = await proximaFecha(db, 6);
  martes = await proximaFecha(db, 2);
});

afterAll(async () => {
  await db.end();
});

type Resultado = { ok: boolean; motivo?: string; token?: string; mesas?: string[]; reserva_id?: string; alternativas?: { hora: string }[] };

let telefono = 600000000;

async function retener(c: Client, inicio: string, n: number, zona?: string) {
  return rpc<Resultado>(c, "public.retener_mesa($1::timestamptz, $2::int, $3::uuid)", [inicio, n, zona ?? null]);
}

async function confirmar(c: Client, token: string | null, inicio: string, n: number, extra: Record<string, unknown> = {}) {
  telefono += 1;
  return rpc<Resultado>(c, "public.confirmar_reserva($1::uuid, $2::jsonb)", [
    token,
    JSON.stringify(datosCliente({ inicio, comensales: n, telefono: String(telefono), ...extra })),
  ]);
}

/** Reserva online completa: retener y confirmar. */
async function reservar(c: Client, inicio: string, n: number, zona?: string) {
  const r = await retener(c, inicio, n, zona);
  if (!r.ok) return r;
  return confirmar(c, r.token!, inicio, n, { zona_id: zona });
}

async function mesasDe(c: Client, reserva: string): Promise<string[]> {
  const { rows } = await c.query<{ nombre: string }>(
    `select m.nombre from asignacion a join mesa m on m.id = a.mesa_id
      where a.reserva_id = $1 and a.activa order by m.nombre`,
    [reserva],
  );
  return rows.map((r) => r.nombre);
}

/** Quita el tope por franja para pruebas que llenan la sala a una misma hora. */
async function sinTope(c: Client) {
  await c.query("update turno set tope_franja = 999");
}

/** Ocupa mesas concretas con reservas del personal (sin reglas). */
async function ocupar(c: Client, inicio: string, nombres: string[], n = 2) {
  for (const nombre of nombres) {
    const r = await rpc<Resultado>(c, "public.crear_reserva_personal($1::jsonb, true)", [
      JSON.stringify({ inicio, comensales: n, nombre: `Ocupa ${nombre}`, origen: "telefono", mesas: [MESA(nombre)] }),
    ]);
    expect(r.ok, `ocupar ${nombre}: ${JSON.stringify(r)}`).toBe(true);
  }
}

const SALA = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10", "S11", "S12", "S13", "S14"];
const TERRAZA = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8"];

describe("Reglas de disponibilidad", () => {
  it("intervalo entre horas: cada 15 min desde el inicio del turno hasta la última hora", () =>
    enTransaccion(db, async (c) => {
      const hs = await horas(c, sabado, 2);
      const comida = hs.filter((h) => h.turno === "comida").map((h) => h.hora);
      const cena = hs.filter((h) => h.turno === "cena").map((h) => h.hora);
      expect(comida).toEqual(["13:00", "13:15", "13:30", "13:45", "14:00", "14:15", "14:30", "14:45", "15:00", "15:15", "15:30"]);
      expect(cena[0]).toBe("20:30");
      expect(cena.at(-1)).toBe("22:30");
      // El martes no hay cena; el lunes está cerrado.
      expect((await horas(c, martes, 2)).every((h) => h.turno === "comida")).toBe(true);
      const lunes = await proximaFecha(c, 1);
      expect(await horas(c, lunes, 2)).toHaveLength(0);
    }));

  it("última hora reservable: 15:30 en comida y 22:30 en cena", () =>
    enTransaccion(db, async (c) => {
      const hs = await horas(c, sabado, 4);
      expect(hs.some((h) => h.hora > "15:30" && h.turno === "comida")).toBe(false);
      expect(hs.some((h) => h.hora > "22:30")).toBe(false);
      const r = await retener(c, await instante(c, sabado, "15:45"), 2);
      expect(r.ok).toBe(false);
    }));

  it("duración de la estancia: 105 min hasta 4 personas y 135 desde 5", () =>
    enTransaccion(db, async (c) => {
      const inicio = await instante(c, sabado, "13:00");
      const a = await reservar(c, inicio, 4);
      const b = await reservar(c, inicio, 5);
      const { rows } = await c.query<{ comensales: number; duracion_min: number; minutos: number }>(
        `select comensales, duracion_min, extract(epoch from fin - inicio) / 60 as minutos
           from reserva where id = any($1::uuid[]) order by comensales`,
        [[a.reserva_id, b.reserva_id]],
      );
      expect(rows.map((r) => [r.comensales, r.duracion_min, Number(r.minutos)])).toEqual([
        [4, 105, 105],
        [5, 135, 135],
      ]);
    }));

  it("margen entre reservas: la mesa queda bloqueada estancia + 15 min", () =>
    enTransaccion(db, async (c) => {
      const inicio = await instante(c, sabado, "13:00");
      await ocupar(c, inicio, ["S1"]);
      const libre = async (hora: string) => {
        const desde = await instante(c, sabado, hora);
        const { rows } = await c.query<{ libre: boolean }>(
          `select public.mesa_libre($1::uuid, tstzrange($2::timestamptz, $2::timestamptz + interval '120 minutes'),
                                    tstzrange($2::timestamptz, $2::timestamptz + interval '105 minutes')) libre`,
          [MESA("S1"), desde],
        );
        return rows[0].libre;
      };
      // 13:00 + 105 min = 14:45; + 15 min de margen = 15:00.
      expect(await libre("14:45")).toBe(false);
      expect(await libre("15:00")).toBe(true);
    }));

  it("encaje de capacidad: la mesa más pequeña que sirva; una de 6 no va a 2 si hay otra", () =>
    enTransaccion(db, async (c) => {
      await sinTope(c);
      const inicio = await instante(c, sabado, "13:00");
      const primera = await reservar(c, inicio, 2, ZONA.sala);
      const SALA_USADAS = await mesasDe(c, primera.reserva_id!);
      expect(SALA_USADAS[0]).toMatch(/^S[1-6]$/);
      // Sin mesas de 2 libres en sala, la siguiente pareja va a una de 4, nunca a una de 6.
      await ocupar(c, inicio, ["S1", "S2", "S3", "S4", "S5", "S6"].filter((m) => !SALA_USADAS.includes(m)));
      const segunda = await reservar(c, inicio, 2, ZONA.sala);
      expect(await mesasDe(c, segunda.reserva_id!)).toEqual([expect.stringMatching(/^S(7|8|9|10|11|12)$/)]);
      // Con todas las de 2 y 4 ocupadas, ya sí puede ir a una de 6.
      const libres4 = ["S7", "S8", "S9", "S10", "S11", "S12"];
      const usadas = await mesasDe(c, segunda.reserva_id!);
      await ocupar(c, inicio, libres4.filter((m) => !usadas.includes(m)));
      const tercera = await reservar(c, inicio, 2, ZONA.sala);
      expect(await mesasDe(c, tercera.reserva_id!)).toEqual([expect.stringMatching(/^S1[34]$/)]);
    }));

  it("mesas combinables: solo las combinaciones definidas; 8 personas juntan dos de 4", () =>
    enTransaccion(db, async (c) => {
      const inicio = await instante(c, sabado, "14:00");
      const r = await reservar(c, inicio, 8);
      expect(r.ok).toBe(true);
      const mesas = await mesasDe(c, r.reserva_id!);
      expect([["S7", "S8"], ["S10", "S9"], ["S11", "S12"]]).toContainEqual(mesas);
      // 9 personas: no hay combinación definida que las siente.
      expect((await horas(c, sabado, 9)).filter((h) => h.disponible)).toHaveLength(0);
      expect(await rpc<number>(c, "public.capacidad_maxima_online()")).toBe(8);
    }));

  it("antelación: mínimo 2 horas y máximo 60 días", () =>
    enTransaccion(db, async (c) => {
      // Abrimos hoy un turno que cubre todo el día para poder probar el mínimo.
      await c.query(`update turno set inicio = '00:00', fin = '23:59', ultima_hora = '23:45'
                      where dia_semana = extract(dow from current_date) and nombre = 'comida'`);
      await c.query(`insert into turno (nombre, dia_semana, inicio, fin, ultima_hora)
                     select 'comida', extract(dow from current_date), '00:00', '23:59', '23:45'
                      where not exists (select 1 from turno where dia_semana = extract(dow from current_date) and nombre = 'comida')`);
      const { rows } = await c.query<{ primera: Date; ahora: Date }>(
        `select min(inicio) primera, now() ahora from horas_disponibles(current_date, 2)`,
      );
      if (rows[0].primera) {
        expect(rows[0].primera.getTime()).toBeGreaterThanOrEqual(rows[0].ahora.getTime() + 2 * 3600_000);
      }
      const { rows: lejos } = await c.query(`select * from horas_disponibles(current_date + 61, 2)`);
      expect(lejos).toHaveLength(0);
    }));

  it("tamaño máximo online: más de 10 personas no ve horas (solicitud de grupo)", () =>
    enTransaccion(db, async (c) => {
      expect(await horas(c, sabado, 11)).toHaveLength(0);
      const r = await retener(c, await instante(c, sabado, "13:00"), 11);
      expect(r.ok).toBe(false);
    }));

  it("tope por franja: máximo de comensales nuevos cada 15 min aunque haya mesas", () =>
    enTransaccion(db, async (c) => {
      await c.query(`update turno set tope_franja = 6 where dia_semana = 6 and nombre = 'comida'`);
      const t13 = await instante(c, sabado, "13:00");
      expect((await reservar(c, t13, 4)).ok).toBe(true);
      const hs = await horas(c, sabado, 4);
      expect(hs.find((h) => h.hora === "13:00")?.disponible).toBe(false);
      expect(hs.find((h) => h.hora === "13:15")?.disponible).toBe(true);
      // Dos personas aún caben en la franja de las 13:00 (4 + 2 = 6).
      expect((await horas(c, sabado, 2)).find((h) => h.hora === "13:00")?.disponible).toBe(true);
    }));

  it("cupo para la puerta: las mesas no reservables online nunca se dan por la web", () =>
    enTransaccion(db, async (c) => {
      await sinTope(c);
      const inicio = await instante(c, sabado, "13:00");
      await ocupar(c, inicio, ["T1", "T2", "T3", "T5", "T6", "T7"]);
      // La terraza solo tiene libres T4 y T8, que son para la puerta.
      const h = (await horas(c, sabado, 2)).find((x) => x.hora === "13:00")!;
      expect(h.zonas).toEqual([ZONA.sala]);
      // Un cliente sin reserva sí puede sentarse en ellas (se prefieren).
      const puerta = await rpc<Resultado>(c, "public.crear_reserva_personal($1::jsonb, false)", [
        JSON.stringify({ inicio, comensales: 2, origen: "puerta", zona_id: ZONA.terraza }),
      ]);
      expect(puerta.ok).toBe(true);
      expect(await mesasDe(c, puerta.reserva_id!)).toEqual(["T4"]);
    }));

  it("bloqueos: día, turno, zona y mesa", () =>
    enTransaccion(db, async (c) => {
      // Mesa: S1 bloqueada → la primera pareja va a S2.
      await c.query(
        `insert into bloqueo (rango, mesa_id, motivo)
         values (tstzrange(public.hora_local($1::date, '00:00'), public.hora_local($1::date + 1, '00:00')), $2, 'cojea')`,
        [sabado, MESA("S1")],
      );
      const r = await reservar(c, await instante(c, sabado, "13:00"), 2, ZONA.sala);
      expect(await mesasDe(c, r.reserva_id!)).toEqual(["S2"]);

      // Zona: terraza con lluvia.
      await c.query(
        `insert into bloqueo (rango, zona_id, motivo)
         values (tstzrange(public.hora_local($1::date, '00:00'), public.hora_local($1::date + 1, '00:00')), $2, 'lluvia')`,
        [sabado, ZONA.terraza],
      );
      const hs = await horas(c, sabado, 2);
      expect(hs.every((h) => !h.zonas.includes(ZONA.terraza))).toBe(true);

      // Turno: cena cerrada por evento privado.
      await c.query(
        `insert into bloqueo (rango, turno_nombre, motivo)
         values (tstzrange(public.hora_local($1::date, '00:00'), public.hora_local($1::date + 1, '00:00')), 'cena', 'evento')`,
        [sabado],
      );
      expect((await horas(c, sabado, 2)).some((h) => h.turno === "cena")).toBe(false);
      expect((await horas(c, sabado, 2)).some((h) => h.turno === "comida")).toBe(true);

      // Día: vacaciones.
      await c.query(
        `insert into bloqueo (rango, motivo)
         values (tstzrange(public.hora_local($1::date, '00:00'), public.hora_local($1::date + 1, '00:00')), 'vacaciones')`,
        [sabado],
      );
      expect(await horas(c, sabado, 2)).toHaveLength(0);
    }));
});

describe("Sin sobreventa", () => {
  it("con todas las mesas de un turno ocupadas, la web no ofrece ninguna hora de ese turno", () =>
    enTransaccion(db, async (c) => {
      // Ocupamos toda la comida del martes con reservas largas desde las 13:00.
      const inicio = await instante(c, martes, "13:00");
      for (const m of [...SALA, ...TERRAZA]) {
        const r = await rpc<Resultado>(c, "public.crear_reserva_personal($1::jsonb, true)", [
          JSON.stringify({ inicio, comensales: 2, nombre: `Lleno ${m}`, origen: "telefono", mesas: [MESA(m)], duracion_min: 240 }),
        ]);
        expect(r.ok).toBe(true);
      }
      const comida = (await horas(c, martes, 2)).filter((h) => h.turno === "comida");
      expect(comida.length).toBeGreaterThan(0);
      expect(comida.every((h) => !h.disponible)).toBe(true);
      const intento = await retener(c, await instante(c, martes, "14:00"), 2);
      expect(intento.ok).toBe(false);
    }));

  it("la restricción de la base de datos impide dos asignaciones solapadas en una mesa", () =>
    enTransaccion(db, async (c) => {
      const inicio = await instante(c, sabado, "13:00");
      await ocupar(c, inicio, ["S1"]);
      const { rows } = await c.query<{ id: string }>(
        `insert into reserva (nombre, inicio, fin, comensales, duracion_min)
         values ('Intrusa', $1, $1::timestamptz + interval '1 hour', 2, 60) returning id`,
        [inicio],
      );
      await expect(
        c.query(`insert into asignacion (reserva_id, mesa_id, intervalo)
                 values ($1, $2, tstzrange($3::timestamptz, $3::timestamptz + interval '1 hour'))`, [
          rows[0].id,
          MESA("S1"),
          inicio,
        ]),
      ).rejects.toThrow(/asignacion_sin_solape/);
    }));

  it("la retención guarda la mesa 5 minutos y caduca sola", () =>
    enTransaccion(db, async (c) => {
      await sinTope(c);
      const inicio = await instante(c, sabado, "13:00");
      // Solo queda libre S1 en sala para dos personas.
      await ocupar(c, inicio, SALA.filter((m) => m !== "S1"));
      const a = await retener(c, inicio, 2, ZONA.sala);
      expect(a.ok).toBe(true);
      expect(a.mesas).toEqual([MESA("S1")]);
      const b = await retener(c, inicio, 2, ZONA.sala);
      expect(b.ok).toBe(false);
      // Caducada la retención, la mesa vuelve a ofrecerse.
      await c.query(`update retencion set caduca_en = now() - interval '1 second' where token = $1`, [a.token]);
      const c2 = await retener(c, inicio, 2, ZONA.sala);
      expect(c2.ok).toBe(true);
      // Y la retención caducada puede confirmarse igualmente si la mesa sigue libre... aquí ya no.
      const tarde = await confirmar(c, a.token!, inicio, 2, { zona_id: ZONA.sala });
      expect(tarde.ok).toBe(false);
      expect(tarde.alternativas?.length).toBeGreaterThan(0);
    }));

  it("si la mesa se pierde entre retener y confirmar, se ofrecen las tres horas más cercanas", () =>
    enTransaccion(db, async (c) => {
      const inicio = await instante(c, sabado, "14:00");
      const r = await retener(c, inicio, 2);
      // El personal ocupa a la fuerza todo lo que queda a esa hora.
      await c.query("delete from retencion where token = $1", [r.token]);
      for (const m of [...SALA, ...TERRAZA]) {
        await c.query("savepoint s");
        try {
          await rpc(c, "public.crear_reserva_personal($1::jsonb, true)", [
            JSON.stringify({ inicio, comensales: 2, nombre: `F ${m}`, origen: "telefono", mesas: [MESA(m)] }),
          ]);
          await c.query("release savepoint s");
        } catch {
          await c.query("rollback to savepoint s");
        }
      }
      const res = await confirmar(c, r.token!, inicio, 2);
      expect(res.ok).toBe(false);
      expect(res.motivo).toBe("ocupada");
      expect(res.alternativas!.length).toBeLessThanOrEqual(3);
      expect(res.alternativas!.length).toBeGreaterThan(0);
    }));

  it("una mesa sentada que se alarga deja de ofrecerse", () =>
    enTransaccion(db, async (c) => {
      // S1 sin otras reservas (la semilla puede tener alguna hoy).
      await c.query("update asignacion set activa = false where mesa_id = $1", [MESA("S1")]);
      // Reserva sentada que debía acabar hace 10 minutos y sigue en la mesa.
      const { rows } = await c.query<{ id: string }>(
        `insert into reserva (nombre, inicio, fin, comensales, duracion_min, estado, origen)
         values ('Sobremesa', now() - interval '2 hours', now() - interval '10 minutes', 2, 110, 'sentada', 'puerta')
         returning id`,
      );
      await c.query(
        `insert into asignacion (reserva_id, mesa_id, intervalo)
         values ($1, $2, tstzrange(now() - interval '2 hours', now() + interval '5 minutes'))`,
        [rows[0].id, MESA("S1")],
      );
      const { rows: libre } = await c.query<{ ahora: boolean; luego: boolean }>(
        `select public.mesa_libre($1, tstzrange(now() + interval '10 minutes', now() + interval '2 hours'),
                                  tstzrange(now() + interval '10 minutes', now() + interval '2 hours')) ahora,
                public.mesa_libre($1, tstzrange(now() + interval '20 minutes', now() + interval '2 hours'),
                                  tstzrange(now() + interval '20 minutes', now() + interval '2 hours')) luego`,
        [MESA("S1")],
      );
      // Ocupada hasta ahora + 15 min de margen.
      expect(libre[0].ahora).toBe(false);
      expect(libre[0].luego).toBe(true);
      // Al liberarla, queda libre de inmediato.
      await rpc(c, "public.cambiar_estado($1::uuid, 'finalizada')", [rows[0].id]);
      const { rows: tras } = await c.query<{ libre: boolean }>(
        `select public.mesa_libre($1, tstzrange(now() + interval '1 minute', now() + interval '2 hours'),
                                  tstzrange(now() + interval '1 minute', now() + interval '2 hours')) libre`,
        [MESA("S1")],
      );
      expect(tras[0].libre).toBe(true);
    }));
});

describe("Concurrencia", () => {
  let fecha: string;
  let inicio: string;
  const creadas: string[] = [];

  beforeAll(async () => {
    fecha = await proximaFecha(db, 3, 40);
    inicio = await instante(db, fecha, "14:00");
    // Dejamos una única mesa libre para 2 a las 14:00 de ese miércoles.
    await db.query(
      `insert into bloqueo (rango, mesa_id, motivo)
       select tstzrange(public.hora_local($1::date, '00:00'), public.hora_local($1::date + 1, '00:00')), id, 'prueba-concurrencia'
         from mesa where id <> $2`,
      [fecha, MESA("S1")],
    );
  });

  afterAll(async () => {
    await db.query("delete from bloqueo where motivo = 'prueba-concurrencia'");
    if (creadas.length) await db.query("delete from reserva where id = any($1::uuid[])", [creadas]);
    await db.query("delete from cliente where telefono in ('+34611000001', '+34611000002')");
  });

  it("dos personas reservan la última mesa a la vez: solo una lo consigue y la otra recibe alternativas", async () => {
    const [a, b] = [await connect(), await connect()];
    try {
      await a.query("begin");
      await b.query("begin");
      // Ninguna tiene retención válida: ambas compiten dentro de la confirmación.
      const datos = (tel: string) =>
        JSON.stringify(datosCliente({ inicio, comensales: 2, telefono: tel, nombre: `Concurrente ${tel}` }));
      // La primera en llegar bloquea la mesa; la otra espera a que confirme y entonces
      // descubre que ya no está libre.
      const intento = (c: Client, tel: string) =>
        c
          .query<{ r: Resultado }>("select public.confirmar_reserva(gen_random_uuid(), $1::jsonb) r", [datos(tel)])
          .then(async ({ rows }) => {
            await c.query("commit");
            return rows[0].r;
          });
      const resultados = await Promise.all([intento(a, "611000001"), intento(b, "611000002")]);

      for (const r of resultados) if (r.reserva_id) creadas.push(r.reserva_id);
      expect(resultados.filter((r) => r.ok)).toHaveLength(1);
      const perdedora = resultados.find((r) => !r.ok)!;
      expect(perdedora.motivo).toMatch(/ocupada|no_disponible/);
      expect(Array.isArray(perdedora.alternativas)).toBe(true);

      const { rows } = await db.query<{ n: string }>(
        `select count(*) n from asignacion a join reserva r on r.id = a.reserva_id
          where a.mesa_id = $1 and a.activa and r.inicio = $2`,
        [MESA("S1"), inicio],
      );
      expect(Number(rows[0].n)).toBe(1);
    } finally {
      await a.end();
      await b.end();
    }
  });
});

describe("Gestión por código", () => {
  it("el cliente cancela hasta 3 horas antes y la mesa vuelve a ofrecerse", () =>
    enTransaccion(db, async (c) => {
      await sinTope(c);
      const inicio = await instante(c, sabado, "13:00");
      await ocupar(c, inicio, SALA.filter((m) => m !== "S1"));
      const r = await reservar(c, inicio, 2, ZONA.sala);
      expect((await horas(c, sabado, 2, ZONA.sala)).find((h) => h.hora === "13:00")?.disponible).toBe(false);
      const { rows } = await c.query<{ codigo_gestion: string }>("select codigo_gestion from reserva where id = $1", [r.reserva_id]);
      const cancel = await rpc<Resultado>(c, "public.cancelar_por_codigo($1)", [rows[0].codigo_gestion]);
      expect(cancel.ok).toBe(true);
      expect((await horas(c, sabado, 2, ZONA.sala)).find((h) => h.hora === "13:00")?.disponible).toBe(true);
    }));

  it("fuera de plazo no se puede cancelar online", () =>
    enTransaccion(db, async (c) => {
      const { rows } = await c.query<{ codigo_gestion: string }>(
        `insert into reserva (nombre, inicio, fin, comensales, duracion_min)
         values ('Tarde', now() + interval '2 hours', now() + interval '4 hours', 2, 120)
         returning codigo_gestion`,
      );
      const r = await rpc<Resultado>(c, "public.cancelar_por_codigo($1)", [rows[0].codigo_gestion]);
      expect(r).toMatchObject({ ok: false, motivo: "fuera_de_plazo" });
    }));

  it("el cliente cambia la hora: se retiene ignorando su propia reserva y se sustituye", () =>
    enTransaccion(db, async (c) => {
      const t13 = await instante(c, sabado, "13:00");
      const t14 = await instante(c, sabado, "14:00");
      const r = await reservar(c, t13, 2);
      const { rows } = await c.query<{ codigo_gestion: string }>("select codigo_gestion from reserva where id = $1", [r.reserva_id]);
      const ret = await rpc<Resultado>(c, "public.retener_mesa($1::timestamptz, 3, null, null, $2::uuid)", [t14, r.reserva_id]);
      expect(ret.ok).toBe(true);
      const mod = await rpc<Resultado>(c, "public.modificar_por_codigo($1, $2::uuid, $3::jsonb)", [
        rows[0].codigo_gestion,
        ret.token,
        JSON.stringify({ inicio: t14, comensales: 3 }),
      ]);
      expect(mod.ok).toBe(true);
      const { rows: tras } = await c.query<{ inicio: Date; comensales: number }>("select inicio, comensales from reserva where id = $1", [r.reserva_id]);
      expect(tras[0].inicio.toISOString()).toBe(new Date(t14).toISOString());
      expect(tras[0].comensales).toBe(3);
    }));
});

describe("Arroces y datos", () => {
  it("el arroz respeta su mínimo de comensales", () =>
    enTransaccion(db, async (c) => {
      const inicio = await instante(c, sabado, "13:30");
      const { rows } = await c.query<{ id: string }>("select id from plato where slug = 'paella-valenciana'");
      const ret = await retener(c, inicio, 2);
      const mal = await confirmar(c, ret.token!, inicio, 2, { arroces: [{ plato_id: rows[0].id, raciones: 1 }] });
      expect(mal).toMatchObject({ ok: false, motivo: "arroz_minimo" });
      const bien = await confirmar(c, ret.token!, inicio, 2, { arroces: [{ plato_id: rows[0].id, raciones: 2 }] });
      expect(bien.ok).toBe(true);
      const { rows: enc } = await c.query("select * from encargo_arroz where reserva_id = $1", [bien.reserva_id]);
      expect(enc).toHaveLength(1);
    }));

  it("sin casilla de privacidad no hay reserva", () =>
    enTransaccion(db, async (c) => {
      const inicio = await instante(c, sabado, "13:30");
      const ret = await retener(c, inicio, 2);
      const r = await confirmar(c, ret.token!, inicio, 2, { acepta_privacidad: false });
      expect(r).toMatchObject({ ok: false, motivo: "datos_invalidos" });
    }));

  it("un teléfono existente no sobrescribe el nombre del cliente", () =>
    enTransaccion(db, async (c) => {
      const inicio = await instante(c, sabado, "13:30");
      const r1 = await retener(c, inicio, 2);
      await rpc(c, "public.confirmar_reserva($1::uuid, $2::jsonb)", [r1.token, JSON.stringify(datosCliente({ inicio, comensales: 2, telefono: "699 000 111", nombre: "Ana" }))]);
      const r2 = await retener(c, inicio, 2);
      await rpc(c, "public.confirmar_reserva($1::uuid, $2::jsonb)", [r2.token, JSON.stringify(datosCliente({ inicio, comensales: 2, telefono: "+34699000111", nombre: "Pablo" }))]);
      const { rows } = await c.query("select nombre from cliente where telefono = '+34699000111'");
      expect(rows).toEqual([{ nombre: "Ana" }]);
      const { rows: res } = await c.query("select nombre from reserva where telefono = '+34699000111' order by nombre");
      expect(res.map((r) => r.nombre)).toEqual(["Ana", "Pablo"]);
    }));
});

describe("Distribuciones", () => {
  it("la distribución programada para una fecha manda sobre la predeterminada", () =>
    enTransaccion(db, async (c) => {
      const { rows } = await c.query<{ id: string }>(
        `insert into distribucion (zona_id, nombre, estado, publicada_en) values ($1, 'Banquete', 'publicada', now()) returning id`,
        [ZONA.sala],
      );
      await c.query(`insert into programacion_distribucion (distribucion_id, fecha) values ($1, $2)`, [rows[0].id, sabado]);
      const activa = await rpc<string>(c, "public.distribucion_activa($1::uuid, $2::date, 'comida')", [ZONA.sala, sabado]);
      expect(activa).toBe(rows[0].id);
      const otra = await rpc<string>(c, "public.distribucion_activa($1::uuid, $2::date, 'comida')", [ZONA.sala, martes]);
      expect(otra).toBe("00000000-0000-4000-b000-000000000001");
    }));

  it("reorganizar turno recoloca sin dejar a nadie fuera", () =>
    enTransaccion(db, async (c) => {
      const inicio = await instante(c, sabado, "13:00");
      // Dos parejas mal colocadas en mesas de 4.
      await ocupar(c, inicio, ["S7", "S9"]);
      const plan = await rpc<{ ok: boolean; cambios: number; plan: { despues: string[]; sin_sitio: boolean }[] }>(
        c,
        "public.reorganizar_turno($1::date, 'comida', $2::uuid, false)",
        [sabado, ZONA.sala],
      );
      expect(plan.ok).toBe(true);
      expect(plan.plan.every((p) => !p.sin_sitio)).toBe(true);
      expect(plan.plan.every((p) => p.despues[0].match(/^S[1-6]$/))).toBe(true);
      const aplicado = await rpc<{ ok: boolean }>(c, "public.reorganizar_turno($1::date, 'comida', $2::uuid, true)", [sabado, ZONA.sala]);
      expect(aplicado.ok).toBe(true);
    }));
});

describe("Lista de espera con plazo para aceptar", () => {
  type Oferta = { id: string; oferta_token: string; oferta_inicio: string; nombre: string } | null;

  async function apuntar(c: Client, nombre: string) {
    await c.query(
      `insert into lista_espera (nombre, telefono, correo, fecha, turno_nombre, comensales, creado_en)
       values ($1, '+34611111111', 'espera@example.com', $2::date, 'comida', 2, clock_timestamp())`,
      [nombre, sabado],
    );
  }

  /** Turno lleno salvo una mesa, reservada online; al cancelarla se libera. */
  async function ultimaMesaCancelada(c: Client) {
    await sinTope(c);
    const inicio = await instante(c, sabado, "13:00");
    await ocupar(c, inicio, [...SALA.filter((m) => m !== "S1"), ...TERRAZA]);
    const r = await reservar(c, inicio, 2, ZONA.sala);
    expect(r.ok).toBe(true);
    const { rows } = await c.query<{ codigo_gestion: string }>("select codigo_gestion from reserva where id = $1", [r.reserva_id]);
    expect((await rpc<Resultado>(c, "public.cancelar_por_codigo($1)", [rows[0].codigo_gestion])).ok).toBe(true);
    return { inicio, reserva: r.reserva_id! };
  }

  it("al liberarse la mesa se guarda para el primero que cabe y la acepta con un toque", () =>
    enTransaccion(db, async (c) => {
      await apuntar(c, "Primera Espera");
      const { inicio, reserva } = await ultimaMesaCancelada(c);
      const oferta = await rpc<Oferta>(c, "public.avisar_lista_espera($1::uuid)", [reserva]);
      expect(oferta?.nombre).toBe("Primera Espera");
      expect(new Date(oferta!.oferta_inicio).toISOString()).toBe(new Date(inicio).toISOString());
      // Mientras dura la oferta, la mesa no se ofrece a nadie más.
      expect((await horas(c, sabado, 2)).find((h) => h.hora === "13:00")?.disponible).toBe(false);
      const { rows: plazo } = await c.query<{ min: number }>("select round(extract(epoch from (oferta_hasta - now())) / 60)::int min from lista_espera where id = $1", [oferta!.id]);
      expect(plazo[0].min).toBe(15);

      const acepta = await rpc<Resultado & { codigo?: string }>(c, "public.aceptar_oferta_espera($1::uuid)", [oferta!.oferta_token]);
      expect(acepta.ok).toBe(true);
      expect(await mesasDe(c, acepta.reserva_id!)).toEqual(["S1"]);
      const { rows } = await c.query<{ estado: string }>("select estado from lista_espera where id = $1", [oferta!.id]);
      expect(rows[0].estado).toBe("atendido");
      // Aceptar dos veces no crea otra reserva.
      const otra = await rpc<{ ok: boolean; ya_aceptada?: boolean }>(c, "public.aceptar_oferta_espera($1::uuid)", [oferta!.oferta_token]);
      expect(otra).toMatchObject({ ok: true, ya_aceptada: true });
    }));

  it("si no la acepta en el plazo, caduca, la mesa se libera y pasa al siguiente", () =>
    enTransaccion(db, async (c) => {
      await apuntar(c, "Primera Espera");
      await apuntar(c, "Segunda Espera");
      const { reserva } = await ultimaMesaCancelada(c);
      const primera = await rpc<Oferta>(c, "public.avisar_lista_espera($1::uuid)", [reserva]);
      expect(primera?.nombre).toBe("Primera Espera");

      // Pasa el plazo.
      await c.query("update lista_espera set oferta_hasta = now() - interval '1 second' where id = $1", [primera!.id]);
      await c.query("update retencion set caduca_en = now() - interval '1 second' where token = $1", [primera!.oferta_token]);
      const liberadas = await rpc<string[]>(c, "public.caducar_ofertas_espera()");
      expect(liberadas).toEqual([reserva]);
      const tarde = await rpc<{ ok: boolean; motivo?: string }>(c, "public.aceptar_oferta_espera($1::uuid)", [primera!.oferta_token]);
      expect(tarde).toMatchObject({ ok: false, motivo: "caducada" });

      // La tarea periódica vuelve a ofrecer la mesa: ahora a la segunda persona.
      const segunda = await rpc<Oferta>(c, "public.avisar_lista_espera($1::uuid)", [reserva]);
      expect(segunda?.nombre).toBe("Segunda Espera");
      const { rows } = await c.query<{ estado: string }>("select estado from lista_espera where id = $1", [primera!.id]);
      expect(rows[0].estado).toBe("caducado");
    }));
});
