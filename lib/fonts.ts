import { Allura, Geist, Inter, Marcellus } from "next/font/google";

// Marcellus: romana con remates de cincel, cercana al logotipo de Yerga.
export const marcellus = Marcellus({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-marcellus",
  display: "swap",
});

export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Letra manuscrita para la firma «Bienvenidos a su casa».
export const allura = Allura({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-allura",
  display: "swap",
});

// Web pública (rediseño de octubre de 2026): Geist, con tracking ajustado en títulos.
export const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});
