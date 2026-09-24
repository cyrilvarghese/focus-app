import type { NextConfig } from "next";

// "/" is the dashboard (src/app/(pod)/page.tsx). Ashna's studio prototype is still served as-is at /studio.html.
const nextConfig: NextConfig = {
  // Development only: lets a phone on the same Wi-Fi open the dev server by its network address
  // (e.g. http://192.168.1.102:3000) to test joining a pod. Has no effect on production builds.
  allowedDevOrigins: ["192.168.*.*"],
};

export default nextConfig;
