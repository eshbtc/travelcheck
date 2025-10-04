import { DefaultSession, DefaultUser } from 'next-auth'
import { JWT, DefaultJWT } from 'next-auth/jwt'

declare module 'next-auth' {
  /**
   * Extends the built-in session types to include custom fields
   */
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      role?: string
      provider?: string
    }
  }

  /**
   * Extends the built-in user types to include custom fields
   */
  interface User extends DefaultUser {
    id: string
    role?: string
    provider?: string
    displayName?: string
    photoUrl?: string
    passwordHash?: string
    lastLogin?: Date
  }
}

declare module 'next-auth/jwt' {
  /**
   * Extends the built-in JWT types to include custom fields
   */
  interface JWT extends DefaultJWT {
    id?: string
    role?: string
    provider?: string
    accessToken?: string
    refreshToken?: string
    expiresAt?: number
  }
}
