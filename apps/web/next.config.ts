import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    // Static agent files under /.well-known are public, like the routes there.
    return [
      {
        source: "/.well-known/agent-skills/:path*",
        headers: [{ key: "Access-Control-Allow-Origin", value: "*" }],
      },
    ];
  },
  async rewrites() {
    return {
      // Before the /docs/[slug] page, which would otherwise take "x.md" as a slug.
      beforeFiles: [{ source: "/docs/:slug.md", destination: "/docs/:slug/md" }],
    };
  },
};

export default nextConfig;
