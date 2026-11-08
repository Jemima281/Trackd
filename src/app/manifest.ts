import type { MetadataRoute } from "next";

// Lets people install Shuin to their home screen as an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Shuin",
    short_name: "Shuin",
    description: "Collect, rank and compete on the media you consume.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0b10",
    theme_color: "#0b0b10",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
