# Rotating the leaked `service_role` key

**Status**: not done. Everything below is for you to run in the dashboard — no
step here has been executed.

---

## 1. What leaked, and what it does not

The old `notify_notification_email()` trigger had the `service_role` JWT
written into its function body in plain text. That body sat in `pg_proc.prosrc`,
and `pg_proc` is readable by **PUBLIC** — so any signed-in user who thought to
run `select prosrc from pg_proc` could have walked off with a key that bypasses
every RLS policy you have. Treat it as leaked. Migration
`20260925000600_notify_email_vault.sql` moved the trigger to Vault and removed
the literal.

Two things are already true, and they make this much smaller than it sounds:

- **The key was never in git.** Every JWT in the full history decodes to
  `"role":"anon"`. The exposure was the database, not the repo.
- **No function body contains a key today.** Verified:
  ```sql
  select n.nspname||'.'||p.proname from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
   where n.nspname in ('public','extensions') and p.prosrc ~ 'eyJ[A-Za-z0-9_-]{10,}';
  -- 0 rows
  ```

So this is a rotation of a key that *may* have been copied, not an active
incident. Do it deliberately, not in a panic.

## 2. Everywhere the `service_role` key is used

I inventoried this rather than guessing. There is exactly **one always-on
consumer**:

| Consumer | How it reads the key | Breaks if the key dies? |
|---|---|---|
| Edge function `notify-email` | `SUPABASE_SERVICE_ROLE_KEY`, injected by the platform | **Yes** — notification emails stop |
| `scripts/delete-orphan-storage.mjs` | env var on your machine | No — you run it by hand |
| Database (Vault) | holds `supabase_anon_key` + `notify_email_webhook_secret` — **not** the service key | No |
| Vercel | no service key set; the frontend only ever uses the anon/publishable key | No |

The frontend's key is **hardcoded** in `src/supabase.js`, not an env var. That
does not matter for the service key, but it matters a lot for route B below.

## 3. Two routes — take route A

Your project already has **both** key systems switched on: a legacy `anon` JWT
*and* a publishable key `sb_publishable_w_T7…`. That means the new system is
available to you right now, which is what makes a zero-downtime rotation
possible.

### Route A — new secret key (recommended)

New-style keys (`sb_secret_…`) are independent credentials. **Several can be
valid at once**, so you create the new one, move the one consumer over, confirm
it works, and only then revoke the old one. Nothing is ever without a valid key,
so there is no window where the site is down.

### Route B — rotate the legacy JWT secret (avoid)

The legacy `anon` and `service_role` keys are both JWTs signed by the project's
JWT secret. Rotating that secret invalidates **both at once**, and also every
access token your users are currently holding. Concretely:

- The anon key changes → the hardcoded key in `src/supabase.js` is instantly
  wrong → **the whole site 401s until you edit that file and redeploy Vercel.**
- Every signed-in user is logged out.
- There is no overlap period. It is a hard cutover by design.

Only take route B if you specifically need to invalidate live user sessions —
i.e. if you believe someone is actively using a stolen token right now. You
don't; nothing in the logs suggests that.

---

## 4. Route A, step by step

Order matters: **add the new key everywhere before removing the old one.**

### Step 0 — deploy the code that can read either key (do this first)

Already committed, not yet deployed. It reads `SB_SECRET_KEY` if present and
otherwise falls back to the existing `SUPABASE_SERVICE_ROLE_KEY`, so deploying
it changes nothing today and makes every later step reversible by deleting one
secret.

```bash
npx supabase functions deploy notify-email --project-ref egqjyzuinoljadzxiwpb
```

Send yourself a notification (have someone DM you, or follow your account from a
second account) and confirm the email still arrives. If it does, the fallback
path works and you can proceed.

> Why a different variable name: Supabase reserves the `SUPABASE_` prefix for
> its own injected secrets and refuses to let you set one. A new key therefore
> cannot be delivered as `SUPABASE_SERVICE_ROLE_KEY`; it has to arrive under a
> name of your own, hence `SB_SECRET_KEY`.

### Step 1 — create the new secret key

Dashboard → **Project Settings → API Keys → Secret keys → Create new secret key**.
Name it `notify-email`. Copy the `sb_secret_…` value once — it is not shown again.

Do not paste it into this chat, a commit, a Vercel *public* variable, or the
function body. It is the same class of credential as the one you are replacing.

### Step 2 — give it to the edge function

Dashboard → **Edge Functions → Secrets** (or Project Settings → Edge Functions →
Secrets) → add:

```
SB_SECRET_KEY = sb_secret_…
```

Secrets apply on the next invocation; no redeploy needed. The function now
prefers the new key and ignores the legacy one.

### Step 3 — prove the new key is the one working

Trigger a notification again and confirm the email arrives. Then check the logs:

Dashboard → **Edge Functions → notify-email → Logs**. You want a `200`, and no
`getUserById error` / `Invalid API key` lines. If you see those, the key was
pasted wrong — **delete the `SB_SECRET_KEY` secret and you are instantly back on
the old key**, with no other change to undo.

### Step 4 — update your own machine

Wherever you keep it for `scripts/delete-orphan-storage.mjs`, switch to the new
name. The script reads `SB_SECRET_KEY` first and still accepts the old variable.

```bash
SB_SECRET_KEY=sb_secret_… node scripts/delete-orphan-storage.mjs   # dry run
```

### Step 5 — only now, revoke the leaked key

Wait until steps 3 and 4 have been green for **at least a day** — that is long
enough for the monthly and daily cron jobs and a normal spread of notifications
to have run against the new key.

Dashboard → **Project Settings → API Keys → Legacy API keys** → disable the
legacy `service_role` key.

Leave the legacy **`anon`** key alone. `src/supabase.js` still hardcodes it, so
disabling it takes the site down. Migrating the frontend to the publishable key
is a separate, unrelated job (see below).

### Step 6 — confirm the old key is dead

From your machine, with the **old** service_role key:

```bash
curl -s -o /dev/null -w '%{http_code}\n' \
  'https://egqjyzuinoljadzxiwpb.supabase.co/rest/v1/user_profiles?select=email&limit=1' \
  -H "apikey: <OLD_service_role_key>" -H "Authorization: Bearer <OLD_service_role_key>"
```

`401` is what you want. `200` means it is still live — recheck step 5.

---

## 5. Rollback

| Failed at | Undo |
|---|---|
| Step 0 | `npx supabase functions deploy notify-email` from the previous commit |
| Steps 1–4 | Delete the `SB_SECRET_KEY` secret. The function falls back to the legacy key on the next invocation. |
| Step 5 | Re-enable the legacy key in the same dashboard screen. |

There is no point of no return until step 5, and even that is reversible.

---

## 6. Separately: retire the legacy `anon` key too

Not urgent and not part of this rotation — the anon key is public by design and
leaking it costs you nothing. But once you are on new-style keys it is tidy to
finish the job: replace the hardcoded JWT in `src/supabase.js` with
`sb_publishable_w_T7eAK2G0CmOROQOmpxaQ_VfU66ET9`, deploy, confirm the site
works, then disable the legacy `anon` key. Do it on a preview deployment first.
While you are there, move it to `REACT_APP_SUPABASE_ANON_KEY` so the next change
is a Vercel setting instead of a commit.
