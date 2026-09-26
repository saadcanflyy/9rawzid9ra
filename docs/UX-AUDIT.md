# UX audit — Phase 3

**Method.** `scripts/ux-audit.mjs` drives Chromium over every route at 390px and
1280px, in dark and light (52 page loads per pass), and measures rather than
eyeballs: document overflow, elements past the viewport on the inline axis,
interactive targets under 44×44 on mobile, text under 12px, console errors and
failed PostgREST calls. Screenshots land in `docs/screenshots/phase3/{before,after}/`,
raw numbers in `findings.json` next to them.

Run it yourself: `node scripts/ux-audit.mjs after` (a production build must be
served at `http://localhost:4200`).

## Status

Public routes are done. Authenticated routes are **not yet audited** — they need
a signed-in `storageState`, which is still outstanding (see *Not done* below).

| Pass | overflow-X | offscreen | tap < 44 | text < 12 | console | REST |
|---|---|---|---|---|---|---|
| before | 0 | 1 | **58** | **2** | 1 | 2 |
| after | 0 | 0 | 6 *(all exempt, see L1)* | 0 | 1 | 2 |

The 6 remaining and the `/senpai` errors are explained below; nothing else is open.

## Findings

| # | Page | Problem | Fix | Done |
|---|---|---|---|---|
| G1 | all | Buttons 40px tall (32px for `--sm`) on mobile — under the 44px minimum | `--h: 44px` under 860px. `.qz-btn` sizes from `--h`, so one override covers every variant | ✅ |
| G2 | all | Chips 32px, tabs 32–40px | `height`/`min-height: 44px` on mobile | ✅ |
| G3 | all | Icon buttons 36×36 | 44×44 on mobile | ✅ |
| G4 | all | Dropdown items 36px | `min-height: 44px` on mobile | ✅ |
| G5 | all | Footer links 82×22 | `min-height: 44px` on mobile | ✅ |
| G6 | all | Wordmark link only 20–28px tall | `min-height: 44px` on mobile | ✅ |
| G7 | `/senpai`, `/classement` | Small-avatar initials rendered at **10.64px** (`calc(--s * .38)` with `--s: 28px`) — below the 12px floor | `font-size: max(12px, calc(var(--s) * .38))`, applied at every size | ✅ |
| G8 | all | Narrow tabs 39px wide | `min-width: 44px` on mobile | ✅ |
| G9 | `/`, `/browse` | Search input 40px inside its container | `min-height: 44px` on mobile | ✅ |
| G10 | all | No iPhone safe-area padding at the bottom | `padding-bottom: max(--space-4, env(safe-area-inset-bottom))` on the footer | ✅ |
| A1 | `/admin` | Recent-activity feed: `school_requests → user_profiles(name)` fails `PGRST200` and takes the **whole query** with it, so school requests never appear | `requested_by` references `auth.users`, not `user_profiles`, so no embed is possible. Names resolved in a second lookup via `src/lib/userNames.js` | ✅ |
| A2 | `/admin` | Same for `filiere_suggestions → user_profiles(name)` | Same, keyed on `suggested_by` | ✅ |
| A3 | `/moderator` | School-requests table: same break | Same | ✅ |
| A4 | `/moderator` | Filière-suggestions table: same break | Same | ✅ |
| S1 | `/senpai` | Signed-out visitors get `401 permission denied for table user_profiles`; the zone renders empty | `20260927001500_senpai_anon_read.sql` — rewrite the `senpai posts readable` policy to use `is_admin()` (SECURITY DEFINER, so the caller needs no table privilege) and grant anon four display columns | ⏳ **written, not applied** |

## Deliberately not changed

- **L1 — inline links in prose (6 routes).** Bare `<a>` inside a sentence measures
  15–20px tall on `/login`, `/register`, `/about`, `/contact`, `/privacy-policy`,
  `/terms`. WCAG 2.5.8 has an explicit exception for targets in a line of text;
  forcing 44px would wreck the paragraph leading. Left as is.
- **L2 — the `/senpai` filter chip bar.** A chip sits past the right edge at 390px,
  but it lives in `.sn-mobile-bar` (`overflow-x: auto`, 549px of content in 390px)
  and scrolls. That is the intended pattern, so the audit script now ignores
  anything inside a genuinely scrollable ancestor rather than reporting it.

## Not done yet

- **Authenticated routes**: `/upload`, `/profile`, `/user/:id`, `/my-modules`,
  `/admin`, `/moderator`, Messenger, notifications, onboarding. They redirect to
  `/login` without a session; `scripts/capture-auth.mjs` exists to capture one.
  The global CSS fixes above already apply to them — but they are unverified, and
  page-specific problems (sticky bars, tables, modals-as-sheets) are unreviewed.
- **`/module/:slug` and the PDF viewer**: needs a real module URL and, for the
  viewer, a signed-in session.
- **`/professeur/:id`**: needs a real professor id.
- **768px and 360px**: the sweep runs 390 and 1280. The 860px breakpoint covers
  768; 360 behaves as 390 (no fixed widths were found).
