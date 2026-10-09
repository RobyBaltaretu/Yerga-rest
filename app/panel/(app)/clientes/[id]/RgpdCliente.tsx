"use client";

import { useState, useTransition } from "react";
import { getBrowserClient } from "@/lib/supabase/client";
import { Boton } from "@/components/ui/Boton";
import { useRecargar } from "@/components/panel/DatosPanel";

/** Derechos de acceso y supresión (RGPD). Solo el administrador; lo vuelve a comprobar la base. */
export function RgpdCliente({ id, nombre }: { id: string; nombre: string }) {
  const [confirmar, setConfirmar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();
  const recargar = useRecargar();

  const exportar = () =>
    startTransition(async () => {
      const { data, error } = await getBrowserClient().rpc("exportar_cliente", { p_cliente: id });
      if (error) return setError("No se ha podido exportar.");
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `datos-cliente-${id.slice(0, 8)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

  const anonimizar = () =>
    startTransition(async () => {
      const { error } = await getBrowserClient().rpc("anonimizar_cliente", { p_cliente: id });
      if (error) return setError("No se ha podido anonimizar.");
      setConfirmar(false);
      recargar();
    });

  return (
    <section aria-labelledby="t-rgpd" className="rounded-2xl bg-white p-4 ring-1 ring-tinta/10">
      <h2 id="t-rgpd" className="font-display text-xl">Protección de datos</h2>
      <p className="mt-1 text-niebla">A petición del cliente: entregarle sus datos o borrarlos.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Boton variante="secundario" cargando={pendiente && !confirmar} onClick={exportar}>Exportar sus datos</Boton>
        {!confirmar ? (
          <Boton variante="secundario" onClick={() => setConfirmar(true)}>Anonimizar…</Boton>
        ) : null}
      </div>
      {confirmar ? (
        <div role="alertdialog" aria-labelledby="t-anon" className="mt-3 rounded-xl bg-pimenton/10 p-3">
          <p id="t-anon" className="font-semibold text-pimenton-oscuro">
            ¿Borrar los datos personales de {nombre}? Se quitan de la ficha, sus reservas, la lista de espera, los correos y el registro. Las reservas se conservan sin datos para los informes. No se puede deshacer.
          </p>
          <div className="mt-2 flex gap-2">
            <Boton cargando={pendiente} onClick={anonimizar}>Sí, anonimizar</Boton>
            <Boton variante="secundario" onClick={() => setConfirmar(false)}>Cancelar</Boton>
          </div>
        </div>
      ) : null}
      {error ? <p role="alert" className="mt-2 font-semibold text-pimenton-oscuro">{error}</p> : null}
    </section>
  );
}
