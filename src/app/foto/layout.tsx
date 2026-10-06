import type { Metadata } from "next";

// Reached from the QR code on the gala screen; not a page to be found by search.
export const metadata: Metadata = {
  title: "Comparte tu foto",
  description: "Envía tu foto a la pantalla de la Gala del Club de la Amistad.",
  robots: { index: false, follow: false },
};

export default function FotoLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
