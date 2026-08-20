import type { MetadataRoute } from "next";

/*
 * Next emits the <link rel="manifest"> for this file on its own — do not also
 * set `manifest` in the root layout's metadata, or the tag renders twice.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Club de la Amistad por un Hialeah Mejor",
    short_name: "Hialeah Mejor",
    start_url: "/",
    display: "standalone",
    background_color: "#241509",
    theme_color: "#241509",
    lang: "es",
    icons: [
      { src: "/assets/favicon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/assets/favicon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/assets/favicon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
