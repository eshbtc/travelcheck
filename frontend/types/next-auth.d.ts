/**
 * NextAuth Type Augmentation
 *
 * Extends NextAuth types to include custom fields in Session and User.
 * This allows TypeScript to recognize the `id` field on session.user.
 */

import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  /**
   * Extends the built-in session.user type with custom fields
   */
  interface Session {
    user: {
      id: string
      email: string
      name: string | null
      image: string | null
    }
  }

  /**
   * Extends the User type returned from providers
   */
  interface User {
    id: string
    email: string
    name: string | null
    image: string | null
  }
}

declare module 'next-auth/jwt' {
  /**
   * Extends the JWT token with custom fields
   */
  interface JWT {
    id: string
    email: string
    name: string
    picture: string
    provider?: string
    accessToken?: string
    refreshToken?: string
    expiresAt?: number
  }
}
