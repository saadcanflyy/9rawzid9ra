// Handling for a session that outlived its account.
//
// complete_onboarding() raises `stale_session` when auth.uid() is no longer in
// auth.users -- a JWT the browser still holds for a user that was deleted (and
// perhaps recreated) since. Before this existed, the request fell through to an
// opaque Postgres FK violation:
//
//   insert or update on table "module_bookmarks" violates foreign key
//   constraint "module_bookmarks_user_id_fkey"
//
// Nothing the user can act on. There is exactly one remedy -- sign in again --
// so the app does it for them instead of showing the error.

export const SESSION_EXPIRED_MESSAGE = 'Ta session a expiré, reconnecte-toi.'

/** True when a Supabase error is the server telling us the session is dead. */
export function isStaleSession(error) {
  const msg = error?.message || error?.hint || ''
  return typeof msg === 'string' && msg.includes('stale_session')
}

/**
 * Drop the dead session and send the user to /login with an explanation.
 *
 * signOut() can itself fail against a deleted user, so the local keys are
 * cleared regardless -- otherwise the bad token survives the redirect and the
 * next page load hits the same wall.
 *
 * Returns true when it handled the error, so callers can `if (await
 * handleStaleSession(...)) return` and skip their own error toast.
 */
export async function handleStaleSession(supabase, error) {
  if (!isStaleSession(error)) return false
  try { await supabase.auth.signOut() } catch { /* account is gone; carry on */ }
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('sb-') && key.includes('auth-token')) localStorage.removeItem(key)
    }
  } catch { /* private mode */ }
  // replace(), not push(): the dead session must not be reachable via Back.
  window.location.replace('/login?expired=1')
  return true
}
