import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Transpile local workspace packages so Next.js can process their TypeScript source
  transpilePackages: [
    '@nexa/types',
    '@nexa/api-client',
    '@nexa/design-tokens',
    '@nexa/validation',
  ],

  // Recommended: strict mode for catching bugs early
  reactStrictMode: true,

  // Headers, rewrites, redirects — add as needed
};

export default nextConfig;
