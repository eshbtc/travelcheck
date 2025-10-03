import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import AzureADProvider from 'next-auth/providers/azure-ad'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * NextAuth Configuration
 *
 * Provides authentication via Google and Azure AD OAuth providers.
 * Uses Prisma adapter for session/user persistence in Railway Postgres.
 * JWT strategy for stateless authentication with encrypted tokens.
 */
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
          scope: [
            'openid',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/gmail.readonly',
          ].join(' '),
        },
      },
    }),

    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID || '',
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET || '',
      tenantId: process.env.AZURE_AD_TENANT_ID || '',
      authorization: {
        params: {
          scope: [
            'openid',
            'profile',
            'email',
            'offline_access',
            'https://graph.microsoft.com/Mail.Read',
          ].join(' '),
        },
      },
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  jwt: {
    secret: process.env.ENCRYPTION_KEY,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    async jwt({ token, account, profile }) {
      // Store OAuth tokens in JWT for API access
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at
        token.provider = account.provider
      }

      if (profile) {
        token.email = profile.email || ''
        token.name = profile.name || ''
        token.picture = (profile as any).picture || (profile as any).avatar_url
      }

      return token
    },

    async session({ session, token }) {
      // Expose necessary fields to client-side session
      if (session.user) {
        session.user.id = token.sub as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.image = token.picture as string
      }

      // Store OAuth provider info (but not sensitive tokens on client)
      (session as any).provider = token.provider

      return session
    },

    async redirect({ url, baseUrl }) {
      // Always redirect to dashboard after successful login
      if (url.startsWith('/')) return `${baseUrl}${url}`
      else if (new URL(url).origin === baseUrl) return url
      return `${baseUrl}/dashboard`
    },
  },

  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },

  debug: process.env.NODE_ENV === 'development',
}
