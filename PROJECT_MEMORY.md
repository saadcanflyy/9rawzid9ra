---

# 9rawZid9ra — Project Memory File
# Last updated: June 2026
# Continue from: Post-deployment, production phase — auth fixes + messaging system

## DEVELOPER
- Name: GAGA Saad (Saad GENIUS)
- Email: saadga2003@gmail.com
- WhatsApp: +212677246703
- Location: Morocco

## PROJECT
- Name: 9rawZid9ra
- Type: Moroccan student platform (annales, exams, TDs, TPs)
- Region: Rabat-Salé-Kénitra (expanding)
- Domain: 9rawzid9ra.space
- Status: LIVE IN PRODUCTION ✅
- GitHub: github.com/saadcanflyy/9rawzid9ra

## TECH STACK
- Frontend: React.js (Create React App) — React 19, React Router v7, Supabase JS v2
- Backend: Supabase (PostgreSQL + Auth + Storage)
- Styling: Inline CSS-in-JS per component (`<style>{css}</style>`) — NO external CSS files, NO UI libs
- Fonts: Outfit (body/headings) + DM Mono (labels/tags/badges) via Google Fonts
- Deployment: Vercel (auto-deploy from GitHub push, ~2 min build)
- Domain DNS: Cloudflare
- Email: Resend (SMTP) via mail.9rawzid9ra.space
- Repo: github.com/saadcanflyy/9rawzid9ra

## LOCAL PROJECT PATH
C:\Users\tahae\OneDrive\Bureau\9ra w zid 9ra\annabi

## DEPLOY COMMAND
cd "C:\Users\tahae\OneDrive\Bureau\9ra w zid 9ra\annabi"
git add .
git commit -m "description"
git push
# Vercel auto-deploys in ~2 min

## SUPABASE CONFIG
- URL: https://egqjyzuinoljadzxiwpb.supabase.co
- Project name: annabi
- Admin user: saadga2003@gmail.com
- Admin UID: 84c11086-6041-4118-8f4c-138a0664966f

## DESIGN SYSTEM
- Background: #02040A
- Surface: #070C18
- S2: #0C1222
- Border: #1C2A45
- BorderHi: #2D4A7A
- Accent: #4F8EF7
- Accent2: #7BB3FF
- Teal: #2DD4BF
- Teal2: #5EEAD4
- Red: #F87171
- Yellow: #FBD34D
- Text: #E2E8F0
- Text2: #94A3B8
- Text3: #4A5568

## DATABASE TABLES
- universities (id, name, city, type)
- faculties (id, university_id, name, type)
- filieres (id, faculty_id, name, total_semesters)
- modules (id, filiere_id, name, semester, type, verified)
- documents (id, module_id, uploader_id, doc_type, academic_year,
  professor, file_type, file_names TEXT[], files TEXT[], pages_count,
  downloads, likes, helpful_count, rating_sum, rating_count,
  report_count, is_flagged, is_verified, doc_number, created_at)
- user_profiles (id, email, name, is_admin, is_moderator, is_premium,
  is_fondateur, is_banned, banned_until, ban_reason,
  points, uploads_count, downloads_count, total_downloads,
  university_id, bio, followers_count, following_count, posts_count,
  ai_uses_today, ai_uses_reset_at, ads_watched_today, created_at)
- comments, comment_likes
- module_suggestions, school_requests, filiere_suggestions
- downloads_log, points_log, notifications
- senpai_posts, senpai_votes, senpai_tags, senpai_replies
- user_follows (follower_id, following_id, created_at)
- document_reactions, module_bookmarks
- document_requests, document_request_votes
- ai_usage, payments
- messages (id, sender_id, receiver_id, content, is_read, created_at)
- typing_indicators (user_id, is_typing, updated_at)
- filiere_suggestions (id, suggested_by, faculty_id, name, total_semesters, status)

## DATABASE STATS
- Universities: 40+ (including all EMSI campuses, HEM, ISGA, UH2C faculties as independent)
- Faculties: 47+
- Filieres: 98+
- Modules: 900+
- Documents: 29
- Users: 13

## IMPORTANT DB NOTES
- helpful_count on documents: maintained by trigger trg_doc_helpful_count (SECURITY DEFINER)
- helpful_count on senpai_posts: maintained by trigger trg_senpai_helpful_count
- reply_count on senpai_posts: maintained by trigger
- All realtime tables have REPLICA IDENTITY FULL
- parseInt(id) needed in all ModulePage queries (URL param is string)
- handle_new_user() trigger: NEVER updates is_moderator, is_admin, is_banned, is_fondateur on conflict
- Fondateur badge: given to first 100 users who upload, via trigger trg_fondateur_badge
- Ban system: is_banned + banned_until + ban_reason in user_profiles
- Moderator role: is_moderator boolean, lighter admin panel at /moderator
- Messages: clean table with RLS, 3 SECURITY DEFINER RPCs (admin_get_inbox, admin_get_thread, mod_send_message)

## RLS POLICIES (key ones)
- documents: public read, auth insert (uploader_id = uid), update own only
- faculties: auth users can INSERT
- filieres: auth users can INSERT
- universities: auth users can INSERT
- messages: sender can insert, sender/receiver can read, receiver can mark read

## FILE STRUCTURE
src/
├── context/
│   └── AuthContext.js         ← GLOBAL auth state — single source of truth
├── components/
│   ├── Navbar.js              ← auth-aware, notifications bell, mobile hamburger
│   ├── MessengerWidget.js     ← floating chat bubble, all pages, non-admin users
│   └── WelcomeModal.js        ← first-login welcome popup
├── pages/
│   ├── Home.js                ← hero, search, school cards, suggested follow card
│   ├── Browse.js              ← modules grid, URL params for filters
│   ├── ModulePage.js          ← grouped docs, reactions, PDF preview modal, senpai section
│   ├── Upload.js              ← 3-step, school/filière/module suggestions, immediate publish
│   ├── Login.js               ← ban detection, 10s timeout, spinner, double-submit guard
│   ├── Register.js            ← OTP, double-submit guard, French errors
│   ├── ForgotPassword.js      ← 3-step OTP, double-submit safe
│   ├── Admin.js               ← full admin panel — 8 tabs
│   ├── ModeratorPanel.js      ← /moderator — 7 tabs, lighter permissions
│   ├── Profile.js             ← public/own, fondateur badge, followers modal, uploads tab
│   ├── SenpaiZone.js          ← Twitter-style feed
│   ├── AICoach.js             ← Coming Soon screen
│   └── MyModules.js           ← bookmarked modules
└── App.js                     ← routes, ban check, AuthProvider wraps everything

## ROUTES
/ → Home
/browse → Browse (URL params: q, university, faculty, semester, type)
/module/:id → ModulePage
/upload → Upload (auth required)
/login → Login
/register → Register
/forgot-password → ForgotPassword
/admin → Admin (is_admin required)
/moderator → ModeratorPanel (is_moderator OR is_admin required)
/profile → Profile (own, auth required)
/user/:id → Profile (public)
/senpai → SenpaiZone
/ai → AICoach (Coming Soon)
/my-modules → MyModules (auth required)
* → 404 NotFound (inline in App.js)

## AUTH ARCHITECTURE (CRITICAL — read before touching auth)

### AuthContext.js — single source of truth
src/context/AuthContext.js wraps the whole app via <AuthProvider> in App.js.
- Reads session from localStorage SYNCHRONOUSLY via getInitialUser() → zero-flash first render
- getSession().then() only UPDATES user if valid — NEVER calls setUser(null)
- onAuthStateChange ONLY clears user on 'SIGNED_OUT' event
- All other components get user via: const { user, profile } = useAuth()

### The rule: only SIGNED_OUT clears auth state
- getSession().then(): if (session?.user) { setUser(...) } // no else
- onAuthStateChange: if (SIGNED_OUT) clear; else if (session?.user) set
- This applies to AuthContext, MessengerWidget, Home, and every other component

### window.open() rule
- MUST be called synchronously from click handler
- Calling after await causes popup blocker to block it

### App.js structure
<AuthProvider>
  <BrowserRouter>
    <Routes>...</Routes>
    <WelcomeModal />      ← first-login popup
    <MessengerWidget />   ← always mounted
  </BrowserRouter>
</AuthProvider>
App.js also has its own onAuthStateChange for ban-checking (separate from AuthContext).

## EMAIL CONFIG
- Provider: Resend
- Domain: mail.9rawzid9ra.space (VERIFIED ✅)
- Sender: no-reply@mail.9rawzid9ra.space
- SMTP: smtp.resend.com / Port 465 / User: resend
- Email confirmation: ENABLED (OTP on register)
- Forgot password: WORKING ✅
- Custom dark HTML email template with {{ .Token }}

## MONETIZATION
- Google AdSense: ACTIVE (auto ads, bannières only, site under review)
- ads.txt: live at 9rawzid9ra.space/ads.txt
- Publisher ID: pub-9230269242068997
- Payment threshold: 800 MAD (bank transfer via RIB)
- PayPal: NOT available in Morocco — use paypal.me link instead
- Premium: 39 MAD/month (AI Coach — not built yet)
- Future: AdMob rewarded ads on mobile app

## FEATURES BUILT ✅
- Full platform live on 9rawzid9ra.space
- Browse 900+ modules with cascading filters
- Upload (3-step wizard, immediate publish, school/filière/module suggestions)
- Login/Register with OTP email confirmation
- Forgot password email flow (3-step OTP)
- Profile page (own + public /user/:id, bio, followers/following modal, tabs)
- Admin panel (8 tabs: Overview, Documents, Modules, Écoles, Filières, Users, Messages, Analytics)
- ModeratorPanel (/moderator — 7 tabs, ban capability, messages, lighter permissions)
- Senpai Zone (posts, replies, votes, follows, realtime, type filters)
- Document reactions (helpful_count via DB trigger, SECURITY DEFINER)
- Module bookmarks (MyModules page)
- Missing doc requests + voting
- Notifications bell (grouped by sender for messages, click routing to correct page)
- Mobile responsive layout (hamburger nav on mobile)
- Realtime updates (documents, senpai posts, messages)
- MessengerWidget (floating WhatsApp-style chat on all pages for non-admin users)
- WelcomeModal (first-login popup)
- Fondateur badge (first 100 uploaders, gold, via DB trigger)
- MOD badge (teal) for moderators
- Ban system (temporary + permanent, BanScreen in App.js)
- Announcement system (admin sends to all users)
- Analytics dashboard (health cards, bar charts, top modules)
- Move document to correct module (admin)
- Suggested follow card (new users see admin on Home page)
- School/filière/module suggestions (immediate publish + admin review)
- 3-case school suggestion form (independent / faculty / new university)
- SEO meta tags (og:title, og:description, og:image, Twitter card)
- ads.txt for Google AdSense verification
- PDF preview modal in ModulePage (Google Docs Viewer iframe, no download required)
- Instagram-style followers/following modal in Profile
- Popup-blocker-safe document download (synchronous window.open)

## WHAT'S NOT DONE ❌
- PayPal donate button (not available in Morocco, use paypal.me)
- Claude API for AI Coach (coming soon screen only)
- Mobile app (React Native — planned Phase 3)
- Fondateur badge campaign not yet announced publicly
- Global search bar
- Student-to-student DMs (MessengerWidget is admin→user only for now)
- Email notifications
- Browser push notifications

## KNOWN BUGS 🐛
- Browse page search state lost on refresh (URL params partially implemented)
- Auth flash may still appear in edge cases on very slow connections (token refresh race)

## POINTS SYSTEM
- Upload: +50 points
- Ranks: Étudiant (0-99) / Contributeur (100-299) / Senpai (300-599) / Légende (600+)

## MODERATOR PERMISSIONS
✅ Can: view/delete flagged docs, flagged senpai posts, view users (no emails),
         rename modules, add modules, ban/unban users, read/reply messages
❌ Cannot: delete users, see emails, access revenue stats, give/remove admin/mod role,
           delete universities or faculties

## ROADMAP
Phase 1 (done): Web platform stable + live
Phase 2 (done): Moderator role, messaging, analytics, ban system, badges
Phase 3 (next): React Native mobile app
Phase 4: AdMob rewarded ads on mobile
Phase 5: AI Coach (Claude API) with ad/premium model

Next features (ordered by priority):
1. Global search bar (high impact)
2. Student-to-student DMs
3. Email notifications
4. Bookmarks improvements
5. Browser push notifications
6. Onboarding video in State Guide (user handles)

## SESSION HISTORY

### Session 1 — Build phase
Full platform built from scratch, Supabase schema, all pages

### Session 2 — Deployment
Deployed to Vercel, domain linked, Resend SMTP, OTP email, mobile responsive

### Session 3 — Production hardening
Production audit, DB triggers for realtime counts, helpful_count RLS bypass,
Google AdSense setup, Upload 3-case school form, filière suggestions,
EMSI campuses added (11 campuses), UH2C restructured, SEO meta tags,
20 new universities (HEM, ISGA, Mundiapolis, EIDIA, etc.)

### Session 4 — Features & fixes
Fondateur badge, moderator role, messaging system (WhatsApp-style widget),
Admin analytics, ban system, announcement system, notification routing,
suggested follow card, deep auth audit, login hardening, Browse URL params,
auth persistence fixes after document download

### Session 5 — Auth fixes + new features (June 2026)
Features added:
- Notification grouping by sender in Navbar ("+N unread" badge, Facebook-style)
- Instagram-style followers/following modal in Profile.js
- PDF preview modal in ModulePage (Google Docs Viewer iframe, "Aperçu" button)
- Download handler made synchronous → fixes popup blocker on second click
- Removed visibilitychange listener that called getSession() on tab focus

Bugs fixed:
- Black screen on ModulePage hard refresh → load() wrapped in try/catch/finally
- Popup blocker on document download → handleDownload made synchronous
- "Appears logged out" on navigation → three-part fix:
  1. AuthContext.getSession().then() — never calls setUser(null) anymore
  2. MessengerWidget.onAuthStateChange — only clears on SIGNED_OUT
  3. Home.js onAuthStateChange + getSession().then() — same guard applied
