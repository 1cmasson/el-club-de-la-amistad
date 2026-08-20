import type { Metadata } from "next";

/*
 * `page.tsx` is a client component, which cannot export metadata — so the
 * contact card's own Open Graph card is declared here instead.
 */
export const metadata: Metadata = {
  title: "Edith Calvo",
  openGraph: {
    title: "Edith Calvo — Club de la Amistad",
    description: "Fundadora y presidenta. Hialeah, Florida. (786) 801-9879",
    url: "/edith",
    type: "profile",
    locale: "es_US",
    alternateLocale: ["en_US"],
    images: [{ url: "/assets/og-edith.jpg", width: 1200, height: 630 }],
  },
};

export default function EdithLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
