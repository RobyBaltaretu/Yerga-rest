"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BookOpen,
  CalendarDays,
  ChefHat,
  ClipboardList,
  History,
  LayoutGrid,
  LineChart,
  LogOut,
  Menu,
  Plus,
  Settings,
  Timer,
  UserCog,
  Users,
  X,
} from "lucide-react";
import type { Rol } from "@/lib/panel/sesion";
import { cerrarSesion } from "@/app/panel/acciones-sesion";
import { LogoHorizontal } from "@/components/marca/Marca";
import { useSesion } from "./DatosPanel";

type Item = { href: string; texto: string; icono: typeof Menu; roles?: Rol[] };

const gestion: Rol[] = ["administrador", "encargado"];

export const itemsPanel: Item[] = [
  { href: "/panel", texto: "Servicio de hoy", icono: Timer },
  { href: "/panel/reservas", texto: "Reservas", icono: CalendarDays },
  { href: "/panel/espera", texto: "Lista de espera", icono: ClipboardList },
  { href: "/panel/clientes", texto: "Clientes", icono: Users },
  { href: "/panel/arroces", texto: "Arroces del día", icono: ChefHat },
  { href: "/panel/mapa", texto: "Mapa de mesas", icono: LayoutGrid, roles: gestion },
  { href: "/panel/carta", texto: "Carta y contenidos", icono: BookOpen, roles: gestion },
  { href: "/panel/configuracion", texto: "Configuración", icono: Settings, roles: gestion },
  { href: "/panel/informes", texto: "Informes", icono: LineChart, roles: gestion },
  { href: "/panel/registro", texto: "Registro de cambios", icono: History, roles: gestion },
  { href: "/panel/usuarios", texto: "Usuarios", icono: UserCog, roles: ["administrador"] },
];

const nombresRol: Record<Rol, string> = { administrador: "Administrador", encargado: "Encargado", sala: "Sala" };

export function NavPanel() {
  const { nombre, rol } = useSesion();
  const ruta = usePathname();
  const [abierto, setAbierto] = useState(false);
  const items = itemsPanel.filter((i) => !i.roles || i.roles.includes(rol));
  const activo = (href: string) => (href === "/panel" ? ruta === "/panel" : ruta.startsWith(href));

  const lista = (
    <nav aria-label="Panel" className="flex flex-1 flex-col gap-1">
      {items.map(({ href, texto, icono: Icono }) => (
        <Link
          key={href}
          href={href}
          onClick={() => setAbierto(false)}
          aria-current={activo(href) ? "page" : undefined}
          className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition ${activo(href) ? "bg-azafran text-brasa" : "text-arroz/80 hover:bg-white/10 hover:text-arroz"}`}
        >
          <Icono className="size-5 shrink-0" aria-hidden />
          {texto}
        </Link>
      ))}
    </nav>
  );

  const pie = (
    <div className="mt-4 border-t border-white/10 pt-4 text-sm text-arroz/70">
      <p className="font-semibold text-arroz">{nombre}</p>
      <p>{nombresRol[rol]}</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <Link href="/panel/clave" className="underline underline-offset-4">Contraseña</Link>
        <form action={cerrarSesion}>
          <button type="submit" className="inline-flex items-center gap-1 underline underline-offset-4">
            <LogOut className="size-4" aria-hidden /> Salir
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* Barra superior en móvil y tableta vertical */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-brasa px-3 text-arroz lg:hidden print:hidden">
        <button type="button" onClick={() => setAbierto(true)} aria-label="Abrir menú" className="grid size-11 place-items-center rounded-full hover:bg-white/10">
          <Menu className="size-6" />
        </button>
        <span className="font-display text-lg">Yerga · {items.find((i) => activo(i.href))?.texto ?? "Panel"}</span>
        <Link href="/panel/reservas/nueva" aria-label="Nueva reserva" className="grid size-11 place-items-center rounded-full bg-pimenton">
          <Plus className="size-6" />
        </Link>
      </header>

      {abierto ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <button type="button" className="absolute inset-0 bg-black/50" onClick={() => setAbierto(false)} aria-label="Cerrar menú" />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-brasa p-4">
            <div className="mb-4 flex items-center justify-between">
              <LogoHorizontal />
              <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar menú" className="grid size-11 place-items-center rounded-full text-arroz hover:bg-white/10">
                <X className="size-6" />
              </button>
            </div>
            {lista}
            {pie}
          </div>
        </div>
      ) : null}

      {/* Barra lateral fija en tableta horizontal y escritorio */}
      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 xl:w-64 flex-col bg-brasa p-4 lg:flex print:hidden">
        <div className="mb-6 flex items-center justify-between">
          <LogoHorizontal className="[&_span]:text-xl" />
          <Link href="/panel/reservas/nueva" className="inline-flex min-h-10 items-center gap-1 rounded-full bg-pimenton px-3 text-sm font-semibold text-white">
            <Plus className="size-4" aria-hidden /> Nueva
          </Link>
        </div>
        {lista}
        {pie}
      </aside>
    </>
  );
}
