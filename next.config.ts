import type { NextConfig } from "next";

const isGitHubPagesBuild = process.env.GITHUB_PAGES === "1";

const nextConfig: NextConfig = {
  ...(isGitHubPagesBuild
    ? {
        output: "export" as const,
        basePath: "/internet-in-motion",
      }
    : {}),
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
