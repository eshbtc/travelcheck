import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/router'
import { 
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  sendEmailVerification
} from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { analytics } from '../services/analytics'
import { crashlytics } from '../services/crashlytics'

interface User {
  id: string
  email: string
  full_name: string
  is_active: boolean
  created_at: string
}

interface AuthContextType {
  user: User | null
  firebaseUser: FirebaseUser | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  token: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Listen for Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser)
      
      if (firebaseUser) {
        // Get Firebase ID token
        const idToken = await firebaseUser.getIdToken()
        setToken(idToken)
        
        // Set user in analytics and crashlytics
        analytics.setUser(firebaseUser)
        crashlytics.setUser(firebaseUser)
        
        // Fetch or create user profile
        await fetchOrCreateUser(firebaseUser)
      } else {
        setUser(null)
        setToken(null)
        
        // Clear user from analytics and crashlytics
        crashlytics.clearUser()
      }
      
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const fetchOrCreateUser = async (firebaseUser: FirebaseUser) => {
    try {
      const userRef = doc(db, 'users', firebaseUser.uid)
      const userSnap = await getDoc(userRef)
      
      if (userSnap.exists()) {
        // User exists, fetch their data
        const userData = userSnap.data()
        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          full_name: userData.full_name || firebaseUser.displayName || '',
          is_active: userData.is_active || true,
          created_at: userData.created_at || new Date().toISOString()
        })
      } else {
        // User doesn't exist, create new user document
        const newUser = {
          email: firebaseUser.email || '',
          full_name: firebaseUser.displayName || '',
          is_active: true,
          created_at: new Date().toISOString(),
          email_verified: firebaseUser.emailVerified
        }
        
        await setDoc(userRef, newUser)
        setUser({
          id: firebaseUser.uid,
          email: newUser.email,
          full_name: newUser.full_name,
          is_active: newUser.is_active,
          created_at: newUser.created_at
        })
      }
    } catch (error) {
      console.error('Error fetching/creating user:', error)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password)
      
      // Track successful login
      analytics.logLogin('email')
      crashlytics.logAuthEvent('login', true, 'email')
      
      // Auth state change will be handled by onAuthStateChanged
    } catch (error: any) {
      // Track failed login
      analytics.logEvent('login_failed', { method: 'email', error: error.message })
      crashlytics.logAuthEvent('login', false, 'email')
      crashlytics.recordError(error, 'AuthContext.login')
      
      throw new Error(error.message || 'Login failed')
    }
  }

  const register = async (email: string, password: string, fullName: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      
      // Update the user's display name
      await updateProfile(userCredential.user, {
        displayName: fullName
      })
      
      // Send email verification
      await sendEmailVerification(userCredential.user)
      
      // Track successful registration
      analytics.logSignup('email')
      crashlytics.logAuthEvent('signup', true, 'email')
      
      // Auth state change will be handled by onAuthStateChanged
    } catch (error: any) {
      // Track failed registration
      analytics.logEvent('signup_failed', { method: 'email', error: error.message })
      crashlytics.logAuthEvent('signup', false, 'email')
      crashlytics.recordError(error, 'AuthContext.register')
      
      throw new Error(error.message || 'Registration failed')
    }
  }

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
      
      // Track successful Google login
      analytics.logLogin('google')
      crashlytics.logAuthEvent('login', true, 'google')
      
      // Auth state change will be handled by onAuthStateChanged
    } catch (error: any) {
      // Track failed Google login
      analytics.logEvent('login_failed', { method: 'google', error: error.message })
      crashlytics.logAuthEvent('login', false, 'google')
      crashlytics.recordError(error, 'AuthContext.loginWithGoogle')
      
      throw new Error(error.message || 'Google login failed')
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
      
      // Track logout
      analytics.logLogout()
      crashlytics.logAuthEvent('logout', true)
      
      router.push('/')
    } catch (error: any) {
      // Track logout error
      crashlytics.logAuthEvent('logout', false)
      crashlytics.recordError(error, 'AuthContext.logout')
      
      console.error('Logout error:', error)
    }
  }

  const value = {
    user,
    firebaseUser,
    isLoading,
    login,
    register,
    loginWithGoogle,
    logout,
    token,
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
