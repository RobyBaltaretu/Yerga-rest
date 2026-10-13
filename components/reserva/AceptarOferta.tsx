"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { aceptarOfertaEspera } from "@/app/[locale]/reservar/acciones";

export function AceptarOferta({ token, telefono }: { token: string; telefono: string }) {
  const t = useTranslations("reserva.oferta");
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState(false);
  return (
    <div className="mt-6">
      <button
        type="button"
        disabled={pendiente}
        onClick={() =>
          startTransition(async () => {
            const r = await aceptarOfertaEspera(token);
            if (r.ok && r.codigo) router.push(`/reservar/gestion/${r.codigo}`);
            else if (r.motivo === "caducada") router.refresh();
            else setError(true);
          })
        }
        className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-texto px-6 text-base font-medium text-invertido shadow-tarjeta transition-[background-color,transform] duration-150 hover:bg-texto/88 active:scale-[0.98] disabled:opacity-70"
      >
        {pendiente ? t("aceptando") : t("aceptar")}
      </button>
      {error ? <p role="alert" className="mt-3 text-sm font-semibold text-pimenton-oscuro">{t("error", { telefono })}</p> : null}
    </div>
  );
}
