import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import AzureADProvider from 'next-auth/providers/azure-ad'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

/**
 * NextAuth Configuration
 *
 * Provides authentication via Google and Azure AD OAuth providers.
 * Uses Prisma adapter for session/user persistence in Railway Postgres.
 * JWT strategy for stateless authentication with encrypted tokens.
 */
export const authOptions: NextAuthOptions = {
  adapter: {
    ...PrismaAdapter(prisma),
    createUser: async (data: any) => {
      return prisma.user.create({
        data: {
          id: crypto.randomUUID(),
          email: data.email,
          name: data.name,
          image: data.image,
          emailVerified: data.emailVerified,
          displayName: data.name,
          photoUrl: data.image,
          provider: 'oauth',
          role: 'user',
        },
      })
    },
    linkAccount: async (account: any) => {
      return prisma.account.create({
        data: {
          id: crypto.randomUUID(),
          userId: account.userId,
          type: account.type,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          refresh_token: account.refresh_token,
          access_token: account.access_token,
          expires_at: account.expires_at,
          token_type: account.token_type,
          scope: account.scope,
          id_token: account.id_token,
          session_state: account.session_state,
        },
      })
    },
  } as any,

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

    CredentialsProvider({
      id: 'credentials',
      name: 'Email and Password',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'user@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required')
        }

        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user || !user.passwordHash) {
          throw new Error('Invalid email or password')
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        )

        if (!isValidPassword) {
          throw new Error('Invalid email or password')
        }

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        })

        // Return user object for session (using NextAuth standard fields)
        return {
          id: user.id,
          email: user.email,
          name: user.name || user.displayName,
          image: user.image || user.photoUrl,
        }
      },
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  secret: process.env.NEXTAUTH_SECRET,

  callbacks: {
    async signIn({ user, account, profile }) {
      // Sync custom fields on sign-in to ensure consistency between NextAuth and custom fields
      if (user.email && account) {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
            select: { id: true, role: true },
          })

          if (existingUser) {
            await prisma.user.update({
              where: { id: existingUser.id },
              data: {
                // Sync NextAuth standard fields to custom fields for backward compatibility
                displayName: user.name || (profile as any)?.name,
                photoUrl: user.image || (profile as any)?.picture || (profile as any)?.avatar_url,
                provider: account.provider,
                lastLogin: new Date(),
                // Set default role only if not already set
                ...(existingUser && !existingUser.role && { role: 'user' }),
              },
            })
          }
        } catch (error) {
          console.error('Error syncing user fields on sign-in:', error)
          // Don't block sign-in if sync fails
        }
      }
      return true
    },

    async jwt({ token, account, profile, user }) {
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

      // Include user ID from initial sign-in
      if (user) {
        token.sub = user.id
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
