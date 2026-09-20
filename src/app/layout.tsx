import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import { ToastProvider } from "@/components/ui/toast-provider";
import { cn } from "@/lib/cn";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const bricolage = localFont({
  src: [
    {
      path: "./fonts/bricolage-grotesque-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/bricolage-grotesque-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-heading",
  display: "swap",
});

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://e-vote.fiidev.my.id";

export const viewport: Viewport = {
  themeColor: "#082f49",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "E-Pilketos — Pemilihan Ketua OSIS Digital",
    template: "%s | E-Pilketos",
  },
  description:
    "Platform voting digital modern, aman, transparan, dan cepat untuk pemilihan ketua OSIS, MPK, dan organisasi sekolah.",
  keywords: [
    "e-voting",
    "pilketos",
    "pemilihan ketua osis",
    "voting digital",
    "e-vote",
    "osis",
    "sekolah",
    "smk telkom",
  ],
  authors: [{ name: "Fiidev", url: "https://fiidev.my.id" }],
  creator: "Fiidev",
  publisher: "SMK Telkom Malang",
  icons: {
    icon: "/images/osis.png",
    apple: "/images/osis.png",
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: APP_URL,
    siteName: "E-Pilketos",
    title: "E-Pilketos — Pemilihan Ketua OSIS Digital",
    description:
      "Platform voting digital modern, aman, dan transparan untuk pemilihan ketua OSIS, MPK, dan organisasi sekolah.",
    images: [
      {
        url: "/images/illustration-1-4003-206.png",
        width: 1200,
        height: 630,
        alt: "E-Pilketos — Suaramu Jadi Penentu",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "E-Pilketos — Pemilihan Ketua OSIS Digital",
    description:
      "Platform voting digital modern, aman, dan transparan untuk pemilihan ketua OSIS dan organisasi sekolah.",
    images: ["/images/illustration-1-4003-206.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "E-Pilketos",
  applicationCategory: "VotingApplication",
  operatingSystem: "All",
  url: APP_URL,
  description:
    "Platform e-voting digital modern untuk pemilihan ketua OSIS, MPK, dan organisasi sekolah.",
  author: {
    "@type": "Person",
    name: "Fiidev",
    url: "https://fiidev.my.id",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={cn(
        "h-full",
        "antialiased",
        "font-sans",
        inter.variable,
        bricolage.variable,
      )}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD requires structured JSON string for SEO crawlers
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ToastProvider />
        {children}
      </body>
    </html>
  );
}
