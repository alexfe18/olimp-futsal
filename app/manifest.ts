import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Олімп Футзал",
    short_name: "Олімп Футзал",
    description:
      "Командний застосунок «Олімп Футзал» для тренувань, відвідуваності та сповіщень.",
    start_url: "/training",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f0f9ff",
    theme_color: "#020617",
    lang: "uk-UA",
    categories: ["sports", "lifestyle"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
