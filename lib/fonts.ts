import { Allura, Inter, Marcellus } from "next/font/google";

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
