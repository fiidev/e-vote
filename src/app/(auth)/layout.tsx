import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Autentikasi Administrator",
  description: "Portal masuk administrator sistem pemilihan digital.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
