import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      // The studio screen (public/studio.html) is the app's main route.
      // beforeFiles runs before pages, so "/" serves it; the old cover page lives at /cover.
      beforeFiles: [{ source: "/", destination: "/studio.html" }],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
