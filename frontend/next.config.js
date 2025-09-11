/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  trailingSlash: true,
  output: 'standalone',
  env: {
    // Firebase Configuration
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCz_VGAx0W2Xkbt3krHDKqma7EkmjlqmwE',
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCz_VGAx0W2Xkbt3krHDKqma7EkmjlqmwE',
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'travelcheck-app.web.app',
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'travelcheck-app',
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'travelcheck-app.firebasestorage.app',
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '981756606771',
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:981756606771:web:4b2bffe7f62d446561e646',
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-N265JCR2HG',
    
    // App Check
    NEXT_PUBLIC_RECAPTCHA_SITE_KEY: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '6LcM6sIrAAAAAOV54k9O85aKNfRVt96Dzhs2wRu4',
    
    // API Configuration
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://us-central1-travelcheck-app.cloudfunctions.net',
    
    // Application
    NEXT_PUBLIC_APP_NAME: 'Travel History Tracker',
    
    // Try popup-based auth instead of redirect
    NEXT_PUBLIC_AUTH_USE_REDIRECT: 'false',
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
