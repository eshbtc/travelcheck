"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import type { User as SupabaseUser, Session, AuthError } from '@supabase/supabase-js'

interface User {
  id: string
  email: string
  full_name: string
  is_active: boolean
  created_at: string
  role?: 'admin' | 'user'
  email_verified?: boolean
}

interface AuthContextType {
  user: User | null
  supabaseUser: SupabaseUser | null
  session: Session | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  loginWithAzure: () => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setSupabaseUser(session?.user ?? null)
      if (session?.user) {
        fetchOrCreateUser(session.user)
      } else {
        setUser(null)
        setIsLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      setSupabaseUser(session?.user ?? null)
      
      if (session?.user) {
        await fetchOrCreateUser(session.user)
        
        // Redirect to dashboard if we're on any auth route (except callback)
        const redirectFromAuth = () => {
          if (typeof window === 'undefined') return
          const currentPath = window.location.pathname.replace(/\/+$/, '')
          const isOnAuthRoute = currentPath === '/auth' || currentPath.startsWith('/auth/')
          const isOnCallback = currentPath.includes('/auth/callback')
          
          // Don't redirect if we're on the callback page - let it handle its own redirect
          if (isOnAuthRoute && !isOnCallback) {
            try {
              router.replace('/dashboard')
            } catch (_) {}
            setTimeout(() => {
              const stillOnAuth = window.location.pathname.replace(/\/+$/, '').startsWith('/auth') && 
                                !window.location.pathname.includes('/callback')
              if (stillOnAuth) {
                window.location.assign('/dashboard/')
              }
            }, 200)
          }
        }
        redirectFromAuth()
      } else {
        setUser(null)
      }
      
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [router])


  const fetchOrCreateUser = async (supabaseUser: SupabaseUser) => {
    try {
      // Check if user exists in our users table
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .single()

      if (existingUser && !fetchError) {
        // User exists, set user data
        setUser({
          id: existingUser.id,
          email: existingUser.email,
          full_name: existingUser.full_name || '',
          is_active: existingUser.is_active,
          created_at: existingUser.created_at,
          role: existingUser.role || 'user',
          email_verified: existingUser.email_verified
        })
      } else {
        // User doesn't exist, create new user
        const newUser = {
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          full_name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || '',
          is_active: true,
          created_at: new Date().toISOString(),
          email_verified: supabaseUser.email_confirmed_at ? true : false,
          role: 'user' as 'user' | 'admin'
        }
        
        const { error: createError } = await supabase
          .from('users')
          .insert([newUser])
        
        if (!createError) {
          setUser(newUser)
        } else {
          console.error('Error creating user:', createError)
        }
      }
    } catch (error) {
      console.error('Error fetching/creating user:', error)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) throw error
      
      // Auth state change will be handled by onAuthStateChange
    } catch (error: any) {
      throw new Error(error.message || 'Login failed')
    }
  }

  const register = async (email: string, password: string, fullName: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            name: fullName,
          },
        },
      })
      
      if (error) throw error
      
      // Auth state change will be handled by onAuthStateChange
    } catch (error: any) {
      throw new Error(error.message || 'Registration failed')
    }
  }

  const loginWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      
      if (error) throw error
    } catch (error: any) {
      throw new Error(error.message || 'Google login failed')
    }
  }

  const loginWithAzure = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: 'email profile openid',
        },
      })
      
      if (error) throw error
    } catch (error: any) {
      throw new Error(error.message || 'Azure login failed')
    }
  }

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) throw error
      
      router.push('/')
    } catch (error: any) {
      console.error('Logout error:', error)
    }
  }

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      
      if (error) throw error
    } catch (error: any) {
      throw new Error(error.message || 'Password reset failed')
    }
  }

  const value = {
    user,
    supabaseUser,
    session,
    isLoading,
    login,
    register,
    loginWithGoogle,
    loginWithAzure,
    logout,
    resetPassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
