import type { Metadata } from "next";
import { LandingHero } from "@/features/voting/components/landing-hero";

export const metadata: Metadata = {
  title: "Beranda — Platform Pemilihan Ketua OSIS Digital",
  description:
    "Selamat datang di portal e-voting resmi. Salurkan hak suaramu secara aman, transparan, dan mudah untuk masa depan sekolah.",
};

export default function Home() {
  return <LandingHero />;
}
