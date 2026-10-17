import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      // Before the /docs/[slug] page, which would otherwise take "x.md" as a slug.
      beforeFiles: [{ source: "/docs/:slug.md", destination: "/docs/:slug/md" }],
    };
  },
};

export default nextConfig;
