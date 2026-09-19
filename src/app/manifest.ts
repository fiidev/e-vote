import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "E-Pilketos — Pemilihan Ketua OSIS",
    short_name: "E-Pilketos",
    description:
      "Platform e-voting digital modern untuk pemilihan ketua OSIS dan organisasi sekolah.",
    start_url: "/",
    display: "standalone",
    background_color: "#fffaf0",
    theme_color: "#082f49",
    icons: [
      {
        src: "/images/osis.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/images/osis.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
