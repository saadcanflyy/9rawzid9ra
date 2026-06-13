import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'

const AuthContext = createContext(null)

// Read cached session from localStorage synchronously — zero-flash first render
function getInitialUser() {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('sb-') && key.includes('auth-token')) {
        const d = JSON.parse(localStorage.getItem(key))
        return d?.user || null
      }
    }
  } catch {}
  return null
}

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(getInitialUser)
  const [profile, setProfile] = useState(null)
  const userRef = useRef(user)

  const loadProfile = async (uid) => {
    const { data } = await supabase
      .from('user_profiles')
      .select('name, email, is_admin, is_moderator, is_fondateur, points, uploads_count')
      .eq('id', uid)
      .single()
    setProfile(data || null)
  }

  useEffect(() => {
    // Validate cached session — only UPDATE user, never clear it here.
    // Clearing is handled exclusively by onAuthStateChange(SIGNED_OUT) below.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        userRef.current = session.user
        loadProfile(session.user.id)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Only clear state on explicit sign-out — never clear on failed queries or
      // temporary session gaps (TOKEN_REFRESHED, INITIAL_SESSION, etc.)
      if (event === 'SIGNED_OUT') {
        setUser(null)
        userRef.current = null
        setProfile(null)
        return
      }
      if (session?.user) {
        const u = session.user
        setUser(u)
        userRef.current = u
        loadProfile(u.id)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, profile, userRef, setUser, setProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
