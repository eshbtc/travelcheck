/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  trailingSlash: true,
  output: 'standalone',
  env: {
    // Supabase Configuration (replacing Firebase)
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    
    // API Configuration
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '/api',
    
    // Application
    NEXT_PUBLIC_APP_NAME: 'Travel History Tracker',
  },
  images: {
    unoptimized: true,
    domains: ['localhost'],
  },
  async redirects() {
    return [
      { source: '/email/gmail', destination: '/integrations', permanent: true },
      { source: '/email/office365', destination: '/integrations', permanent: true },
      { source: '/reports', destination: '/reports/generate', permanent: true },
      { source: '/travel/history', destination: '/travel/timeline', permanent: true },
      { source: '/upload/passport', destination: '/travel/evidence', permanent: true },
      { source: '/settings', destination: '/settings/profile', permanent: true },
      { source: '/admin/users', destination: '/dashboard', permanent: false },
      { source: '/admin/health', destination: '/dashboard', permanent: false },
      { source: '/auth/oauth-callback/gmail', destination: '/auth/callback?provider=gmail', permanent: true },
      { source: '/auth/oauth-callback/office365', destination: '/auth/callback?provider=office365', permanent: true },
    ]
  },
  async headers() {
    return [
      {
        source: '/auth/:path*',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' },
        ],
      },
    ]
  },
}

module.exports = nextConfig