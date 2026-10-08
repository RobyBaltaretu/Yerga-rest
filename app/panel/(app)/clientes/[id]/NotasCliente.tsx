"use client";

import { useState, useTransition } from "react";
import { guardarNotasCliente } from "@/app/panel/acciones";
import { AreaTexto } from "@/components/ui/Campo";
import { Boton } from "@/components/ui/Boton";

export function NotasCliente({ id, notas, preferencias }: { id: string; notas: string; preferencias: string }) {
  const [n, setN] = useState(notas);
  const [p, setP] = useState(preferencias);
  const [ok, setOk] = useState(false);
  const [pendiente, startTransition] = useTransition();
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => setOk((await guardarNotasCliente(id, n, p)).ok));
      }}
    >
      <AreaTexto id="pref" etiqueta="Preferencias" value={p} onChange={(e) => { setP(e.target.value); setOk(false); }} />
      <AreaTexto id="notas" etiqueta="Notas internas" value={n} onChange={(e) => { setN(e.target.value); setOk(false); }} />
      <Boton type="submit" cargando={pendiente}>{ok ? "Guardado" : "Guardar"}</Boton>
    </form>
  );
}
