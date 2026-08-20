import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root so Turbopack ignores lockfiles further up the tree.
  turbopack: { root: path.resolve(".") },
  images: {
    // The default is 4 hours. Nothing under public/assets changes without a
    // deploy, so a long TTL just stops Netlify re-optimizing the same files.
    // Note: adding a `quality` prop anywhere also requires listing the value in
    // `qualities` — Next 16 allowlists it, and the default allows only 75.
    minimumCacheTTL: 2678400, // 31 days
  },
};

export default nextConfig;
