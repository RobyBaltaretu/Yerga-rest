import Image from "next/image";

/** Logotipo de Yerga para la cabecera: el emblema y la palabra YERGA con su letra romana. */
export function LogoWeb({ className = "", grande = false }: { className?: string; grande?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Image src="/marca/emblema.webp" alt="" width={360} height={213} sizes="96px" className={`${grande ? "h-12" : "h-8"} w-auto`} />
      <span className={`font-romana tracking-[0.14em] text-texto ${grande ? "text-3xl" : "text-xl"}`}>YERGA</span>
    </span>
  );
}

/** Logotipo completo: emblema, nombre y «Arroces con alma». */
export function LogoCompletoWeb({ className = "", sizes = "220px", preload = false }: { className?: string; sizes?: string; preload?: boolean }) {
  return <Image src="/marca/logo.webp" alt="Yerga · Arroces con alma" width={640} height={436} sizes={sizes} preload={preload} className={className} />;
}
