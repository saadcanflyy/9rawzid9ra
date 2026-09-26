# 9rawZid9ra — Security & Reliability Audit

**Date**: 2026-09-27 · **Scope**: Supabase `egqjyzuinoljadzxiwpb` (eu-west-3, Postgres 17.6, ACTIVE_HEALTHY), React CRA on Vercel, edge function `notify-email`.
**Phase 1 — audit only. Nothing was changed.** Every write test below ran inside a transaction that was deliberately aborted, so no data was modified.

> ## Phase 2 status — CLOSED 2026-09-26
>
> Every Critical, every High and every actioned Medium is fixed and verified.
> What remains is listed under "Still open" below — all of it either a dashboard
> toggle only you can flip, or a deliberate accepted risk.
>
> | # | Finding | Status | Commit |
> |---|---|---|---|
> | C1 | `activate_senpai_profile` callable by anon | **Fixed** | `2ef9c73` |
> | H1 | Every signed-in user could read all emails | **Fixed** | `16c5024` |
> | H2 | `reset_daily_ai_usage` callable by anon | **Fixed** | `2ef9c73` |
> | H3 | No security headers | **Fixed** | `dae5c0d` |
> | H4 | `react-router-dom` advisory | **Fixed** — 7.18.4 merged after preview click-through | `e6a8268` |
> | H5 | No error boundary | **Fixed** | `dae5c0d` |
> | H6 | No error monitoring | **Fixed** — Sentry live, test error received, `/sentry-test` removed | `dae5c0d`, `fcac3bb` |
> | H7 | ESLint disabled in prod builds | **Fixed** — and re-fixed: the `build` script was overriding `.env.production` | `dae5c0d`, `a2e50d9` |
> | M1 | Analytics RPCs public | **Fixed** | `2ef9c73` |
> | M2 | `refresh_module_stats` callable by anon | **Fixed** | `2ef9c73` |
> | M3 | `check_download_limit` callable by anon | **Fixed** | `2ef9c73` |
> | M4 | 19 functions with mutable `search_path` | **Fixed** | `2ef9c73` |
> | M5 | No storage DELETE policy | **Fixed** | `159fe73` |
> | M6 | Storage INSERT not path-scoped | **Fixed** | `159fe73` |
> | M7 | Catalogue spam caps | **Fixed** | `c93ad8a` |
> | M8 | No server-side rate limits | **Fixed** | `1a549b9` |
> | M9 | Contact form broken (policy, no grant) | **Fixed** | `cbba080` |
> | M10 | Realtime channel per tab | **Partly fixed** — navbar channel removed | `159fe73` |
> | M11 | 56 unindexed FKs | **Fixed** (12 hot ones; 44 cold left) | `4d3c894` |
> | M13 | Upload size inconsistent (20 vs 50 MB) | **Fixed** — 20 MB everywhere | `7ebf3d5` |
> | — | Captcha on auth (Turnstile) | **Live** — site key set; resets on every attempt | `c798631`, `a0fcabf` |
> | — | Senpai contact wired to Messenger + stats | **Fixed** | `ff6ff3f` |
> | L4 | `rls_auto_enable` executable by anon | **Fixed** | `2ef9c73` |
> | — | Senpai email exposed to students | **Fixed** (new rule) | `4b3ea4e` |
> | — | Source maps served publicly (full unminified source) | **Fixed** — uploaded to Sentry, stripped from the deploy | `a2e50d9` |
> | — | Maintenance functions never actually ran | **Fixed** — `pg_cron` was reported enabled but wasn't; now installed + scheduled | `a2e50d9` |
> | **C2** | **`pause_inactive_senpais()` callable by anonymous users** — regression of C1 | **Fixed** + permanent event-trigger guard | `20260927001400` |
>
> Re-ran the Phase-1 probe battery after the fixes — every attack path blocked,
> every legitimate path still working:
>
> ```
> C1  anon activate_senpai_profile -> blocked      OK anon search_catalog        -> works
> H2  anon reset_daily_ai_usage    -> blocked      OK student reads names/points -> works
> M2  anon refresh_module_stats    -> blocked      OK senpai RPC (no email col)  -> works
> M1  anon get_analytics_extra     -> blocked      OK admin_list_users           -> works (17)
> H1  student reads emails         -> blocked      OK admin get_analytics_extra  -> works
> H1  student reads ban_reason     -> blocked
>     student admin_list_users     -> blocked
>     student self is_admin        -> blocked
>     student bypass ratelimit     -> blocked
> ```
>
> ### Still open
>
> | Item | Why it's still open |
> |---|---|
> | **M12** leaked-password protection | Dashboard toggle: Authentication → Policies. One click. |
> | **Rotate the leaked `service_role` key** | Runbook written: [`KEY-ROTATION.md`](KEY-ROTATION.md). Not executed — yours to run. |
> | **M10** realtime at 10× | Partly fixed. Structural; revisit when concurrency actually climbs. |
> | **M11** 44 cold unindexed FKs | 12 hot ones indexed. The rest cost more to maintain than they'd save today. |
> | **L1** 5 RLS-on/no-policy tables | Fail-closed, so safe. Needs a product decision: add policies or drop them. |
> | **L2** `pg_trgm` in `public` | Accepted risk, documented. Moving it breaks fuzzy search. |
> | **L3, L5, L6** | Low value; noted for when the numbers grow. |
> | **L7** npm advisories | Build-time only. Real fix is migrating off CRA to Vite — a project, not a patch. |
> | **Orphaned storage files** (26 files / 41 MB) | You confirmed deletion; the script output was never pasted back, so I can't record it as done. Re-run `node scripts/delete-orphan-storage.mjs` (dry run) to check. |
>
> ### Three things that were not what they looked like
>
> All three were believed done. None was. This is the most useful part of this
> document:
>
> 0. **C1 came back, and worse.** The 000300 migration revoked PUBLIC execute and
>    granted an allow-list. Every migration that ran after it created functions
>    that silently picked up Postgres' default `EXECUTE TO PUBLIC` again — the
>    `ALTER DEFAULT PRIVILEGES` did not hold for them. The result was an
>    **unauthenticated denial of service**: `pause_inactive_senpais()` guards with
>    `auth.uid() is not null and not is_staff()`, which is *false* for anon, so
>    a POST to `/rest/v1/rpc/pause_inactive_senpais` from anyone on the internet
>    would pause every senpai with a 30-day-unanswered request. Verified
>    exploitable, then fixed three ways: re-revoke + allow-list, a guard that
>    keys on PostgREST's `request.method` instead of on the absence of a JWT, and
>    an **event trigger** (`trg_revoke_public_execute`) that strips the PUBLIC
>    grant from every function created in `public` from now on. Post-fix: exactly
>    28 anon-executable functions, matching the allow-list, and 0 without a
>    pinned `search_path`.
> 1. **`pg_cron` was not installed.** `installed_version` was `null` despite the
>    toggle being reported as enabled, so `pause_inactive_senpais()` and
>    `award_top_university_contributors()` were never going to fire. Installed
>    and scheduled (`20260927001300_cron_jobs.sql`).
> 2. **The ESLint gate was still off.** `.env.production` said
>    `DISABLE_ESLINT_PLUGIN=false`, but `package.json`'s build script set
>    `DISABLE_ESLINT_PLUGIN=true` inline, and an inline env var beats a dotenv
>    file. H7 was only really fixed in `a2e50d9`.
>
> The lesson, and the reason the monthly checklist below is written as queries
> rather than as reminders: **verify the state, don't trust the toggle** — and
> don't trust a fix either. Two of the three above were things I had already
> marked "Fixed" in this very table.

## How to read this

Each finding has **What / Where / Impact / Fix**. Severity is about *category and exploitability*, not just blast radius — an unauthenticated privilege escalation is Critical even when the thing it escalates to is modest.

**Verified** means I actually executed the attack path (as `anon` or as a normal signed-in user) and observed the result. Findings without "Verified" are configuration/code review.

| Severity | Count |
|---|---|
| Critical | 2 (C1 in Phase 1; C2 found 2026-09-26 as a regression of C1) |
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

### C2 — `pause_inactive_senpais()` callable by anonymous users (found 2026-09-26, regression of C1)

- **What**: every function created by a migration *after* the C1 fix picked up Postgres' default `EXECUTE ON FUNCTION TO PUBLIC` again. `pause_inactive_senpais()` was among them, and its guard — `if auth.uid() is not null and not is_staff()` — evaluates to false for an anonymous caller, because anon has no `auth.uid()`. The guard was written to let the scheduler through and accidentally let the entire internet through with it.
- **Where**: `20260927000700_senpai_messaging.sql`; same guard shape in `award_top_university_contributors()`.
- **Impact**: **Verified.** An unauthenticated `POST /rest/v1/rpc/pause_inactive_senpais` pauses every senpai carrying a 30-day-unanswered request. Repeatable, free, no account needed — a denial of service on the senpai feature that a moderator would have to undo by hand. Also left world-executable: `admin_list_users`, `admin_top_users`, `get_my_ban_status`, `get_my_senpai_requests`, and eleven `fn_*` functions (all internally guarded, so defence-in-depth rather than live holes).
- **Fix**: `20260927001400_function_grants_regression.sql` — re-revoke and re-grant the allow-list; change both scheduler guards to key on PostgREST's `request.method` GUC (present on any API call, absent for pg_cron) rather than on the absence of a JWT; and install event trigger `trg_revoke_public_execute`, which strips the PUBLIC grant from every function created in `public` from now on. Verified after: anon blocked on all three, anon browsing unaffected, cron path works, staff path works, a newly created function comes out as `{postgres=X/postgres}`.

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

## Monitoring — as of 2026-09-26

| | Status |
|---|---|
| **Sentry** | **Live.** `@sentry/react` v11, EU region, `tracesSampleRate 0.1`, `sendDefaultPii: false`. Test error received and confirmed. `ErrorBoundary` forwards through `window.Sentry`. Source maps upload at build time and are stripped from the deploy, so stack traces name real files. |
| **Uptime monitor** | Still to do — UptimeRobot/BetterStack free, 5-min interval on `https://9rawzid9ra.space`. Doubles as the anti-pause keep-alive. |
| **Supabase usage alerts** | Still to do — Settings → Billing → email alerts at 80% of egress/storage/DB size. |
| **Scheduled maintenance** | **Live.** `pg_cron`: `senpai-pause-inactive` daily 02:00 UTC, `senpai-top-contributors` 03:00 UTC on the 1st. Check with `select * from cron.job_run_details order by start_time desc limit 20;` |
| **Weekly glance** | Admin → Analytiques (zero-result searches, moderation queue depth). |

---

## Manual steps — things only you can do in a dashboard

I will not touch any of these; several are irreversible or affect billing.

**Done** (reported by you, 2026-09-26): email confirmation required, minimum
password length 8, redirect allow-list, Sentry project, Turnstile site key.
Turnstile is live in production, so Supabase bot protection is now safe to
enable if you haven't already.

**Still outstanding:**

1. **Authentication → Policies**: turn on **leaked-password protection** (M12). One toggle.
2. **Authentication → Bot protection**: enable CAPTCHA now that Turnstile is live — this is the defence that makes mass fake-account creation expensive.
3. **Authentication → Rate limits**: review sign-up / sign-in / OTP limits; the defaults are generous for a public signup.
4. **Rotate the `service_role` key** — see [`KEY-ROTATION.md`](KEY-ROTATION.md). Take route A; route B takes the site down.
5. **Settings → Billing**: set a **spend cap** so a spike or abuse can't produce a surprise bill.
6. **Vercel → Firewall**: enable Attack Challenge Mode if you see scripted traffic.
7. **Uptime monitor** (UptimeRobot/BetterStack free) — also keeps the free-tier project from pausing over a quiet summer.
8. **Cloudflare Turnstile**: remove the temporary Vercel preview hostname from the widget's allowed domains.

---

## Proposed Phase 2 order *(historical — this is what was planned; see the status table at the top for what happened)*

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

## Appendix C — monthly checklist

Ten minutes, once a month. Every item is a thing you *check*, not a thing you
trust — twice during this audit something reported as enabled wasn't.

**Database**

- [ ] Run `get_advisors` (security **and** performance); no new WARN/ERROR.
- [ ] No new function is world-executable or missing a pinned `search_path`:
      ```sql
      select p.oid::regprocedure::text from pg_proc p
        join pg_namespace n on n.oid=p.pronamespace
       where n.nspname='public'
         and not exists (select 1 from pg_depend d where d.objid=p.oid and d.deptype='e')
         and (has_function_privilege('anon', p.oid, 'execute') or p.proconfig is null);
      ```
      Expect **exactly 28** anon-executable and **0** without a `search_path`.
      Anything else is either deliberate (check it against the allow-list in
      `20260927001400_function_grants_regression.sql`) or a new bug — this
      regressed once already and was exploitable.
- [ ] The guard that prevents that regression is still installed:
      ```sql
      select evtname, evtenabled from pg_event_trigger where evtname='trg_revoke_public_execute';
      ```
      One row, `evtenabled = 'O'`. If it's gone, re-apply migration `…001400`.
- [ ] No key ever lands back in a function body:
      ```sql
      select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
       where n.nspname in ('public','extensions') and p.prosrc ~ 'eyJ[A-Za-z0-9_-]{10,}';
      ```
- [ ] Cron actually ran: `select jobname, status, start_time from cron.job_run_details order by start_time desc limit 10;`
      Expect ~30 `senpai-pause-inactive` rows a month, all `succeeded`.
- [ ] `search_log` and `notifications` row counts — prune if they're running away.

**Access**

- [ ] Re-run the impersonation probes (Appendix B): anon still blocked on the
      privileged RPCs, a normal student still can't read emails, `ban_reason`,
      or `admin_list_users`.
- [ ] Glance at the admin/moderator list — nobody has quietly gained a role.

**Frontend and deploy**

- [ ] `npm audit` — triage only what ships to the browser; build-time noise is noise.
- [ ] Confirm the deployed build has **no** `.map` files:
      `curl -s -o /dev/null -w '%{http_code}' https://9rawzid9ra.space/static/js/main.<hash>.js.map` → expect `404`.
- [ ] Skim Sentry: top 5 unresolved issues, and check the error rate hasn't stepped up since the last deploy.

**Capacity**

- [ ] Supabase usage vs limits — DB size, storage, **egress** (the one that bites first), realtime peak connections.
- [ ] A backup exists from the last 24h. Once a quarter, actually restore one into a scratch project — an untested backup isn't a backup.

**Product hygiene**

- [ ] Work the staff queues: professor requests, senpai applications, senpai reports, moderation queue.
