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
  // Absolute og:image URLs are required — crawlers ignore relative ones, and
  // Next fails the build on a relative image with no metadataBase.
  metadataBase: new URL("https://porunhialeahmejor.com"),
  title: {
    default: "Club de la Amistad para un Hialeah Mejor",
    template: "%s · Club de la Amistad",
  },
  description:
    "Neighbors walking Hialeah block by block, reporting graffiti, broken sidewalks and dark streetlights so the city can repair them.",
  applicationName: "Club de la Amistad",
  icons: {
    icon: [
      { url: "/assets/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/assets/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/assets/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/assets/favicon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/assets/apple-touch-icon-180.png",
  },
  // The social cards are Spanish-only by design decision, so the preview copy
  // is Spanish too — it has to match the artwork a reader sees beside it.
  openGraph: {
    title: "Un Hialeah mejor, cuadra por cuadra",
    description:
      "Voluntarios que recorren Hialeah y reportan lo que la ciudad debe arreglar.",
    // No `url` here on purpose: it would be inherited, and /about would then
    // advertise itself as the homepage. Crawlers fall back to the fetched URL.
    type: "website",
    locale: "es_US",
    alternateLocale: ["en_US"],
    images: [{ url: "/assets/og-home.jpg", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
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
