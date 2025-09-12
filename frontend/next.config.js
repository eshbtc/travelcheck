/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  trailingSlash: true,
  output: 'standalone',
  productionBrowserSourceMaps: true, // Enable source maps for Sentry
  generateBuildId: async () => {
    // Use git commit hash for release tracking
    const { execSync } = require('child_process')
    try {
      return execSync('git rev-parse HEAD').toString().trim()
    } catch {
      return Math.random().toString(36).substring(2, 15)
    }
  },
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
      // Global security headers (safe defaults)
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { 
            key: 'Content-Security-Policy', 
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' *.supabase.co *.googleapis.com",
              "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
              "font-src 'self' fonts.gstatic.com",
              "img-src 'self' data: blob: *.supabase.co *.googleapis.com",
              "connect-src 'self' *.supabase.co wss://*.supabase.co *.googleapis.com *.google.com *.microsoft.com *.office.com *.sentry.io",
              "frame-src 'self' *.google.com *.microsoft.com accounts.google.com login.microsoftonline.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "upgrade-insecure-requests"
            ].join('; ')
          },
        ],
      },
      // API-specific headers can be extended here if needed
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store' }
        ],
      },
      // Keep COOP/COEP for auth paths if you open popups/windows
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
