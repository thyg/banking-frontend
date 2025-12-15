import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Tes autres options déjà présentes (s'il y en a) */

  // 👇 AJOUTE ÇA :
  eslint: {
    // Ignore les erreurs ESLint pendant le build
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignore les erreurs TypeScript pendant le build
    ignoreBuildErrors: true,
  },
};

export default nextConfig;