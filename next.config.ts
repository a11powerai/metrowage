import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Caddy sets X-Forwarded-Proto and X-Real-IP correctly.
  // NextAuth picks up the public URL from NEXTAUTH_URL in .env — no extra config needed here.
};

export default nextConfig;
