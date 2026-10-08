import type { EstadoMesa } from "@/lib/panel/estados";

// Color e icono de cada estado de mesa: el icono evita depender solo del color.
export const estiloEstado: Record<EstadoMesa, { relleno: string; borde: string; texto: string; icono: string }> = {
  libre: { relleno: "#ffffff", borde: "#4f6a2c", texto: "#2b1f17", icono: "✓" },
  proxima: { relleno: "#f6dfb0", borde: "#9a5f0f", texto: "#2b1f17", icono: "→" },
  ocupada: { relleno: "#b23f1d", borde: "#8a2d12", texto: "#ffffff", icono: "●" },
  terminando: { relleno: "#e3a13a", borde: "#9a5f0f", texto: "#1b110c", icono: "◐" },
  pasada: { relleno: "#5a1a0a", borde: "#1b110c", texto: "#ffffff", icono: "!" },
  bloqueada: { relleno: "#d9d4ce", borde: "#6f6259", texto: "#2b1f17", icono: "✕" },
};
