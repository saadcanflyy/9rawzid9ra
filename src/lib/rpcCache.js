// Session-lived cache for read-only RPCs (recommendations, related modules, missing
// resources) so switching tabs or revisiting a module doesn't refire the same call.
// Caches the promise itself, so concurrent callers with the same key share one request.
const cache = new Map();
const TTL_MS = 5 * 60 * 1000;

export function cachedRpc(supabase, name, args, ttlMs = TTL_MS) {
  const key = name + ':' + JSON.stringify(args || {});
  const hit = cache.get(key);
  if (hit && Date.now() - hit.time < ttlMs) return hit.promise;
  const promise = supabase.rpc(name, args);
  cache.set(key, { time: Date.now(), promise });
  return promise;
}
