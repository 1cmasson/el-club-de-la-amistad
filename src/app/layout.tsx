import type { Metadata, Viewport } from "next";
import { Cinzel, Source_Sans_3 } from "next/font/google";
import { I18nProvider } from "@/i18n/I18nProvider";
import "./globals.css";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["500", "700", "900"],
  variable: "--font-display",
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Club de la Amistad para un Hialeah Mejor",
    template: "%s · Club de la Amistad",
  },
  description:
    "Neighbors walking Hialeah block by block, reporting graffiti, broken sidewalks and dark streetlights so the city can repair them.",
  applicationName: "Club de la Amistad",
  icons: { icon: "/assets/seal.png", apple: "/assets/seal.png" },
  openGraph: {
    title: "Club de la Amistad para un Hialeah Mejor",
    description:
      "Neighbors watching out for a more beautiful Hialeah. Report an issue, or volunteer for a route.",
    type: "website",
    locale: "en_US",
    alternateLocale: "es_US",
  },
};

export const viewport: Viewport = {
  themeColor: "#241509",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${cinzel.variable} ${sourceSans.variable}`}>
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
