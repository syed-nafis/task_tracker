import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable strict mode to avoid double-fetching in dev

  // Allow other devices on the LAN to load dev assets (Next blocks
  // cross-origin requests to /_next/* by default).
  allowedDevOrigins: ["192.168.11.33"],
};

export default nextConfig;
