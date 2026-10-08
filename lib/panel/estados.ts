// Estado de cada mesa en un instante, a partir de las reservas y bloqueos.
// Puro y sin dependencias: lo usan el mapa, la lista y las pruebas.

export type EstadoReserva =
  | "pendiente"
  | "confirmada"
  | "reconfirmada"
  | "sentada"
  | "finalizada"
  | "cancelada"
  | "no_presentada";

export type ReservaPanel = {
  id: string;
  nombre: string;
  telefono: string | null;
  correo: string | null;
  inicio: string;
  fin: string;
  comensales: number;
  duracion_min: number;
  estado: EstadoReserva;
  origen: "web" | "telefono" | "puerta";
  turno_nombre: string | null;
  ocasion: string | null;
  alergias: string | null;
  notas: string | null;
  notas_internas: string | null;
  tronas: number;
  silla_ruedas: boolean;
  sin_confirmar: boolean;
  forzada: boolean;
  zona_preferida_id: string | null;
  cliente_id: string | null;
  sentada_en: string | null;
  creada_en: string;
  mesas: { id: string; nombre: string }[];
  arroces: { nombre: string; raciones: number }[];
  plantones: number;
};

export type MesaPanel = {
  id: string;
  nombre: string;
  zona_id: string;
  distribucion_id: string;
  forma: "redonda" | "cuadrada" | "rectangular";
  x: number;
  y: number;
  giro: number;
  ancho: number;
  alto: number;
  sillas: number;
  capacidad_min: number;
  capacidad_max: number;
  reservable_online: boolean;
  tronas: number;
  plazas_silla_ruedas: number;
};

export type BloqueoPanel = { id: string; desde: string; hasta: string; mesa_id: string | null; zona_id: string | null; turno_nombre: string | null; motivo: string };

export type EstadoMesa = "libre" | "proxima" | "ocupada" | "terminando" | "pasada" | "bloqueada";

export const ACTIVAS: EstadoReserva[] = ["pendiente", "confirmada", "reconfirmada", "sentada"];

export const estadoMesaTexto: Record<EstadoMesa, string> = {
  libre: "Libre",
  proxima: "Reservada pronto",
  ocupada: "Ocupada",
  terminando: "A punto de terminar",
  pasada: "Pasada de tiempo",
  bloqueada: "Bloqueada",
};

/** Ventanas (en minutos) que usan los estados. */
export const VENTANA_PROXIMA = 60;
export const VENTANA_TERMINANDO = 15;

export type SituacionMesa = {
  estado: EstadoMesa;
  actual?: ReservaPanel; // sentada ahora
  siguiente?: ReservaPanel; // próxima reserva no sentada
  bloqueo?: BloqueoPanel;
};

const t = (s: string) => Date.parse(s);

export function situacionMesa(
  mesaId: string,
  instante: number,
  reservas: ReservaPanel[],
  bloqueos: BloqueoPanel[],
  esAhora: boolean,
): SituacionMesa {
  const bloqueo = bloqueos.find((b) => b.mesa_id === mesaId && t(b.desde) <= instante && instante < t(b.hasta));
  const deLaMesa = reservas.filter((r) => r.mesas.some((m) => m.id === mesaId) && ACTIVAS.includes(r.estado));

  // En el instante actual manda el estado real (sentada); en otro momento del
  // deslizador se proyecta con las horas previstas.
  const actual = esAhora
    ? deLaMesa.find((r) => r.estado === "sentada")
    : deLaMesa.find((r) => t(r.inicio) <= instante && instante < t(r.fin));
  const siguiente = deLaMesa
    .filter((r) => r.estado !== "sentada" && t(r.inicio) >= instante - 30 * 60_000 && r !== actual)
    .sort((a, b) => t(a.inicio) - t(b.inicio))[0];

  if (bloqueo && !actual) return { estado: "bloqueada", bloqueo, siguiente };
  if (actual) {
    const resto = t(actual.fin) - instante;
    const estado: EstadoMesa = resto < 0 ? "pasada" : resto <= VENTANA_TERMINANDO * 60_000 ? "terminando" : "ocupada";
    return { estado, actual, siguiente, bloqueo };
  }
  if (siguiente && t(siguiente.inicio) - instante <= VENTANA_PROXIMA * 60_000) {
    return { estado: "proxima", siguiente };
  }
  return { estado: "libre", siguiente };
}

export type Aviso = { tipo: "conflicto" | "retraso" | "alergia" | "sin_confirmar"; reserva: ReservaPanel; texto: string };

/** Avisos de sala: conflictos de mesa, retrasos, alergias y reservas sin confirmar. */
export function avisosServicio(
  reservas: ReservaPanel[],
  ahora: number,
  opciones: { cortesiaMin: number; avisoConflictoMin: number },
): Aviso[] {
  const avisos: Aviso[] = [];
  for (const r of reservas) {
    if (!ACTIVAS.includes(r.estado)) continue;
    // Mesa sentada que se pasa de tiempo con otra reserva detrás.
    if (r.estado === "sentada") {
      for (const m of r.mesas) {
        const detras = reservas.find(
          (o) =>
            o.id !== r.id &&
            o.estado !== "sentada" &&
            ACTIVAS.includes(o.estado) &&
            o.mesas.some((x) => x.id === m.id) &&
            t(o.inicio) >= t(r.inicio),
        );
        if (detras && t(detras.inicio) - ahora <= opciones.avisoConflictoMin * 60_000 && ahora + 15 * 60_000 > t(r.fin)) {
          avisos.push({ tipo: "conflicto", reserva: r, texto: `${m.nombre}: ${r.nombre} sigue sentada y ${detras.nombre} llega a las ${hora(detras.inicio)}` });
        }
      }
    }
    // Retraso por encima de la cortesía: llamar o liberar.
    if ((r.estado === "confirmada" || r.estado === "reconfirmada") && ahora - t(r.inicio) > opciones.cortesiaMin * 60_000) {
      avisos.push({ tipo: "retraso", reserva: r, texto: `${r.nombre} lleva ${Math.round((ahora - t(r.inicio)) / 60_000)} min de retraso: llamar o liberar` });
    }
    if (r.sin_confirmar && r.estado === "confirmada" && t(r.inicio) > ahora) {
      avisos.push({ tipo: "sin_confirmar", reserva: r, texto: `${r.nombre} no ha respondido al recordatorio: llamar` });
    }
  }
  return avisos;
}

export function hora(instante: string | number) {
  return new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit" }).format(new Date(instante));
}
