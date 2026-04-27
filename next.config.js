/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['birdeye.so', 'raw.githubusercontent.com', 'arweave.net'],
  },
};

module.exports = nextConfig;
