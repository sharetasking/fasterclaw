/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@fasterclaw/api-client', '@fasterclaw/shared', '@fasterclaw/db'],
};

export default nextConfig;
