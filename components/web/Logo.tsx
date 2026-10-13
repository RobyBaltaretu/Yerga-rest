import Image from "next/image";

/**
 * Logotipo de Yerga para la web pública: el emblema y la palabra YERGA con su letra
 * romana. Cambia de tono con el modo claro u oscuro del sistema.
 */
export function LogoWeb({ className = "", grande = false }: { className?: string; grande?: boolean }) {
  const alto = grande ? "h-12" : "h-8";
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Image src="/marca/emblema.webp" alt="" width={360} height={213} sizes="96px" className={`${alto} w-auto dark:hidden`} />
      <Image src="/marca/emblema-claro.webp" alt="" width={360} height={213} sizes="96px" className={`${alto} hidden w-auto dark:block`} />
      <span className={`font-[family-name:var(--font-marcellus)] tracking-[0.14em] text-texto ${grande ? "text-3xl" : "text-xl"}`}>YERGA</span>
    </span>
  );
}

/** Logotipo completo (emblema, nombre y lema), para la casa y el pie. */
export function LogoCompletoWeb({ className = "", sizes = "220px" }: { className?: string; sizes?: string }) {
  return (
    <>
      <Image src="/marca/logo.webp" alt="Yerga · Arroces con alma" width={640} height={436} sizes={sizes} className={`${className} dark:hidden`} />
      <Image src="/marca/logo-claro.webp" alt="Yerga · Arroces con alma" width={640} height={436} sizes={sizes} className={`${className} hidden dark:block`} />
    </>
  );
}
