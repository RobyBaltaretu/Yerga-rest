import { z } from "zod";

// Estado del editor de distribuciones (lo que se guarda en distribucion.borrador).

const mesa = z.object({
  id: z.guid(),
  nombre: z.string().trim().min(1).max(12),
  forma: z.enum(["redonda", "cuadrada", "rectangular"]),
  x: z.number(),
  y: z.number(),
  giro: z.number(),
  ancho: z.number().positive(),
  alto: z.number().positive(),
  sillas: z.number().int().min(0).max(40),
  capacidad_min: z.number().int().min(1),
  capacidad_max: z.number().int().min(1),
  tronas: z.number().int().min(0),
  plazas_silla_ruedas: z.number().int().min(0),
  reservable_online: z.boolean(),
});

export const esquemaBorrador = z.object({
  mesas: z.array(mesa).max(200),
  combinaciones: z
    .array(
      z.object({
        id: z.guid(),
        nombre: z.string().max(40),
        mesas: z.array(z.guid()).min(2),
        capacidad_min: z.number().int().min(1),
        capacidad_max: z.number().int().min(1),
        reservable_online: z.boolean(),
      }),
    )
    .max(100),
  elementos: z
    .array(
      z.object({
        id: z.guid(),
        tipo: z.enum(["pared", "barra", "columna", "puerta", "ventana", "cocina", "planta"]),
        x: z.number(),
        y: z.number(),
        giro: z.number(),
        ancho: z.number().positive(),
        alto: z.number().positive(),
        etiqueta: z.string().max(40).nullable(),
      }),
    )
    .max(300),
});

export type Borrador = z.infer<typeof esquemaBorrador>;
