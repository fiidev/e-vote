import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "files.catbox.moe",
      },
    ],
  },
  async rewrites() {
    const goBackendUrl = process.env.GO_BACKEND_URL || "http://127.0.0.1:8080";
    return [
      {
        source: "/api/v1/:path*",
        destination: `${goBackendUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
