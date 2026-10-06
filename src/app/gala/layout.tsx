import type { Metadata, Viewport } from "next";

// The gala screen is for the projector, not for search engines or the nav.
export const metadata: Metadata = {
  title: "Gala",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#1c1108",
};

export default function GalaLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
