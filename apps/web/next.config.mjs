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
};
export default nextConfig;
