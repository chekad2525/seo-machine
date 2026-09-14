import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.join(currentDirectory, '../..');

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracingRoot: repositoryRoot,
    serverComponentsExternalPackages: ['@seo-machine/db'],
  },
  async headers() {
    const securityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    ];
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/sign-in/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, follow, noarchive, nosnippet, noimageindex' }] },
      ...['/onboarding/:path*', '/dashboard/:path*', '/analytics/:path*', '/keywords/:path*', '/api/:path*'].map((source) => ({ source, headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive, nosnippet, noimageindex' }] })),
    ];
  },
};
export default nextConfig;
