// Resolve author names for tables PostgREST cannot embed user_profiles from.
//
// school_requests.requested_by and filiere_suggestions.suggested_by reference
// auth.users(id), NOT user_profiles(id). PostgREST only embeds across a real
// foreign key between the two tables, so `user_profiles(name)` on either of
// them fails with PGRST200 -- and PostgREST fails the WHOLE query, so the
// admin and moderator lists came back empty rather than just nameless.
//
// user_profiles.id is the same uuid as auth.users.id, so a second lookup gets
// the names. The result is shaped as { user_profiles: { name } } so the views
// that already read `row.user_profiles?.name` need no changes.

export async function attachUserNames(supabase, rows, idField) {
  const list = rows || []
  const ids = [...new Set(list.map(r => r && r[idField]).filter(Boolean))]
  if (!ids.length) return list.map(r => ({ ...r, user_profiles: null }))

  const { data, error } = await supabase.from('user_profiles').select('id, name').in('id', ids)
  if (error) return list.map(r => ({ ...r, user_profiles: null }))

  const byId = new Map((data || []).map(u => [u.id, u.name]))
  return list.map(r => ({
    ...r,
    user_profiles: r[idField] ? { name: byId.get(r[idField]) || null } : null,
  }))
}
