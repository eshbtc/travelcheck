/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'export',
  trailingSlash: true,
  distDir: 'out',
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://travelcheck-backend-1052969081-nam5.a.run.app',
    NEXT_PUBLIC_APP_NAME: 'Travel History Tracker',
  },
  images: {
    unoptimized: true,
    domains: ['localhost', 'travelcheck-backend-1052969081-nam5.a.run.app'],
  },
}

module.exports = nextConfig
