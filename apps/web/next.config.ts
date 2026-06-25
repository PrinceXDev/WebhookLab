import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@webhooklab/shared'],
  eslint: {
    // Linting runs as a dedicated CI step (`pnpm eslint`), not during the
    // production build. The root flat config uses type-aware rules whose
    // `parserOptions.project` paths don't resolve under Vercel's build CWD,
    // which otherwise fails `next build` with exit 1.
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
