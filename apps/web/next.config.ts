import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Go API URL is used server-side and via NEXT_PUBLIC_API_URL client-side.
  // No Next.js API proxy needed — Go API handles CORS directly.
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080",
  },
};

export default nextConfig;
