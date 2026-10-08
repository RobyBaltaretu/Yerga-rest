"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
      reset: (id: string) => void;
    };
    onTurnstileListo?: () => void;
  }
}

/** Widget de Cloudflare Turnstile. Sin clave de sitio (desarrollo) no se muestra. */
export function Turnstile({ siteKey, onToken, idioma }: { siteKey: string; onToken: (t: string) => void; idioma: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!siteKey || !ref.current) return;
    let widget: string | undefined;
    const pintar = () => {
      if (!ref.current || !window.turnstile) return;
      widget = window.turnstile.render(ref.current, {
        sitekey: siteKey,
        language: idioma === "va" ? "ca" : idioma,
        appearance: "interaction-only",
        callback: onToken,
        "expired-callback": () => onToken(""),
      });
    };
    if (window.turnstile) pintar();
    else {
      window.onTurnstileListo = pintar;
      if (!document.getElementById("cf-turnstile")) {
        const s = document.createElement("script");
        s.id = "cf-turnstile";
        s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileListo";
        s.async = true;
        document.head.appendChild(s);
      }
    }
    return () => {
      if (widget && window.turnstile) window.turnstile.remove(widget);
    };
  }, [siteKey, onToken, idioma]);

  if (!siteKey) return null;
  return <div ref={ref} className="min-h-0" />;
}
