# Database reference — security, quality, reputation, search, onboarding, professors, assistant

Covers the migrations in `supabase/migrations/`, all applied, in this order:

Phase 2 (2026-09-25):
1. `20260925000100_security_hardening.sql`
2. `20260925000200_document_quality.sql`
3. `20260925000300_reputation.sql`
4. `20260925000400_search.sql`
5. `20260925000500_onboarding_home.sql`
6. `20260925000600_notify_email_vault.sql`

Phase 3 (2026-09-26) — see the "Phase 3" section below:
7. `20260926000100_professors.sql`
8. `20260926000200_quality_v2.sql`
9. `20260926000300_search_v2.sql`
10. `20260926000400_reputation_v2.sql`
11. `20260926000500_assistant.sql` (database schema only — edge function not deployed)

All privileged writes go through `SECURITY DEFINER` functions (RPCs) that check the caller with `is_admin()` / `is_staff()`. The browser only ever reads or writes its own rows through RLS-permitted columns.

## Tables added

| Table | Purpose |
|---|---|
| `document_feedback` | One row per (document, user): `correct_module`, `readable`, `complete` (boolean or null). Feeds the quality score and community verification. Unique on `(document_id, user_id)`. |
| `moderation_log` | Append-only audit trail of every `moderate_document()` call: `document_id`, `staff_id`, `action`, `note`, `created_at`. Staff-readable only. |
| `reputation_rules` | One row per point-earning event type: `points`, `daily_cap`, `label`. Seeded with the 10 rules below. Publicly readable. |
| `reputation_events` | The append-only ledger. Every award/revoke is one row with a unique `dedupe_key` (e.g. `upload:42`, `helpful:42:<uid>`) so nothing is double-counted and anything can be cancelled by deleting its row (`revoke_reputation`). |
| `badges` / `user_badges` | Badge catalogue (11 seeded) and per-user awards. Publicly readable. |
| `search_synonyms` | `term → expansion` (e.g. `reseau → reseaux`, `bdd → bases donnees`). Publicly readable. |
| `search_log` | Every search: `query`, `filters`, `results` count, `clicked`. Staff-readable only; feeds `get_search_insights()`. |

## Columns added

- **`user_profiles`**: `faculty_id`, `filiere_id`, `current_semester`, `onboarded_at` (onboarding). Browser may only `update` these columns (plus `name`, `bio`, `university_id`, `wants_ai_notification`) — everything else (`is_admin`, `is_moderator`, `is_premium`, `points`, `is_banned`, `banned_until`, `ban_reason`, `uploads_count`, …) is `revoke`d from `authenticated` and only changed by RPCs or triggers.
- **`documents`**: `status` (`pending_review` | `published` | `verified` | `needs_review` | `rejected`, replaces the old `is_verified`/`is_flagged` pair as the source of truth — those two booleans are now *derived* from `status` and kept for UI compatibility), `quality_score` (0–100), `quality_signals` (jsonb checklist), `quality_updated_at`, `verification_source` (`staff` | `community`), `file_hashes` (text[], for duplicate detection). Browser may only `update` `title`, `doc_number`, `academic_year`, `professor`, `doc_type`, `pages_count`.
- **`document_reactions`**: `report_details` (free text, max 500 chars, alongside the existing `report_reason`).
- **`modules`**: `search_doc` (normalized text blob for trigram search), `docs_count`, `verified_docs`, `doc_types` (text[]), `years` (text[]), `last_doc_at` — all cached and kept current by triggers, so pages no longer need extra count queries.
- **`senpai_replies`**: `is_best` (boolean, set by `mark_best_reply`).

## RPCs

### Security (migration 100)

| Function | Args | Returns | Who |
|---|---|---|---|
| `is_admin()` | — | boolean | anon, authenticated |
| `is_staff()` | — | boolean (admin or moderator) | anon, authenticated |
| `admin_set_moderator(p_user, p_value)` | uuid, boolean | void | admin only |
| `admin_set_premium(p_user, p_until)` | uuid, timestamptz | void | admin only |
| `mod_ban_user(p_target_id, p_is_banned, p_banned_until, p_ban_reason)` | uuid, boolean, timestamptz, text | boolean | staff (pre-existing function, unchanged by this kit) |
| `record_download(p_document_id)` | integer | void | authenticated. Once per user/document/day; increments `documents.downloads`, `user_profiles.downloads_count` (self) and `total_downloads` (uploader). |
| `staff_notify(p_user, p_type, p_content, p_link)` | uuid, text, text, text | void | staff. Inserts one notification with `actor_id = auth.uid()`. |
| `admin_broadcast(p_content, p_link)` | text, text | integer (recipients) | admin only. Notifies every non-banned user. |

### Document moderation (migration 200 replaces the 100 version — same name, richer)

`moderate_document(p_document_id, p_action, p_module_id default null, p_note default null)` → void, staff only. Actions: `'verify'`, `'publish'`, `'review'`/`'hide'` (aliases, → `needs_review`), `'reject'` (requires nothing but accepts `p_note` as the reason), `'reset_reports'`, `'move'` (needs `p_module_id`), `'delete'`. Every call writes a `moderation_log` row; `'verify'`/`'reject'` also notify the uploader (unless they're the actor).

- `report_document(p_document_id, p_reason, p_details default null)` → void, authenticated. Upserts into `document_reactions` (reaction_type `'report'`), one per user per document; `p_reason` must be one of `wrong_module | bad_scan | incomplete | duplicate | wrong_info | inappropriate | other`.
- `find_duplicate_documents(p_hashes text[])` → table of `(document_id, title, doc_type, academic_year, module_id, module_name, module_slug)`, authenticated. Used by Upload before submitting.
- `get_moderation_queue(p_limit default 50)` → table of documents in `pending_review`/`needs_review`/reported, with a `reasons` jsonb map of report-reason → count, staff only. Extended (2026-09-26, Prompt 24) to also return `display_status`, `verification_source` and `quality_signals` so the moderation queue can show the same StatusBadge + per-criterion checklist icons as everywhere else.

### Staff / Senpai (migration 100)

- `staff_moderate_post(p_post_id, p_action)` → void, staff only. Actions: `'approve'`, `'hide'`, `'delete'`.
- `increment_post_views(p_post_id)` → void, anon + authenticated.

### Reputation (migration 300)

- `award_reputation(...)` / `revoke_reputation(p_dedupe)` / `check_badges(p_user)` — **internal only**, no grants to any role; called exclusively by triggers and `admin_adjust_reputation`.
- `admin_adjust_reputation(p_user, p_points, p_reason)` → void, admin only. Manual correction, logged in `points_log`.
- `mark_best_reply(p_reply_id)` → void, authenticated. Only the post's author may call it, and not on their own reply. Awards `+15` to the reply's author, unmarks any previous best reply.
- `reputation_level(p_points)` → `(level, name, min_points, next_min_points)`. Pure SQL, no auth.
- `get_leaderboard(p_period default 'week', p_university_id default null, p_filiere_id default null, p_limit default 50)` → ranked students for the period (`'week' | 'month' | 'all'`), anon + authenticated.
- `get_university_leaderboard(p_period default 'month', p_limit default 20)` → ranked schools, anon + authenticated.
- `get_my_reputation(p_period default 'week')` → the caller's own totals, level, and rank (overall + within their school), authenticated only.

### Search (migration 400)

- `search_catalog(p_query, p_university_id, p_faculty_id, p_filiere_id, p_semester, p_doc_type, p_year, p_verified_only, p_limit default 20, p_offset default 0)` → jsonb `{ query, expanded, fuzzy, documents: [...8 max], modules: [...], total_modules }`. anon + authenticated. Two-pass matching (exact trigram, then typo-tolerant fuzzy only if pass 1 finds nothing); ranks by text similarity + quality + verified + downloads + the caller's own school/filière/semester as a boost.
- `search_suggest(p_prefix, p_limit default 8)` → table `(kind, id, label, sublabel, slug, docs_count, score)` mixing modules/filières/universities, anon + authenticated. Needs ≥ 2 normalized characters.
- `log_search(p_query, p_filters default '{}', p_results default 0, p_clicked default null)` → void, anon + authenticated, fire-and-forget.
- `get_search_insights(p_days default 30)` → per-query search/zero-result counts, staff only.
- Helpers (not meant to be called directly from the browser, but usable in any query): `search_norm(text)`, `filiere_aliases(name, abbr)`, `semester_matches(value, filter)`.

### Onboarding / home (migration 500)

- `complete_onboarding(p_university_id, p_faculty_id default null, p_filiere_id default null, p_semester default null, p_follow_modules default true)` → integer (modules newly followed), authenticated. Re-derives faculty/university from the filière server-side (never trusts the browser's hierarchy); optionally bookmarks up to 30 modules of that filière+semester.
- `get_home_feed()` → jsonb `{ profile, my_modules, recent_documents, missing, requests, reputation }` for the signed-in user, authenticated only.
- `get_platform_stats()` → jsonb of platform-wide counts (universities, filieres, modules, documents, verified_documents, documents_this_week, contributors, modules_with_documents), anon + authenticated.

## Triggers

| Table | Trigger | Fires on | Does |
|---|---|---|---|
| `documents` | `trg_documents_sanitize_insert` | BEFORE INSERT | Non-staff uploads: forces `uploader_id`, resets all trust/counter columns, sets `status` from the content-flag scan, and flags duplicates by `file_hashes` overlap. |
| `documents` | `trg_documents_z_quality` | BEFORE INSERT/UPDATE | Auto-hides docs with too many reports (`published`→`needs_review` at 3, `verified`→`needs_review` at 5), applies community verification (≥5 feedback answers, ≥80% positive on each criterion, avg rating ≥4★, zero reports), syncs `is_verified`/`verified`/`is_flagged` from `status`, recomputes `quality_score`/`quality_signals`. Named with a `z_` prefix so it runs after the sanitize trigger (same-event triggers fire alphabetically). |
| `documents` | `trg_documents_cleanup_delete` | AFTER DELETE | Deletes the doc's `downloads_log` and `document_reactions` rows, decrements the uploader's `uploads_count`. |
| `documents` | `trg_rep_documents` | AFTER INSERT/UPDATE OF status/DELETE | Awards `upload_published` (+10) on first publish, `doc_verified` (+40) on verify, `doc_rejected` (−50) + awards reporters `report_confirmed` (+10) on reject; revokes the matching events when a doc is un-verified, un-rejected or deleted. |
| `documents` | `trg_documents_module_stats` | AFTER INSERT/UPDATE OF module_id, status, doc_type, academic_year/DELETE | Recomputes the old and new module's cached `docs_count`/`verified_docs`/`doc_types`/`years`/`last_doc_at`. |
| `document_reactions` | `trg_doc_reaction_counts` | AFTER INSERT/UPDATE/DELETE | Recomputes `documents.helpful_count`/`rating_sum`/`rating_count`/`report_count`/`reported_count` from the reactions table. |
| `document_reactions` | `trg_rep_reactions` | AFTER INSERT/UPDATE/DELETE | Awards `helpful_received` (+5) / `rating_received` (+3, only for 4★+) to the uploader; revokes on delete or on a rating drop below 4★. |
| `document_reactions`, `document_feedback` | `trg_block_self_review` | BEFORE INSERT/UPDATE | Raises an error if you try to rate/mark-helpful/give-feedback on your own document. |
| `document_feedback` | `trg_feedback_touch_document` | AFTER INSERT/UPDATE/DELETE | Touches the document's `quality_updated_at` so the quality trigger recomputes on the next update. |
| `document_feedback` | `trg_rep_feedback` | AFTER INSERT | Awards `feedback_given` (+1, capped 10/day). |
| `document_request_votes` | `trg_request_votes` | AFTER INSERT/DELETE | Recomputes `document_requests.votes` as a plain count. |
| `senpai_replies` | `trg_rep_replies` | AFTER INSERT/DELETE | Awards `answer_posted` (+5, capped 25/day); revoked on delete. |
| `senpai_votes` | `trg_rep_senpai_votes` | AFTER INSERT/DELETE | Awards the post author `post_helpful_received` (+2, capped 40/day). |
| `modules` | `trg_modules_search_doc` | BEFORE INSERT/UPDATE OF name, filiere_id, semester | Rebuilds `search_doc`. |
| `filieres`/`faculties`/`universities` | `trg_*_refresh_search` | AFTER UPDATE OF name (+ abbreviation/city) | Rebuilds `search_doc` for every module under the renamed row. |
| `notifications` | `"notify-email"` (migration 600 only) | AFTER INSERT | Calls the `notify-email` edge function via `net.http_post`, reading its secrets from Vault instead of the trigger body. |

## Point rules (`reputation_rules`)

| Event | Points | Daily cap |
|---|---|---|
| `upload_published` | +10 | — |
| `doc_verified` | +40 | — |
| `helpful_received` | +5 | 100 |
| `rating_received` (4★ or 5★ only) | +3 | 60 |
| `feedback_given` | +1 | 10 |
| `answer_posted` (Senpai Zone) | +5 | 25 |
| `post_helpful_received` | +2 | 40 |
| `best_answer` | +15 | — |
| `report_confirmed` | +10 | — |
| `doc_rejected` | −50 | — |
| `admin_adjustment` | variable | — (manual, via `admin_adjust_reputation`) |

Every award is deduplicated by a stable key (e.g. `helpful:<doc_id>:<user_id>`) — the same event can never be counted twice, and deleting the underlying action (unrate, delete a document, un-verify) revokes exactly the points it gave, no more.

## Levels (`reputation_level` / `src/lib/reputation.js`)

| Level | Name | Min points |
|---|---|---|
| 1 | Nouveau | 0 |
| 2 | Contributeur | 50 |
| 3 | Expert | 300 |
| 4 | Mentor | 1000 |
| 5 | Légende du campus | 3000 |

A `level_up` notification fires automatically the moment a user's total crosses a threshold.

## Quality score (0–100, `compute_document_quality`)

- **Verification** (25 pts): verified → 25, published → 10, else 0.
- **Rating** (25 pts): Bayesian average (`(sum + 9) / (count + 3)`, i.e. a 3-vote 3★ prior) scaled from 1–5★ to 0–25.
- **Correct module / Readable / Complete** (15 pts each): share of "yes" answers in `document_feedback`, with a 70%-over-2-votes prior; needs ≥ 2 answers to leave `'unknown'`.
- **Helpful** (5 pts): 1 point per helpful vote, capped at 5.
- **Reports**: −8 per report, capped at −40.
- `status = 'rejected'` short-circuits to a flat 0.

`quality_signals` (jsonb) mirrors the checklist state (`'yes' | 'no' | 'unknown'`) plus `rating_avg`, `feedback_count`, `reports`, `recently_verified` (verified within 180 days) — this is exactly what `src/lib/quality.js`'s `qualityChecklist()`/`qualityLevel()` render.

**Community verification**: a `published` document with ≥ 5 answers on every feedback criterion, ≥ 80% "yes" on each, an average rating ≥ 4★ (if any ratings exist) and zero open reports is auto-promoted to `verified` with `verification_source = 'community'` — no staff action needed.

## Email webhook (migration 600) — applied 2026-09-25

Both Vault secrets (`notify_email_webhook_secret`, `supabase_anon_key`) were created and the migration applied and tested end-to-end (trigger → Vault → authenticated HTTP call → edge function, HTTP 200). Rolling the `service_role` key (the old trigger had it in plain text) is optional and not yet done.

# Phase 3 — professors, quality v2, search v2, reputation v2, assistant (2026-09-26)

Applied 2026-09-25, migrations `20260926000100`–`500` (the assistant *database schema* only — the edge function/UI were intentionally not deployed). Requires all six 2026-09-25 migrations.

## New tables

| Table | Purpose |
|---|---|
| `professors` | One row per real person: `display_name`, `name_key`/`first_key` (matching keys), `status` (`pending`\|`verified`\|`merged`\|`rejected`), `merged_into`. |
| `professor_aliases` | Every raw spelling ever seen for a professor (`alias_norm` primary key), so "Benali"/"Pr Benali"/"A. Benali" all resolve to the same profile. |
| `professor_feedback` | Structured, resource-focused feedback only: `exam_style`, `materials_help` (boolean), `difficulty` (1–5). No free text. Shown only from ≥ 3 answers. Unique on `(professor_id, user_id, module_id)`. |
| `search_place_words` | City/place-name words excluded when deriving acronym aliases (so "Faculté des Sciences de Rabat" → `fs`, not `fsdr`). |
| `institution_aliases` | Curated school/faculty aliases names don't already contain (`um5`, `uit`, `uh2c`, …). Staff-writable, publicly readable. |
| `assistant_conversations` / `assistant_messages` | AI assistant conversation history (owner-only RLS). Messages keep the `cards` shown and the `context` understood. Schema only — no edge function deployed, so these sit unused until the assistant is built. |

## New columns

- **`documents`**: `professor_id` (FK to `professors`), `display_status` (generated: `pending`\|`community_approved`\|`verified`\|`rejected`, derived from `status`+`verification_source`), `search_text` (title/number/professor name, trigram-indexed).
- **`document_feedback`**: `correct_university` (boolean) — the "Bonne école" criterion.
- **`universities`/`faculties`/`filieres`**: `search_aliases` (text, cached acronyms/abbreviations, kept current by triggers).
- **`user_badges`**: `times_awarded`, `last_period` (for repeatable monthly badges).

## RPCs

### Professors (migration 100)

- `professor_name_parts(p_raw)` → `(title, first_name, last_name, name_key, first_key, display_name)`. Pure parsing, no auth — strips titles, detects family name (ALL-CAPS or last word, particles like `ben`/`el`/`ait` glued to it).
- `resolve_professor(p_raw, p_university_id, p_faculty_id, p_limit)` → ranked candidate profiles (score ≥ 0.9 = safe auto-link), staff+internal use.
- `link_professor(...)` → internal only (no grants); links or creates a profile, called by the upload trigger and `propose_professor`.
- `search_professors(p_query, p_university_id, p_limit)` → anon+authenticated, powers the upload picker.
- `get_professor(p_id)` → jsonb profile page (affiliations, modules, teaching history, documents, feedback summary, aliases); follows `merged_into` redirects. anon+authenticated. Extended (2026-09-26, Prompt 23/24) so each row in `documents` also carries `display_status`, `verification_source` and `quality_signals`, needed for the profile page's status/quality badges.
- `propose_professor(p_name, p_university_id, p_faculty_id)` → authenticated; explicit "not in the list" add from the picker.
- Staff: `get_professor_queue(p_limit)`, `verify_professor(...)`, `merge_professors(p_from, p_into)`, `reject_professor(p_id)`.
- Trigger `trg_documents_link_professor` (before insert/update of `professor`/`professor_id`/`module_id`) keeps `documents.professor_id` in sync with whatever the browser sends (free text or a picked id).

### Quality v2 (migration 200)

- `compute_document_quality_v2(...)` → `(score, signals)`. New weights: validation 25 (verified 25 · community 22 · published 10), rating 20, bon module 15, bonne école 5, lisible 15, complet 15, utile 5, −8/report (max −40).
- `fn_documents_quality()` **replaces the phase-2 trigger function in place** (same name, same trigger `trg_documents_z_quality` — no re-`CREATE TRIGGER` needed). Adds the "bonne école" criterion to community-approval (≥ 3 answers, ≥ 80% yes) alongside the existing module/readable/complete checks.
- `documents.display_status` is what the UI should read now instead of deriving status itself: `pending` / `community_approved` / `verified` / `rejected`.

### Search v2 (migration 300)

- `search_norm(p)` **replaces the phase-2 version** — now also folds roman numerals II–VIII to digits ("Analyse II" ↔ "analyse 2"); I and V are left alone (`"Mohammed V"`).
- `entity_aliases(p_name, p_abbr)` → generic alias derivation (parenthesised acronym, prefix before " - ", initials with/without place words).
- `resolve_academic_context(p_text)` → jsonb `{ university, faculty, filiere, module, module_candidates[], professor, semester, year, doc_types[], remaining }`. anon+authenticated. Used by search and (if built) the assistant.
- `search_catalog(...)` **replaces the phase-2 version**, same name, adds `p_module_id`, `p_professor_id`, `p_doc_types text[]`. Ranking: validation (verified 0.45 / community 0.35) → usefulness (helpful + quality) → recency (half-weight ~1yr) → contributor reputation → own-school/filière boost.
- `search_suggest(p_prefix, p_limit)` **replaces the phase-2 version** — adds `faculty` and `professor` kinds.
- Institution/module/filière/faculty/university "search_aliases"/"search_doc" columns are rebuilt by triggers whenever names or `institution_aliases` change.

### Reputation v2 (migration 400)

- `reputation_level(p_points)` **replaces the phase-2 version** — new thresholds: Nouveau 0 · Contributeur 50 · Contributeur de confiance 250 · Expert 750 · Légende du campus 2500.
- New badges: `downloads_100`, `quality_contributor`, `community_helper` (phase-2's `verified_5`/`helper_10` were folded into these, old codes deleted), `top_university_contributor` (repeatable monthly, `times_awarded`/`last_period`).
- `award_top_university_contributors(p_month default null)` → staff or scheduler only. Scheduled via `pg_cron` on the 1st of each month at 02:00 UTC **if the extension is enabled** (Dashboard → Database → Extensions); otherwise call it manually.
- `get_leaderboard(...)` **replaces the phase-2 version** — adds `p_faculty_id`, returns `faculty_id`/`faculty_name`.
- `get_faculty_leaderboard(p_period, p_university_id, p_limit)` → new, school-scoped faculty rankings.
- `get_my_reputation(...)` **replaces the phase-2 version** — adds `faculty_rank`.
- `award_top_university_contributors(...)` **updated 2026-09-26 (migration 510, Prompt 26)** — the `badge` notification it inserts now links to `/classement?scope=university` instead of the bare `/classement`, so it lands the recipient on their school's ranking. Frontend: `src/lib/reputation.js` exports `LEVEL_TONES`/`BADGE_TIER_TONES`/`RANKING_SCOPES`/`rankLabel`; `levelFor()` now also returns `icon`/`tone`. New shared components `LevelBadge`/`LevelProgress`/`BadgeChip` in `src/design-system/ui.js` replace the per-page inline `LEVEL_TONES` + `Badge`/`ProgressBar` duplication (Browse, Profile, Home, Classement, Upload, ModulePage). Classement gained a Facultés tab (`get_faculty_leaderboard`) and a Global/Mon école/Ma faculté scope pill for Étudiants (driving `get_leaderboard`'s `p_university_id`/`p_faculty_id`); Profile gained a "Réputation" card with 3 ranks (`get_my_reputation`); ModulePage's document rows now show "Partagé par X" + a level badge; Upload's stale hardcoded `RANKS` (0–99/100–299/300–599/600+, unrelated to the real levels) was replaced with `levelFor()` and a new "Ce que tu vas gagner" card.

### Assistant / recommendations (migration 500)

- `assistant_quota()` / `assistant_consume(p_tokens)` → authenticated. Daily limit 15 (free) / 200 (premium), counted in the existing `ai_usage` table (`feature = 'assistant'`).
- `get_module_overview(p_module_id)` → jsonb (by doc type, missing types, professors, open requests). anon+authenticated. **Consumed 2026-09-26 (Prompt 28)**: ModulePage reads `missing_types` for the "Ce qui manque" strip (with "Demander"/"Je l'ai, je partage" actions) and `professors` for the byline chips under the module title.
- `get_related_modules(p_module_id, p_limit)` → same filière / same subject elsewhere / "also downloaded". anon+authenticated. **Consumed (Prompt 28)**: ModulePage's "Modules liés" section (grouped by `relation`), replacing the old same-filière-only sidebar query.
- `recommend_for_me(p_limit)` → authenticated only; documents for the caller's filière/semester/bookmarked modules they haven't downloaded. **Consumed (Prompt 28)**: Home's "Recommandé pour toi" row (new `DocumentCard` component in `ui.js`), eyebrow = `reason`.
- `get_missing_resources(p_filiere_id, p_semester, p_limit)` → anon+authenticated; modules missing doc types + open request counts. **Consumed (Prompt 28)**: Home's "Ce qui manque dans ta filière" (filtered to `docs_count > 0` — modules with zero documents stay in the older `get_home_feed().missing` "Sois le premier" section so the two don't duplicate).
- `src/lib/rpcCache.js` (new, Prompt 28): a tiny session-lived `Map` cache (`cachedRpc(supabase, name, args, ttlMs=300000)`) keyed by RPC name + args, used by Home and ModulePage for these four calls so they don't refire on every tab switch/revisit.
- Upload.js now reads `?module=<id>&type=<doc_type>` (Prompt 28) and resolves the module's full université→faculté→filière→semestre chain to prefill the wizard and jump to step 2.
- **Removed 2026-09-27 (migration 20260927000100)**: `assistant_conversations`, `assistant_messages`, `assistant_quota()`, `assistant_consume()`. The AI assistant (Prompt 27) was never deployed — no Anthropic key was ever set, no edge function ever ran, `assistant_messages` had zero rows — and is now permanently on hold, replaced by the "Senpai de filière" feature below. `supabase/functions/assistant/index.ts` is left in the repo as dead code (not deployed, not referenced) rather than deleted, in case the assistant is revisited later.

### Staff & admin phase 3 (2026-09-26, Prompt 29)

- **Skipped**: `get_assistant_stats(p_days)` / `get_assistant_bad_answers(p_limit)` and the Admin "Assistant" card / "Réponses mal notées" list — both are entirely about usage of the AI assistant (Prompt 27), which stays skipped per explicit instruction. `assistant_messages` has zero rows since nothing has ever called the assistant, so these would be dead UI regardless.
- Professor-queue counter badge in the staff nav (`stats.pendingProfessors` on the `professors` tab item) — already shipped in Prompt 23, confirmed present in both `Admin.js` and `ModeratorPanel.js`, no change needed.
- Institution aliases editor (new): a table + "Ajouter un alias" modal in the "Écoles" tab of both `Admin.js` and `ModeratorPanel.js` (`institution_aliases` joined to `universities`/`faculties`). Insert/delete go straight through Supabase RLS ("Staff manage institution aliases", `is_staff()` = admin or moderator — no new RPC needed). The alias text is normalized client-side via the existing `search_norm(p)` RPC (granted to `PUBLIC`) before insert, matching what `entity_aliases()`/`resolve_academic_context()` expect. Deleting/inserting a row already re-runs `search_doc` on the affected modules via the existing `trg_institution_aliases_refresh` trigger.
- Search insights "Compris" column (Admin.js only, `get_search_insights` table on the Analytics tab): for the top 20 zero-result queries, `resolve_academic_context(query)` is resolved and rendered through `contextToFilters(ctx).chips` (`src/lib/searchParser.js`), so staff can see what the parser understood (or didn't) for queries that returned nothing.

### Senpai de filière (2026-09-27, migration 20260927000200)

Volunteer student mentors, one to three per filière, in place of the AI assistant (dropped the same day — see above). A student with a filière set can apply to become a benevole "senpai" for it; auto-activated at level ≥ 3 (Contributeur de confiance), otherwise queued for staff approval.

- **Tables**: `senpai_profiles` (`user_id` unique, `filiere_id`, `status` pending\|active\|paused\|rejected, `help_with text[]`, `response_estimate`, `weekly_limit`, `is_graduate`, `semester_label` snapshotted at application time); `senpai_contacts` (one row per "Lui écrire" click — `senpai_id`, `student_id`, `marked_helpful`); `senpai_reports` (staff-only). RLS: owner or staff can read/update a `senpai_profiles` row; no direct `senpai_contacts` insert policy at all — only `log_senpai_contact()` can write one, because the daily/weekly caps are cross-row counts RLS can't express.
- **Contact is deliberately NOT relayed or logged content**: "Lui écrire" builds a `mailto:` link client-side (in an `onClick`, never a static `href`) with the senpai's real email — from `user_profiles.email`, returned by the RPCs below — and opens the student's own mail client. No edge function, no email-sending API key, and the reply is never seen by us. Trade-off, stated plainly: we can't detect whether a senpai ever actually replies, so there's no real "responds within Xd" (self-reported `response_estimate` instead) and no auto-hide-after-30-days-silent (contact/helpful counts are surfaced to staff in the Admin/ModeratorPanel "Senpais de filière" tab instead, for manual follow-up).
- **RPCs** (authenticated only, matching every other authenticated-only RPC in this schema): `apply_to_be_senpai(p_help_with, p_response_estimate, p_weekly_limit, p_is_graduate)`, `update_senpai_profile(...)`, `pause_senpai(p_paused)`, `get_filiere_senpais(p_filiere_id)` (≤3, includes `email`), `get_user_senpai_profile(p_user_id)` (for a profile page's badge/contact button), `get_my_senpai_profile()` (own status + contact/helpful counts), `log_senpai_contact(p_senpai_id)` (enforces 3/day per student and the senpai's own weekly cap, raises `daily_limit`/`senpai_full`), `mark_senpai_contact_helpful(p_contact_id)`. Staff: `get_senpai_applications(p_status)`, `approve_senpai(p_id)`, `reject_senpai(p_id)`, `report_senpai(...)`, `get_senpai_reports(p_resolved)`, `resolve_senpai_report(p_id)`.
- **Reputation/badges**: new `reputation_rules` row `senpai_helpful` (+5 pts, daily cap 50, via `award_reputation()`) awarded to the senpai — never to the message sender, and only on a confirmed "ça m'a aidé" mark, not per message received, so it can't be farmed. New badge `senpai_filiere` (gold, icon `heart`), awarded on activation (auto or staff-approved).
- **Frontend**: `src/lib/senpai.js` (constants, `semesterAtLeast()`, `contactSenpai()`, error-message mapping); new `SenpaiCard`/`DocumentCard`-style component in `ui.js` + `src/components/SenpaiSection.js` (fetch-and-render, reused by Home, Browse's filière view and the onboarding reveal). Surfaces: end of onboarding (`WelcomeModal.js`, now 5 steps — the reveal is step 4, skippable), Home sidebar, Browse `?fil=<id>` view, a discreet line under the module title on ModulePage (gated to modules whose filière has an active senpai), a "Senpais de filière" section + "Devenir senpai" application form in `SenpaiZone.js` (a `viewMode` toggle alongside the existing Q&A feed — **not** the pre-existing `senpai` tab/branding, which is the unrelated Senpai Zone Q&A moderation queue), a "Mon espace senpai" tab on `Profile.js` (own profile, pause switch + edit), a badge + "Lui écrire" on any profile that's an active senpai, and recruiting lines on the Upload success screen and Classement (gated to `semesterAtLeast(current_semester, 3)` — permissive when semester can't be parsed, since real data has mixed formats).
- `user_profiles.email`, `filiere_id` and `current_semester` are now also selected by the global `AuthContext` profile (`src/context/AuthContext.js`), not just page-local queries — several of the surfaces above needed `current_semester`/`filiere_id` on `useAuth().profile` and it wasn't there before.
- **Not built**: a cross-filière/cross-school searchable senpai directory (the spec's "Senpai Zone tab listing all volunteers by school/filière, with a search") — `SenpaiZone.js`'s "Senpais de filière" view shows only the signed-in student's own filière, reusing `get_filiere_senpais`. A real directory would need a new paginated/searchable RPC; deferred as scope the mailto-based contact model doesn't require.

## Known follow-ups

- `pg_cron` is not enabled on this project — the monthly top-contributor award needs either enabling it (Dashboard → Database → Extensions) and re-running that `do $$ ... $$` block from migration 400, or calling `select award_top_university_contributors();` manually on the 1st of each month.
- `pg_trgm` remains installed in `public` (not moved to `extensions`) — several `SECURITY DEFINER` functions are pinned to `search_path = public` only, and moving the extension would break their trigram operator resolution. Left as-is deliberately; low-severity advisor note, not a real exposure.
- **`resolve_academic_context()` faculty resolution bug — fixed 2026-09-26.** `entity_aliases()` extracts a faculty's entire parenthesised short name verbatim as one alias string — e.g. "École Normale Supérieure de Rabat (ENS Rabat)" contributed the bare word `rabat` as a standalone matchable alias, not just `ens`/`ensr`. Since the faculty-matching `ORDER BY length(alias) DESC` treated every matched alias equally, a query like `"fs rabat"` (meant as **F**aculté des **S**ciences + Rabat) could resolve to any Rabat-based faculty whose parenthetical happened to contain "Rabat" (ENS Rabat, ENSAM Rabat…) instead of Faculté des Sciences de Rabat (FSR), because the incidental 5-letter alias `rabat` outranked FSR's legitimate 2-letter alias `fs`. **Fix**: the faculty-matching lateral in `resolve_academic_context()` now excludes `search_place_words` from its candidate aliases (`and alias not in (select word from search_place_words)`); university resolution is untouched and still matches on city names, which is correct there. Verified live: `select resolve_academic_context('analyse 2 fs rabat examen')` now returns `faculty: "Faculté des Sciences de Rabat (FSR)"` and, as a result, correctly finds the exact "Analyse 2" module too. Regression-checked against the other Prompt 25 test queries (`uit gi s5`, `td reseaux ensias 2024`, `fst settat thermo`) — all unchanged.
- `search_catalog()`'s document sub-query ignores `p_limit`/`p_offset` — it always returns up to 10 rows (or 50 when `p_module_id`/`p_professor_id` is set), regardless of what's passed in. Only the `modules` result respects `p_limit`/`p_offset`. Not currently an issue for the frontend (it doesn't paginate documents), but worth knowing before anything relies on `p_limit` for documents.
