"use client";

import { useState, useTransition } from "react";
import { guardarNotasCliente } from "@/app/panel/acciones";
import { AreaTexto } from "@/components/ui/Campo";
import { Boton } from "@/components/ui/Boton";
import { useRecargar } from "@/components/panel/DatosPanel";

export function NotasCliente({ id, notas, preferencias, alergias }: { id: string; notas: string; preferencias: string; alergias: string }) {
  const [n, setN] = useState(notas);
  const [p, setP] = useState(preferencias);
  const [a, setA] = useState(alergias);
  const [ok, setOk] = useState(false);
  const [pendiente, startTransition] = useTransition();
  const recargar = useRecargar();
  const cambia = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setOk(false);
  };
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const r = await guardarNotasCliente(id, n, p, a);
          setOk(r.ok);
          if (r.ok) recargar();
        });
      }}
    >
      <AreaTexto id="alergias" etiqueta="Alergias e intolerancias" value={a} onChange={(e) => cambia(setA)(e.target.value)} />
      <AreaTexto id="pref" etiqueta="Preferencias" value={p} onChange={(e) => cambia(setP)(e.target.value)} />
      <AreaTexto id="notas" etiqueta="Notas internas" value={n} onChange={(e) => cambia(setN)(e.target.value)} />
      <Boton type="submit" cargando={pendiente}>{ok ? "Guardado" : "Guardar"}</Boton>
    </form>
  );
}
