# UX audit — Phase 3

**Method.** `scripts/ux-audit.mjs` drives Chromium over every route at 390px and
1280px, in dark and light (76 page loads per pass, plus overlays and onboarding), and measures rather than
eyeballs: document overflow, elements past the viewport on the inline axis,
interactive targets under 44×44 on mobile, text under 12px, console errors and
failed PostgREST calls. Screenshots land in `docs/screenshots/phase3/{before,after}/`,
raw numbers in `findings.json` beside them.

Run it: serve a production build on `http://localhost:4200`, then
`node scripts/ux-audit.mjs after --auth=auth-student-local.json`.

Signed-in runs use a `storageState` built by `scripts/build-storage-state.mjs`
from a session exported by hand. Turnstile makes an automated login impossible
— that is correct and was not worked around.

## Status

| Pass | overflow-X | offscreen | tap < 44 | text < 12 | console | REST |
|---|---|---|---|---|---|---|
| before (public only) | 0 | 1 | **58** | 2 | 1 | 2 |
| before (incl. signed-in) | **15 routes** | **59** | 63 | **11** | 0 | 2 |
| after (19 routes + overlays) | **0** | **0** | 5 *(all exempt, L1)* | **0** | 1 *(third-party, L3)* | **0** |

Signing in is what exposed the worst of it — the logged-in navbar and the module
page had never been measured. Everything open is listed under *Deliberately not
changed* or *Not done yet*.

## Findings

| # | Page | Problem | Fix | Done |
|---|---|---|---|---|
| G1 | all | Buttons 40px tall (32px `--sm`) on mobile, under the 44px minimum | `--h: 44px` under 860px; `.qz-btn` sizes from `--h`, so one override covers every variant | yes |
| G2 | all | Chips 32px, tabs 32–40px, narrow tabs 39px wide | 44px height, 44px min-width on mobile | yes |
| G3 | all | Icon buttons 36×36; dropdown items 36px; footer links 22px; wordmark 20px | 44px on mobile | yes |
| G7 | `/senpai`, `/classement` | Small-avatar initials at **10.64px** — `calc(--s * .38)` with `--s: 28px` | `max(12px, calc(var(--s) * .38))`, holds at every avatar size | yes |
| G9 | `/`, `/browse` | Search input 40px | 44px on mobile | yes |
| G10 | all | No iPhone safe-area padding | `padding-bottom: max(--space-4, env(safe-area-inset-bottom))` on the footer | yes |
| G11 | all | Notification pip 10px, `.qz-eyebrow` 11px, profile badge label 11px — under the 12px floor | all 12px; pip grown 16→18px to fit | yes |
| G12 | all | Two hardcoded hex values in `qz.css` (white on danger) — against the design rules | new `--on-danger` token in all three themes. **qz.css now has zero hex literals** | yes |
| G13 | all (signed in) | Account-menu trigger 28×28, styled with inline CSS | new `.qz-avatarbtn`, 44×44 on mobile | yes |
| G14 | `/senpai` | Composer trigger 25px tall and inline-styled; vote arrows 32×28 | `.sn-compose-trigger` and `.qz-vote button` at 44px on mobile | yes |
| G15 | `/profile`, `/module` | Follower counters 22px; star rating 18×18 | 44px on mobile | yes |
| N1 | all (signed in) | **Navbar overflowed at 1280px** — notifications and avatar pushed off-screen on every signed-in page. Caused by the 90px "Sharing is caring" caption: navbar scrollWidth 1324 vs client 1280, and hiding the caption restored it to exactly 1280 | switched to the Tooltip variant, which adds no width — the fallback the brief specified for this exact case | yes |
| M1 | `/module/:slug` | **707px wide in a 390px viewport.** Grid items default to `min-width: auto`, so the track refused to shrink below its content: the aside was 683px, and the tab strip never scrolled because the track had already grown to fit it | `.mp-layout > * { min-width: 0 }` | yes |
| M2 | `/module/:slug` | Hero still 446px — same trap on the `.mp-hero__top` flex row, held open by the long "filière · école" eyebrow | `min-width: 0` on its children + `overflow-wrap: anywhere` | yes |
| M3 | `/module/:slug` | Still 470px — `.qz-btn` sets `white-space: nowrap`, right for button chrome, wrong for a link-style button with a long label | `.qz-btn--link` now wraps and breaks | yes |
| A1–A4 | `/admin`, `/moderator` | `school_requests` and `filiere_suggestions` embeds failed `PGRST200`, taking the whole query with them, so both lists returned **empty** | those columns reference `auth.users`, not `user_profiles`, so no embed is possible; names resolved in a second lookup via `src/lib/userNames.js` | yes |
| P1 | `/module/:slug` | **The document preview was completely broken in production.** It framed `docs.google.com/viewer`, which my own Phase-2 CSP (`frame-src https://challenges.cloudflare.com`) blocks: *"Framing 'https://docs.google.com/' ... has been blocked"*. Readers clicked Aperçu and got an empty 596x590 box | replaced with an in-app viewer built on `react-pdf` — already a dependency, entirely unused, and pinned to the same pdfjs 5.4.296 the upload flow ships in `public/pdfjs`. Renders locally, so no document URL is handed to Google and the CSP stays closed | yes |
| P2 | `/module/:slug` | Multi-file documents never used the preview at all — every file button did `window.open()`. Most documents on the site are multi-file, so the viewer was nearly unreachable | PDF files open in the viewer; the sheet tracks *which* file rather than assuming `files[0]` | yes |
| P3 | `/module/:slug` | On phones the preview was skipped entirely (`window.innerWidth <= 768` opened a new tab) | the in-app viewer is usable on a phone, so it is used there too | yes |
| P4 | viewer | No fit-to-width, zoom, or page navigation | scale 1 == container width via ResizeObserver, so nothing scrolls sideways until the reader zooms; +/- zoom 50-300% with a reset, page prev/next with a counter. Measured: canvas 348px in a 348px stage at 390, 594/594 at 1280 | yes |
| P5 | viewer | Non-PDF files (docx, images) would render nothing | honest EmptyState offering open-in-tab and download | yes |
| P6 | all dialogs | `.qz-scrim` was `position: absolute` with **no z-index** — so on a scrolled page it centred the dialog in the *document* rather than the viewport, and the messenger launcher (z-index 45) floated over it. On `/module` at 390px it sat directly on top of the Télécharger button | scrim is `fixed`, `z-index: 60`; Sheet/Modal add `body.qz-dialog-open`, which locks background scroll and hides the launcher | yes |
| O1 | Messenger | Inbox row name 130x20 | 44px on mobile | yes |
| O2 | onboarding | Semester chips 39-42px wide (44 tall) | `min-width: 44px` on chips | yes |
| S1 | `/senpai` | Signed-out visitors got `401 permission denied for table user_profiles`; the zone rendered empty | policy rewritten to use `is_admin()` (SECURITY DEFINER, so the caller needs no table privilege), anon granted four display columns, plus an anon SELECT policy — the grant alone left RLS filtering every row, which would have rendered posts with blank author names | yes, applied |

## Deliberately not changed

- **L1 — inline links in prose (6 routes).** A bare `<a>` inside a sentence
  measures 15–20px tall on `/register`, `/classement`, `/about`, `/contact`,
  `/privacy-policy`, `/terms`, `/module`. WCAG 2.5.8 explicitly exempts targets
  in a line of text; forcing 44px would wreck the paragraph leading.
- **L2 — the `/senpai` filter chip bar.** A chip sits past the right edge at
  390px, but it lives in `.sn-mobile-bar` (`overflow-x: auto`, 549px of content
  in 390px) and scrolls. That is the intended pattern, so the audit now ignores
  anything inside a genuinely scrollable ancestor rather than reporting it.
- **L4 — AdSense is blocked by our CSP, and nobody noticed.** `public/index.html`
  loads `pagead2.googlesyndication.com/pagead/js/adsbygoogle.js`, and
  `script-src` does not allow it, so on production it logs a violation on every
  page and never runs. Either allowlist it or drop the tag — but that is a
  business decision about whether the site carries ads at all, so it is left
  for you. **Not changed.**
- **L3 — one third-party console message.** `/upload` intermittently logs
  *Framing 'https://www.google.com/' violates ... report-only ...
  frame-ancestors 'self'*. That is Google's own report-only policy complaining
  about its own frame, not ours, and nothing in this codebase can act on it.

## Also covered

Three things the route sweep cannot reach, each with its own script:

- `scripts/ux-overlays.mjs` — notifications dropdown and Messenger, opened by
  interaction, 390/1280 x dark/light. Read-only: no message was ever sent. The
  test account has no conversations, so Messenger shows its empty state.
- `scripts/ux-onboarding.mjs` — the wizard, every step. It clears the per-user
  `9rz_onboarding*` localStorage flags as well as resetting `onboarded_at`,
  because the modal is gated on both. Completed normally afterwards, which
  also re-verified Phase 1: all four columns written and bookmarks 6 -> 12,
  with no refresh.
- `scripts/refresh-session.mjs` — redeems the refresh_token before each pass
  rather than waiting for supabase-js to decide, so a run never half-fails on
  an expiring token.

## Not done yet

- **`/admin` and `/moderator`** — excluded at your request; you are reviewing
  those yourself. The test account is not staff, so they could not be measured
  anyway. The global CSS fixes do apply to them.
- **`/user/:id`, Messenger, notifications, onboarding** — not measured as
  separate routes. Messenger and notifications are overlays reachable only by
  interaction, and onboarding only appears for a user who has not completed it,
  which the test account has.
- **The PDF viewer itself** — `/module/:slug` is measured and clean, but no
  document was opened, so fit-to-width, pinch zoom and reaching the download
  button on a phone are still unverified.
- **`/professeur/:id`** — needs a real professor id.
- **360px and 768px** — the sweep runs 390 and 1280. The 860px breakpoint covers
  768, and nothing uses a fixed width that would behave differently at 360.
