"use client";

export function BotonImprimir() {
  return (
    <button type="button" onClick={() => window.print()} className="min-h-11 rounded-full bg-black px-4 font-semibold text-white print:hidden">
      Imprimir
    </button>
  );
}
