import {
  Noto_Kufi_Arabic,
  Rubik,
  Rakkas,
  Fira_Code as FontMono,
  Inter as FontSans,
  Aref_Ruqaa,
} from "next/font/google";

export const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const fontMono = FontMono({
  subsets: ["latin"],
  variable: "--font-mono",
});
export const fontKufiArabic = Noto_Kufi_Arabic({
  subsets: ["arabic"],
  variable: "--font-kufi-arabic",
});
export const fontRakkas = Rakkas({
  subsets: ["arabic"],
  variable: "--font-rakkas",
  weight: "400",
});

export const fontRubik = Rubik({
  subsets: ["latin"],
  variable: "--font-rubik",
});
export const fontArefRuqaa = Aref_Ruqaa({
  subsets: ["arabic"],
  variable: "--font-aref-ruqaa",
  weight: ["400", "700"],
});
