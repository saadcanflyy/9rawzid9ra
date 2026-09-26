import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabase'
import { clearRpcCache } from '../lib/rpcCache'

const AuthContext = createContext(null)

// Every profile column the app reads from context. Kept in one place so a page
// that needs a new field doesn't silently get `undefined`. Only columns granted
// to `authenticated` by 20260927000500_user_profiles_private_columns.sql.
const PROFILE_COLUMNS =
  'id, name, bio, is_admin, is_moderator, is_fondateur, points, uploads_count, ' +
  'university_id, faculty_id, filiere_id, current_semester, onboarded_at, wants_ai_notification'

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
  // Bumped whenever the profile is refetched. Pages with their own server data
  // (Home's feed, My modules…) depend on it so they reload without an F5.
  const [profileVersion, setProfileVersion] = useState(0)
  const userRef = useRef(user)

  const loadProfile = async (uid) => {
    const { data } = await supabase.from('user_profiles').select(PROFILE_COLUMNS).eq('id', uid).single()
    setProfile(data || null)
    return data || null
  }

  /**
   * Refetch the signed-in user's profile and tell the rest of the app to reload.
   *
   * Call this after anything that changes the profile server-side — onboarding,
   * settings save, follow/unfollow, senpai apply. Without it the context keeps
   * the values it read at sign-in and the UI only catches up on a manual
   * refresh, which is exactly the bug this fixes.
   *
   * The RPC cache is user-scoped (recommend_for_me, get_missing_resources,
   * get_home_feed's companions), so it has to be dropped at the same time or
   * the reload just re-serves the pre-change answers.
   */
  const refreshProfile = useCallback(async () => {
    const uid = userRef.current?.id
    if (!uid) return null
    clearRpcCache()
    const data = await loadProfile(uid)
    setProfileVersion(v => v + 1)
    return data
  }, [])

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
        clearRpcCache()
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
    <AuthContext.Provider value={{
      user, profile, userRef, setUser, setProfile, onlineCount,
      refreshProfile, profileVersion,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
