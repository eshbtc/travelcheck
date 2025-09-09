/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  trailingSlash: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '',
    NEXT_PUBLIC_APP_NAME: 'Travel History Tracker',
  },
  images: {
    unoptimized: true,
    domains: ['localhost'],
  },
}

module.exports = nextConfig
