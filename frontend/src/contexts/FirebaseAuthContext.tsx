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
  updateProfile
} from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { api } from '../services/api'

interface User {
  id: string
  email: string
  full_name: string
  is_active: boolean
  created_at: string
  firebase_uid: string
}

interface AuthContextType {
  user: User | null
  firebaseUser: FirebaseUser | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  logout: () => void
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
        api.defaults.headers.common['Authorization'] = `Bearer ${idToken}`
        
        // Fetch or create user profile
        await fetchOrCreateUser(firebaseUser)
      } else {
        setUser(null)
        setToken(null)
        delete api.defaults.headers.common['Authorization']
      }
      
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const fetchOrCreateUser = async (firebaseUser: FirebaseUser) => {
    try {
      // Check if user exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
      
      if (userDoc.exists()) {
        // User exists, fetch their data
        const userData = userDoc.data()
        setUser({
          id: firebaseUser.uid,
          email: userData.email,
          full_name: userData.full_name,
          is_active: userData.is_active,
          created_at: userData.created_at,
          firebase_uid: firebaseUser.uid
        })
      } else {
        // User doesn't exist, create new user document
        const newUser = {
          email: firebaseUser.email,
          full_name: firebaseUser.displayName || 'User',
          is_active: true,
          created_at: new Date().toISOString(),
          firebase_uid: firebaseUser.uid
        }
        
        await setDoc(doc(db, 'users', firebaseUser.uid), newUser)
        setUser({
          id: firebaseUser.uid,
          ...newUser
        })
      }
    } catch (error) {
      console.error('Error fetching/creating user:', error)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password)
      router.push('/dashboard')
    } catch (error: any) {
      throw new Error(error.message)
    }
  }

  const register = async (email: string, password: string, fullName: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      
      // Update the user's display name
      await updateProfile(userCredential.user, {
        displayName: fullName
      })
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email: email,
        full_name: fullName,
        is_active: true,
        created_at: new Date().toISOString(),
        firebase_uid: userCredential.user.uid
      })
      
      router.push('/dashboard')
    } catch (error: any) {
      throw new Error(error.message)
    }
  }

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      
      // Check if user exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', result.user.uid))
      
      if (!userDoc.exists()) {
        // Create new user document
        await setDoc(doc(db, 'users', result.user.uid), {
          email: result.user.email,
          full_name: result.user.displayName || 'User',
          is_active: true,
          created_at: new Date().toISOString(),
          firebase_uid: result.user.uid
        })
      }
      
      router.push('/dashboard')
    } catch (error: any) {
      throw new Error(error.message)
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
      setUser(null)
      setFirebaseUser(null)
      setToken(null)
      delete api.defaults.headers.common['Authorization']
      router.push('/')
    } catch (error: any) {
      throw new Error(error.message)
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
