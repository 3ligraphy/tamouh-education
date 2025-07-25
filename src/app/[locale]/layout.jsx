// app/layout.jsx

import "@/styles/globals.css";
import "@smastrom/react-rating/style.css";
import { notFound } from "next/navigation";
import { dir } from "i18next";
import { unstable_setRequestLocale } from "next-intl/server";
import { GeistSans } from "geist/font/sans";

import { Providers } from "../_components/providers";
import ScrollToTopButton from "../_components/scroll-top-button";
import { Navbar } from "../_components/navbar";
import Footer from "../_components/footer";

import { fontRakkas, fontRubik, fontArefRuqaa } from "@/config/fonts";
import { routing } from "@/i18n/routing";
import { auth } from "@/server/auth";

const languages = ["en", "ar"];

export const metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://tamouheducation.com"
  ),
  title: "Tamouh Education",
  description:
    "Empowering minds through quality education and personalized learning experiences",
  icons: [{ rel: "icon", url: "/logo.svg" }],
  keywords: [
    "education",
    "online learning",
    "courses",
    "arabic",
    "english",
    "tutoring",
  ],
  authors: [{ name: "Tamouh Education" }],
  openGraph: {
    title: "Tamouh Education",
    description:
      "Empowering minds through quality education and personalized learning experiences",
    url: "https://tamouheducation.com",
    siteName: "Tamouh Education",
    images: [{ url: "/logo.svg", width: 800, height: 600 }],
    locale: "ar_KW",
    type: "website",
  },
};

export async function generateStaticParams() {
  return languages.map((lng) => ({ locale: lng }));
}

export default async function RootLayout({ children, params }) {
  const { locale } = await params;

  // Validate that the incoming `locale` parameter is valid
  if (!routing.locales.includes(locale)) {
    notFound();
  }

  // Enable static rendering
  unstable_setRequestLocale(locale);

  const session = await auth();

  return (
    <html
      suppressHydrationWarning
      className={`${GeistSans.variable} ${fontRubik.variable} ${fontRakkas.variable} ${fontArefRuqaa.variable}`}
      dir={dir(locale)}
      lang={locale}
    >
      <head>
        <meta
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
          name="viewport"
        />
      </head>
      <body suppressHydrationWarning className="font-rubik">
        <Providers locale={locale} session={session}>
          <Navbar />
          {children}
          <Footer />
          <ScrollToTopButton className="relative z-10" />
        </Providers>
      </body>
    </html>
  );
}
