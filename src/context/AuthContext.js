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
  const [onlineCount, setOnlineCount] = useState(1)
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

  // Real "online now" presence — mounted once for the whole app, so it
  // doesn't flicker/rejoin on every page navigation.
  useEffect(() => {
    const key = Math.random().toString(36).slice(2)
    const channel = supabase.channel('site-presence', { config: { presence: { key } } })
    channel.on('presence', { event: 'sync' }, () => {
      setOnlineCount(Object.keys(channel.presenceState()).length || 1)
    })
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') await channel.track({ online_at: new Date().toISOString() })
    })
    return () => supabase.removeChannel(channel)
  }, [])

  return (
    <AuthContext.Provider value={{ user, profile, userRef, setUser, setProfile, onlineCount }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
