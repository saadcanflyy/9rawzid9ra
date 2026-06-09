---

# 9rawZid9ra — Project Memory File
# Last updated: June 2026
# Continue from: Post-deployment, production phase

## DEVELOPER
- Name: GAGA Saad
- Email: saadga2003@gmail.com
- WhatsApp: +212677246703
- Location: Morocco

## PROJECT
- Name: 9rawZid9ra
- Type: Moroccan student platform (annales, exams, TDs, TPs)
- Region: Rabat-Salé-Kénitra
- Domain: 9rawzid9ra.space
- Status: LIVE IN PRODUCTION ✅

## TECH STACK
- Frontend: React.js (Create React App)
- Backend: Supabase (PostgreSQL + Auth + Storage)
- Styling: Inline CSS-in-JS (dark theme)
- Routing: React Router v6
- Fonts: Outfit + DM Mono (Google Fonts)
- Deployment: Vercel (auto-deploy from GitHub)
- Domain DNS: Cloudflare
- Email: Resend (SMTP) via mail.9rawzid9ra.space
- Repo: github.com/saadcanflyy/9rawzid9ra

## LOCAL PROJECT PATH
C:\Users\tahae\OneDrive\Bureau\9ra w zid 9ra\annabi

## SUPABASE CONFIG
- URL: https://egqjyzuinoljadzxiwpb.supabase.co
- Project name: annabi
- Admin user: saadga2003@gmail.com
- Admin UID: 84c11086-6041-4118-8f4c-138a0664966f

## DEPLOY COMMAND
cd "C:\Users\tahae\OneDrive\Bureau\9ra w zid 9ra\annabi"
git add .
git commit -m "description of change"
git push
# Vercel auto-deploys in ~2 min

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
- universities, faculties, filieres, modules
- documents (helpful_count owned by DB trigger trg_doc_helpful_count)
- user_profiles, comments, comment_likes
- module_suggestions, school_requests
- downloads_log, points_log, notifications
- senpai_posts, senpai_votes, senpai_tags
- user_follows, document_reactions, module_bookmarks
- document_requests, document_request_votes
- ai_usage, payments

## DATABASE STATS
- Universities: 16
- Faculties: 47
- Filieres: 98
- Modules: 898

## IMPORTANT DB NOTES
- helpful_count on documents table is maintained by trigger trg_doc_helpful_count
  (SECURITY DEFINER — bypasses RLS). Never update it manually from client.
- helpful_count on senpai_posts maintained by trigger trg_helpful_count
- reply_count on senpai_posts maintained by trigger
- All 4 realtime tables have REPLICA IDENTITY FULL:
  senpai_posts, senpai_votes, documents, document_reactions
- parseInt(id) needed in all ModulePage queries (URL params are strings)

## RLS POLICIES (documents table)
- Public read: everyone can SELECT
- Insert: auth.uid() = uploader_id
- Update own: auth.uid() = uploader_id (does NOT cover helpful_count — trigger handles it)

## FILE STRUCTURE
src/
├── components/
│   └── Navbar.js
├── pages/
│   ├── Home.js
│   ├── Browse.js
│   ├── ModulePage.js
│   ├── Upload.js
│   ├── Login.js
│   ├── Register.js (OTP email verification enabled)
│   ├── ForgotPassword.js (3-step OTP flow)
│   ├── Admin.js
│   ├── Profile.js
│   ├── SenpaiZone.js
│   ├── AICoach.js (Coming Soon)
│   └── MyModules.js
└── App.js

## ROUTES
/ → Home
/browse → Browse
/module/:id → ModulePage
/upload → Upload (auth required)
/login → Login
/register → Register
/forgot-password → ForgotPassword
/admin → Admin (is_admin required)
/profile → Profile (own)
/user/:id → Profile (public)
/senpai → SenpaiZone
/ai → AICoach (Coming Soon)
/my-modules → MyModules (auth required)

## EMAIL CONFIG
- Provider: Resend
- Domain: mail.9rawzid9ra.space (VERIFIED ✅)
- Sender: no-reply@mail.9rawzid9ra.space
- SMTP Host: smtp.resend.com / Port: 465 / User: resend
- Supabase SMTP: configured and working ✅
- Email confirmation: ENABLED (OTP on register)
- Forgot password: WORKING ✅

## WHAT WORKS ✅
- Full platform live on 9rawzid9ra.space
- Browse loads all 898 modules
- Upload works (is_verified: true — docs appear immediately)
- Login/Register with OTP email confirmation
- Forgot password email flow
- Profile page
- Admin panel
- Senpai Zone (posts, replies, votes, follows, realtime)
- Document reactions (helpful_count via DB trigger)
- Module bookmarks
- Missing doc requests
- Mobile responsive layout
- Notifications bell
- Realtime updates (documents, senpai posts)

## WHAT'S NOT DONE ❌
- PayPal donate button (YOUR_BUTTON_ID placeholder in Home.js, Navbar.js, Profile.js, ModulePage.js)
- Claude API for AI Coach (coming soon screen only)
- Mobile app (React Native — planned)
- helpful_count likes bug (still investigating — see KNOWN BUGS)

## KNOWN BUGS 🐛
- helpful_count (document likes) not syncing correctly across accounts
  Status: DB trigger applied, RLS fixed, still investigating frontend
  Last attempt: commit 36cdc16

## PENDING FIXES
- helpful_count cross-account sync (priority: high)
- PayPal button ID (priority: medium)

## MONETIZATION
- Free: full platform access
- Premium: 39 MAD/month (AI Coach — not built yet)
- Activation: manual via WhatsApp
- Tips: PayPal donate (button ID not set)

## POINTS SYSTEM
- Upload: +50 points
- Ranks: Étudiant / Contributeur / Senpai / Légende

## FUTURE FEATURES (planned)
- React Native mobile app
- Claude API AI Coach
- Prof ratings
- Stage finder
- Livre exchange
- Coloc match
- Weekly email digest
- AdMob ads
- PayDunya/CMI payment gateway

## SESSION HISTORY
### Session 1 — Build phase
- Full platform built from scratch
- Supabase schema, RLS, auth, storage
- All pages and components

### Session 2 — Deployment phase  
- Deployed to Vercel
- Domain linked via Cloudflare
- Resend SMTP configured and verified
- OTP email registration enabled
- Custom email template added
- Mobile responsive layout
- Production audit completed
- DB triggers for realtime counts
- helpful_count RLS bypass trigger added

### Session 2 continued — Ads & Production
- Google AdSense approved and configured
- Auto ads ON, superposition formats OFF, bannières only
- ads.txt added to /public with publisher ID pub-9230269242068997
- AdSense script added to public/index.html
- Site under review by Google (1-7 days)
