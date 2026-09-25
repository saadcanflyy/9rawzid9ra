# 9rawZid9ra — Security & Reliability Audit

**Date**: 2026-09-27 · **Scope**: Supabase `egqjyzuinoljadzxiwpb` (eu-west-3, Postgres 17.6, ACTIVE_HEALTHY), React CRA on Vercel, edge function `notify-email`.
**Phase 1 — audit only. Nothing was changed.** Every write test below ran inside a transaction that was deliberately aborted, so no data was modified.

## How to read this

Each finding has **What / Where / Impact / Fix**. Severity is about *category and exploitability*, not just blast radius — an unauthenticated privilege escalation is Critical even when the thing it escalates to is modest.

**Verified** means I actually executed the attack path (as `anon` or as a normal signed-in user) and observed the result. Findings without "Verified" are configuration/code review.

| Severity | Count |
|---|---|
| Critical | 1 |
| High | 7 |
| Medium | 13 |
| Low | 7 |

---

## What is already solid

Worth stating plainly, because the foundations are good and most of the fix list is narrow:

- **RLS is enabled on all 47 public tables.** I tested a normal signed-in user against 14 sensitive tables: private messages, payments, other users' downloads, notifications, `moderation_log`, `search_log`, `reputation_events`, `points_log`, `senpai_contacts`, `senpai_profiles`, `ai_usage`, `senpai_reports` all returned **0 rows**. Only `user_profiles` leaked (finding H1).
- **Privilege escalation via tables is blocked.** 10 attempts as a normal user — self `is_admin=true`, self `points=999999`, editing another profile, inserting `points_log`, self-awarding a badge, verifying/deleting other people's documents, `admin_set_moderator`, `admin_adjust_reputation`, bypassing the senpai contact rate limit — **all 10 blocked**, by a mix of column-level grants, RLS and `is_admin()`/`is_staff()` checks.
- **No service_role key has ever been committed.** I decoded every JWT in the full git history: exactly one distinct key, `"role":"anon"`. The only tracked env file, `.env.production`, contains just `DISABLE_ESLINT_PLUGIN=true`.
- **The old hardcoded service key in the notify-email trigger is gone.** `fn_notify_email_webhook()` now reads both the anon key and the webhook secret from Supabase Vault.
- **No XSS sinks.** Zero `dangerouslySetInnerHTML` / `.innerHTML` in `src/`; user input goes through `stripHtml`; all `target="_blank"` links carry `noreferrer`.
- **The edge function is well built**: rejects every request unless `x-webhook-secret` matches, fails closed if the secret is unset, escapes HTML in user-controlled email content, reads the service key from env.

---

## CRITICAL

### C1 — `activate_senpai_profile()` is callable by anonymous users and has no auth check
- **Where**: `public.activate_senpai_profile(p_id integer)`, added in `supabase/migrations/20260927000200_senpai_filiere.sql`. `SECURITY DEFINER`, `proacl = PUBLIC_DEFAULT` (never revoked, so Postgres' default `EXECUTE TO PUBLIC` applies).
- **Impact**: **Verified** — calling it as `anon` succeeds. Anyone on the internet, with no account, can `POST /rest/v1/rpc/activate_senpai_profile {"p_id": N}` and flip any senpai application to `active`. That bypasses staff approval entirely, awards the `senpai_filiere` badge, and publishes that person (with their email, via `get_filiere_senpais`) to students. Iterating `p_id` 1..N activates every pending and rejected application.
- **Root cause**: I wrote it as an internal helper for `apply_to_be_senpai()`/`approve_senpai()` and granted execute only to those paths — but never `REVOKE`d the Postgres default of `EXECUTE TO PUBLIC`. The older migrations did this correctly (`revoke all on function … from public, anon`); the new one didn't.
- **Fix**: `revoke all on function public.activate_senpai_profile(integer) from public, anon, authenticated;` — it only needs to be reachable from the two `SECURITY DEFINER` callers, which don't need a grant. Add an `is_staff()` guard as defence in depth.

---

## HIGH

### H1 — Every signed-in user can read every user's email address
- **Where**: `user_profiles` policy `profiles readable by authenticated` = `USING (true)`, combined with a table-wide `GRANT SELECT` (no column list). `user_profiles.email` is populated for all 17 users.
- **Impact**: **Verified** — as a normal user I read **16 other users' emails** in one query. Also exposed: `ban_reason`, `banned_until`, `is_admin`, `is_moderator`, `is_premium`, `points`. One throwaway signup = full mailing list of the platform, plus a map of who the admins are (useful for targeted phishing) and private moderation notes.
- **Note**: this predates the senpai feature. The senpai RPCs deliberately return emails, but only for people who opted in as mentors — this finding is about *all* users.
- **Fix**: keep row access open (the app needs names/points/avatars) but restrict columns:
  `revoke select on public.user_profiles from authenticated;`
  `grant select (id, name, bio, university_id, faculty_id, filiere_id, current_semester, points, uploads_count, is_fondateur, is_moderator, is_admin, created_at, followers_count, following_count, posts_count) on public.user_profiles to authenticated;`
  Then add `get_my_profile()` (SECURITY DEFINER, `auth.uid()`-scoped) for the fields the owner needs, and keep admin email access inside the existing staff-only RPCs. Frontend touch points: `AuthContext.js` (selects `email`), `Navbar.js`, `Profile.js`, `Admin.js`.

### H2 — `reset_daily_ai_usage()` is callable by anonymous users
- **Where**: `public.reset_daily_ai_usage()`, `SECURITY DEFINER`, `PUBLIC_DEFAULT` ACL, **no fixed `search_path`**, no auth check.
- **Impact**: **Verified** — anon call succeeds. Resets the daily AI-usage counters for every user, so any paid/limited AI quota can be cleared on demand, for free, by anyone. Also an unauthenticated write amplifier (call it in a loop to generate DB load).
- **Fix**: `revoke all on function public.reset_daily_ai_usage() from public, anon, authenticated;` (it should be called by a scheduler only), and add `set search_path = public`.

### H3 — No security headers on the Vercel deployment
- **Where**: `vercel.json` contains only `buildCommand`/`outputDirectory`/`framework`. No `headers` block.
- **Impact**: no `Content-Security-Policy` (no defence-in-depth if an XSS ever lands), no `X-Frame-Options`/`frame-ancestors` (the site can be iframed → clickjacking on the upload/delete/ban buttons), no `Strict-Transport-Security`, no `Referrer-Policy` (full URLs leak to third parties), no `Permissions-Policy`.
- **Fix**: proposed `vercel.json` in [Appendix A](#appendix-a--proposed-verceljson) — CSP allow-list is scoped to Supabase REST/realtime/storage, Google Fonts and the CRA inline bootstrap, so it won't break the app.

### H4 — `react-router-dom` open-redirect / CSRF advisory (ships to the browser)
- **Where**: `package.json` → `react-router-dom`; advisory range `6.0.0 – 7.18.1`.
- **Impact**: open redirect via backslash in `<Link>`/`useNavigate` (CVE-2025-68470 bypass) and potential CSRF via document requests. This is one of the few audit hits that is actually *shipped to users* rather than build-time only.
- **Fix**: `npm i react-router-dom@latest`, then smoke-test routing (the app has 20 routes, several with params).

### H5 — No React error boundary anywhere
- **Where**: `grep` for `componentDidCatch|ErrorBoundary|getDerivedStateFromError` across `src/` → **zero matches**.
- **Impact**: any render-time exception in any component unmounts the whole SPA and leaves a blank white page — no message, no recovery, no way for the user to navigate away. This is exactly what would have happened to every uploader from the `RANKS is not defined` bug (see H7) before it was fixed.
- **Fix**: one `<ErrorBoundary>` in `App.js` wrapping `<Routes>`, rendering a `qz-card` with "Une erreur s'est produite" + a reload button, plus a per-route boundary so one broken page doesn't kill the navbar.

### H6 — No error monitoring in production
- **Where**: no `sentry`/`posthog` reference anywhere in `src/` or `package.json`.
- **Impact**: production exceptions, failed Supabase calls and white screens are completely invisible. You find out from students, or not at all. Directly relevant to the exam-period goal: a regression at 2am on results day is silent.
- **Fix**: `@sentry/react` with `tracesSampleRate: 0.1`, wired in `src/index.js`, plus `Sentry.captureException` in the error boundary. Add the Sentry Deno SDK to `notify-email`. Free tier (5k errors/mo) is plenty here.

### H7 — ESLint is disabled for production builds, so undefined-variable bugs ship
- **Where**: `.env.production` (tracked in git) sets `DISABLE_ESLINT_PLUGIN=true`.
- **Impact**: `npm run build` does no linting, and CRA/Babel don't resolve identifiers, so a reference to a deleted variable compiles clean and only explodes at runtime. **This already happened**: `Upload.js` referenced a `RANKS` constant that had been deleted, which would have thrown `ReferenceError` on the success screen of *every* successful upload. It passed `CI=true npm run build` with zero warnings and was only caught by reading the file. Combined with H5 (no error boundary), that's a white screen for every uploader.
- **Fix**: remove `DISABLE_ESLINT_PLUGIN=true`, fix the warnings it surfaces, and add `npx eslint src --max-warnings=0` as a CI step (or a `prebuild` script) so the build actually gates on it.

---

## MEDIUM

### M1 — Admin analytics RPCs are callable by anonymous users
`get_analytics_extra()`, `get_top_uploaders()`, `get_users_per_day()`, `get_docs_per_day()`, `get_top_modules_by_downloads()`, `get_top_uploaders_in_filiere()` are all `SECURITY DEFINER`, granted to PUBLIC, with no auth check. **Verified** as anon for the first three. Leaks: signup growth curve per day, total downloads, active uploader counts, and contributor names + points. No emails, but it's your business metrics served to anyone who knows the endpoint. **Fix**: add `if not is_staff() then raise exception 'forbidden' using errcode='42501'; end if;` and revoke from `anon`.

### M2 — `refresh_module_stats(integer)` callable by anonymous users
`SECURITY DEFINER`, PUBLIC ACL, no auth check, and it recomputes aggregates. **Verified** as anon. An unauthenticated attacker can loop it to burn database CPU — the cheapest DoS on the whole surface, and it hits the shared free-tier instance. **Fix**: revoke from `public, anon, authenticated` (it's called by triggers).

### M3 — `check_download_limit(uuid)` callable by anonymous users, mutable `search_path`
PUBLIC ACL, `SECURITY DEFINER`, **no `SET search_path`**. Lets anyone probe another user's download state, and the mutable search_path is the standard `SECURITY DEFINER` hardening gap. **Fix**: revoke from anon, add `set search_path = public`.

### M4 — 19 functions with mutable `search_path`
Advisor `function_search_path_mutable`: `notify_module_approved`, `notify_school_approved`, `update_comment_likes`, `check_duplicate_module`, `check_download_limit`, `get_analytics_extra`, `get_top_uploaders`, `reset_daily_ai_usage`, `get_top_uploaders_in_filiere`, `update_reply_count`, `fn_sync_helpful_count`, `fn_sync_senpai_helpful_count`, `get_users_per_day`, `get_docs_per_day`, `get_top_modules_by_downloads`, `mod_ban_user`, `admin_get_inbox`, `admin_get_thread`, `mod_send_message`. **Fix**: `alter function … set search_path = public` on each. Note `mod_ban_user` and `mod_send_message` are staff-privileged, so those matter most.

### M5 — Storage has no DELETE policy: "deleted" documents stay online forever
`storage.objects` has exactly two policies (INSERT, UPDATE) for the `documents` bucket — **no DELETE**. But `Profile.js` and `Admin.js` both call `supabase.storage.from('documents').remove([path])` when deleting a document. Those calls fail silently: the DB row disappears, the file does not. Because the bucket is **public**, the PDF remains downloadable by direct URL forever. That's a privacy problem (a student "deletes" a document with their name on it and it's still served) and unbounded storage growth. **Fix**: add a DELETE policy (owner via `foldername[2] = auth.uid()`, plus `is_staff()`), and check the return value of `.remove()` in the UI.

### M6 — Storage INSERT policy doesn't constrain the path
INSERT check is only `bucket_id = 'documents' AND auth.uid() IS NOT NULL` — any signed-in user can create objects under *another* user's folder prefix. UPDATE is correctly scoped to `foldername[2] = auth.uid()`. **Fix**: mirror the UPDATE condition in the INSERT check.

### M7 — Catalogue spam: unlimited inserts by any signed-in user
`universities`, `faculties`, `filieres`, `modules` all have `INSERT … WITH CHECK (true)` for `authenticated` (deliberate — students add missing schools). There is no rate limit, so one account can insert thousands of junk rows, which then pollute search, the onboarding pickers and `search_doc` rebuild triggers. **Fix**: a `BEFORE INSERT` trigger enforcing e.g. max 10 catalogue rows per user per day, and auto-flagging new rows for staff review.

### M8 — Missing server-side rate limits on abuse-prone actions
| Action | Server-side limit today |
|---|---|
| Senpai contact | ✅ 3/day per student + per-senpai weekly cap (in `log_senpai_contact`) |
| Download | ✅ one row per user/document/day (`record_download`) |
| Reputation events | ✅ `reputation_rules.daily_cap` |
| Senpai post | ⚠️ client-side only (`rateLimitMsg` in `SenpaiZone.js`) |
| Upload | ❌ none |
| Report / feedback | ❌ none (unique constraint only) |
| Follow | ❌ none |
| Search logging | ❌ none — `log_search` is writable per keystroke-debounce |
| Catalogue insert | ❌ none (M7) |
**Fix**: push these into the RPCs as `count(*) … where created_at > now() - interval '1 day'` guards. Client-side limits are advisory only — the REST endpoint is public.

### M9 — Contact form is broken (policy without grant)
`contact_messages` has policy `Anyone can submit contact message` (INSERT, `WITH CHECK true`) but **no INSERT grant** to `anon`/`authenticated`. **Verified**: anon insert → `permission denied for table contact_messages`. So the public contact form silently fails for everyone. Fix the grant *and* add a rate limit at the same time, or anon-writable + unthrottled becomes a spam sink.

### M10 — Realtime is the first thing that breaks at 10× traffic
The single most expensive statement on the instance is Realtime's WAL poller: **82,823 calls, 459s total**. The app opens realtime subscriptions in `ModulePage`, `SenpaiZone`, `MessengerWidget` and `Navbar` — i.e. up to 4 channels per open tab. Free tier allows 200 concurrent realtime connections; ~50 students with two tabs each will hit it, and the failure mode is silent (updates just stop). **Fix**: consolidate to one channel per page, drop the Navbar notification subscription in favour of polling on focus, and unsubscribe on route change.

### M11 — 56 foreign keys have no index
Irrelevant at 30 documents; painful at exam-period scale. The hot ones: `documents.uploader_id`, `document_reactions.document_id`, `downloads_log.document_id`, `messages.sender_id`, `messages.receiver_id`, `senpai_replies.post_id`, `senpai_votes.post_id`, `document_request_votes.request_id`, `module_bookmarks.module_id`, `document_feedback.user_id`, `user_profiles.filiere_id`, `notifications.actor_id`. **Fix**: create indexes for those 12 first (full list reproducible from the query in Appendix B).

### M12 — Leaked-password protection is off
Advisor `auth_leaked_password_protection`. Supabase can check new passwords against HaveIBeenPwned; it's disabled. **Fix**: Dashboard → Authentication → Policies (manual, see §Manual steps).

### M13 — Public bucket, 50 MB limit, and bandwidth is the real free-tier ceiling
Bucket `documents` is `public: true` with a 50 MB per-file limit and 13 allowed MIME types; 118 objects today. The UI tells users "20 Mo max" (`Dropzone` hint) while the bucket accepts 50 MB — an inconsistency users will find. More importantly, on the free tier **5 GB/month egress** is the first hard limit you'll hit: 118 files × a few MB × exam-period downloads gets there fast, and a public bucket means no per-user accounting. **Fix**: align the limit to 20 MB, compress PDFs on upload, set long `Cache-Control` on storage responses so Supabase's CDN absorbs repeat downloads, and watch egress in the dashboard.

---

## LOW

- **L1 — 5 tables have RLS on with zero policies**: `ai_sessions`, `donations`, `likes_log`, `module_suggestions`, `senpai_tags`. Fail-closed (safe), but any feature touching them is silently broken — `module_suggestions` even has an INSERT grant that can never succeed. Decide: add policies or drop the tables.
- **L2 — `pg_trgm` installed in `public`** (advisor). Deliberate and documented in `DATABASE.md` — several `SECURITY DEFINER` functions pin `search_path = public` and moving it would break operator resolution. Accepted risk, not a real exposure.
- **L3 — `find_duplicate_documents(text[])`** lets any signed-in user probe whether a given file hash already exists (enumeration oracle). Low value to an attacker; worth a rate limit eventually.
- **L4 — `rls_auto_enable()`** is executable by `anon`/`authenticated`. It's an event-trigger helper; direct calls should be revoked.
- **L5 — Edge function hardening**: `incoming !== WEBHOOK_SECRET` is a timing-unsafe comparison (theoretical), and a Resend outage returns 500 with no retry or dead-letter queue — those notification emails are lost permanently. `pg_net` is fire-and-forget so the DB write still succeeds, which is the right call.
- **L6 — Admin pages load whole tables** (`modules`, `senpai_posts`, all users) with no pagination. Fine at current size; add pagination before ~10k rows.
- **L7 — npm: 2 critical + 22 high, but almost entirely build-time.** The two criticals (`shell-quote`, `websocket-driver`) and most highs (`nth-check`, `postcss`, `svgo`, `js-yaml`, `browserslist`, `shell-quote`) are transitive dev dependencies of `react-scripts` — they run on your machine and in CI, not in visitors' browsers. `npm audit fix --force` would pull in a breaking `react-scripts` major; the honest answer is that CRA is effectively unmaintained and the real fix is migrating to Vite, which is a project, not a patch. Only H4 (`react-router-dom`) needs urgent action.

---

## Reliability, capacity and backups

**Current usage (all comfortably inside free tier)**: database 35 MB / 500 MB · 118 storage objects · 17 users · 30 documents · 90 notifications · `max_connections` 60.

**What breaks first at 10× traffic**, in order:
1. **Realtime connections** (M10) — 200 concurrent cap, ~4 channels per tab.
2. **Storage egress** — 5 GB/month; PDFs are the whole product.
3. **Connection exhaustion** — 60 connections; use the pooler (port 6543) for any serverless/SSR callers.
4. Database size is a non-issue (35 MB), unless `search_log`/`notifications` are left to grow unbounded — add a retention job (e.g. delete `search_log` older than 90 days).

**Free-tier pausing**: projects pause after **7 days with no activity**. The site's own traffic prevents this during term, but a quiet summer will pause it. Mitigation: an uptime monitor pinging a cheap endpoint every 5 minutes doubles as a keep-alive (see Monitoring below).

**Backups**: free tier = **daily backups, 7-day retention, no PITR**. There is no documented restore procedure. Restore runbook:
1. Dashboard → Database → Backups → pick the day → *Restore* (this overwrites the project; it does **not** create a copy).
2. Storage objects are **not** covered by database backups — the `documents` bucket must be backed up separately.
3. Because of (1) and (2): before any risky migration, take a manual dump — `npx supabase db dump --db-url "$DB_URL" -f backup_$(date +%F).sql` — and keep a copy of the bucket.
4. Upgrading to Pro ($25/mo) adds PITR and 7-day → 30-day retention; worth it before the first exam period if the data becomes hard to recreate.

**Frontend resilience**: no error boundary (H5), no retry/backoff on Supabase calls, no offline detection, no global "something went wrong" state. Pages that fail to load mostly render empty states rather than errors, so a Supabase outage looks like "there are no documents" — actively misleading. Fix alongside H5/H6.

## Monitoring (currently: none)

Nothing is wired — no Sentry, no PostHog, no uptime check, no alerts. Minimum viable setup:
- **Sentry** for frontend + edge function errors (H6), alert on error-rate spike.
- **Uptime monitor** (UptimeRobot/BetterStack free) on `https://9rawzid9ra.space` and on a Supabase health endpoint, 5-minute interval — doubles as the anti-pause keep-alive.
- **Supabase usage alerts**: Dashboard → Settings → Billing → set email alerts at 80% of egress/storage/DB size.
- **A weekly glance** at the Admin → Analytiques tab you already built (zero-result searches, moderation queue depth).

---

## Manual steps — things only you can do in a dashboard

I will not touch any of these; several are irreversible or affect billing.

1. **Supabase → Authentication → Providers/Policies**: turn on **leaked-password protection** (M12); confirm **email confirmation is required**; set **minimum password length ≥ 8** (12 recommended).
2. **Supabase → Authentication → Rate limits**: review sign-up / sign-in / OTP limits (defaults are generous for an unprotected public signup).
3. **Supabase → Authentication → Bot protection**: enable **CAPTCHA** (hCaptcha or Cloudflare Turnstile) on sign-up and sign-in — the single best defence against mass fake-account creation, which is what makes H1 (email harvesting) cheap.
4. **Supabase → Authentication → URL Configuration**: lock the **redirect allow-list** to `https://9rawzid9ra.space/**` and your Vercel preview domain only.
5. **Supabase → Settings → API**: the `20260925000600_notify_email_vault.sql` migration says the service_role key was exposed at some point and should be rolled. Git history is clean, but if that key was ever pasted into a chat, an email, or a deploy log, **roll it now** and update the `SUPABASE_SERVICE_ROLE_KEY` secret on the edge function.
6. **Supabase → Settings → Billing**: set a **spend cap** so a traffic spike or abuse can't produce a surprise bill.
7. **Vercel → Project → Firewall**: enable Attack Challenge Mode / rate limiting on `/` if you see scripted traffic.
8. **Sentry + UptimeRobot accounts** (free) so the keys exist before I wire them in Phase 2.

---

## Proposed Phase 2 order

Cheap, high-value, low-risk first. One commit per fix, each with a verification query.

| # | Fix | Severity | Risk of the fix |
|---|---|---|---|
| 1 | Revoke PUBLIC execute on `activate_senpai_profile`, `reset_daily_ai_usage`, `refresh_module_stats`, `check_download_limit`, `rls_auto_enable` | C1, H2, M2, M3, L4 | None — internal callers unaffected |
| 2 | Staff-gate the 6 analytics RPCs | M1 | Low — Admin.js already calls them as admin |
| 3 | Column-grant `user_profiles`, add `get_my_profile()` | H1 | **Medium** — touches AuthContext/Navbar/Profile/Admin; needs care |
| 4 | `vercel.json` security headers | H3 | Low — CSP needs one deploy to verify |
| 5 | Error boundary + Sentry | H5, H6 | Low |
| 6 | Re-enable ESLint + CI gate | H7 | Low, but will surface a backlog of warnings |
| 7 | Storage DELETE policy + path-scoped INSERT | M5, M6 | Low |
| 8 | `search_path` on 19 functions | M4 | None |
| 9 | 12 FK indexes | M11 | None |
| 10 | DB-level rate limits + catalogue caps | M7, M8 | Medium — needs thresholds you're happy with |
| 11 | `react-router-dom` upgrade | H4 | Medium — regression-test all 20 routes |
| 12 | Realtime channel consolidation | M10 | Medium — touches 4 components |

**I have not applied anything.** Say which of these you want and I'll start at the top, showing you each migration's SQL before it runs.

---

## Appendix A — proposed `vercel.json`

CSP is scoped to what the app actually loads: Supabase REST/Realtime/Storage, Google Fonts, and CRA's inline bootstrap script. `'unsafe-inline'` is required for `style-src` because the design system injects `<style>` blocks per page.

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "build",
  "framework": "create-react-app",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://egqjyzuinoljadzxiwpb.supabase.co; connect-src 'self' https://egqjyzuinoljadzxiwpb.supabase.co wss://egqjyzuinoljadzxiwpb.supabase.co https://api.resend.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
        { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=(), payment=(), usb=()" }
      ]
    },
    {
      "source": "/static/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    }
  ]
}
```
If PDF.js worker loading breaks under this CSP, add `worker-src 'self' blob:` rather than loosening `script-src`.

## Appendix B — how the tests were run

Impersonation used `set local role` + `set local request.jwt.claims` in the same statement batch, verified working by `select current_user` returning `authenticated`. Write probes ran inside a `DO $$ … $$` block whose final statement is `raise exception 'AUDIT_RESULTS:%'`, which aborts the transaction and returns the per-probe outcome in the error message — so every write was rolled back by construction.

Test identities: normal user `fe58819f-430a-48d6-86bf-2799ee7cbf5e` (no roles), second user `211ebbae-dae1-4685-8556-f5b4c00d97d5`, admin `84c11086-6041-4118-8f4c-138a0664966f`.

Unindexed-FK list reproducible with:
```sql
select c.conrelid::regclass::text tbl, a.attname fk_col
  from pg_constraint c
  join lateral unnest(c.conkey) k(attnum) on true
  join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.attnum
 where c.contype='f' and c.connamespace='public'::regnamespace
   and not exists (select 1 from pg_index i
                    where i.indrelid=c.conrelid and (i.indkey::int2[])[0]=k.attnum);
```

## Appendix C — monthly security checklist

- [ ] Run `get_advisors` (security + performance); confirm no new WARN/ERROR.
- [ ] Re-run the anon + normal-user probe batteries (Appendix B); all should stay blocked.
- [ ] `npm audit` — triage anything new that ships to the browser (ignore build-only noise).
- [ ] Check Supabase usage vs limits: DB size, storage, **egress**, realtime peak connections.
- [ ] Confirm a backup exists from the last 24h; once a quarter, actually test a restore into a scratch project.
- [ ] Skim Sentry for the top 5 unresolved errors.
- [ ] Review the staff queues: professor queue, senpai applications, senpai reports, moderation queue.
- [ ] Check `search_log` / `notifications` row counts; prune if growing unbounded.
- [ ] Confirm no new `SECURITY DEFINER` function shipped without `revoke … from public` and a `search_path`.
