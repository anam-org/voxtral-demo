import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/embed",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://anam.ai https://*.anam.ai https://localhost:*",
          },
          {
            key: "X-Frame-Options",
            value: "ALLOW-FROM https://anam.ai",
          },
        ],
      },
      {
        // Block iframing for all other pages
        source: "/((?!embed).*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
