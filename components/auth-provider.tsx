"use client"

import { createContext, useContext, useEffect, useState, useCallback } from 'react'

type AuthUser = {
  id: string
  email: string
  name: string | null
  user_metadata: {
    display_name?: string | null
    name?: string | null
  }
}

type AuthSession = {
  provider: 'cognito'
} | null

type AuthContextType = {
  user: AuthUser | null
  session: AuthSession
  profile: { id: string; display_name: string | null } | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<AuthSession>(null)
  const [profile, setProfile] = useState<{ id: string; display_name: string | null } | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshProfile = useCallback(async () => {
    setLoading(true)
    const savedEmail = typeof window !== 'undefined' ? localStorage.getItem('operant_user_email') : null
    try {
      const response = await fetch('/api/auth/me', { cache: 'no-store' })
      if (!response.ok) {
        if (savedEmail) {
          const fallbackUser: AuthUser = {
            id: `user-${savedEmail}`,
            email: savedEmail,
            name: savedEmail.split('@')[0],
            user_metadata: { display_name: savedEmail.split('@')[0], name: savedEmail.split('@')[0] },
          }
          setUser(fallbackUser)
          setSession({ provider: 'cognito' })
          setProfile({ id: fallbackUser.id, display_name: fallbackUser.name })
        } else {
          setUser(null)
          setSession(null)
          setProfile(null)
        }
        return
      }

      const data = await response.json()
      if (data.user) {
        setUser(data.user)
        setSession({ provider: 'cognito' })
        setProfile(data.profile)
        if (typeof window !== 'undefined' && data.user.email) {
          localStorage.setItem('operant_user_email', data.user.email)
        }
      } else if (savedEmail) {
        const fallbackUser: AuthUser = {
          id: `user-${savedEmail}`,
          email: savedEmail,
          name: savedEmail.split('@')[0],
          user_metadata: { display_name: savedEmail.split('@')[0], name: savedEmail.split('@')[0] },
        }
        setUser(fallbackUser)
        setSession({ provider: 'cognito' })
        setProfile({ id: fallbackUser.id, display_name: fallbackUser.name })
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem('operant_user_email')
      if (savedEmail) {
        setUser({
          id: `user-${savedEmail}`,
          email: savedEmail,
          name: savedEmail.split('@')[0],
          user_metadata: { display_name: savedEmail.split('@')[0], name: savedEmail.split('@')[0] },
        })
        setSession({ provider: 'cognito' })
      }
    }
    refreshProfile()
  }, [refreshProfile])

  async function signOut() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('operant_user_email')
    }
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    setSession(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
