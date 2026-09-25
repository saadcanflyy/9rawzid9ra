# Local SQL tests for the 2026-09-25 migrations

`00_stub.sql` recreates the production tables, policies and triggers that the migrations touch
(copied from the live schema on 2026-09-24), plus stand-ins for Supabase's `auth`, roles, Vault and pg_net.
`01_seed.sql` adds a few schools, modules and four users (admin, two students, a moderator).

Run (needs a local Postgres 15+ listening on port 5433, socket in /tmp):

    supabase/tests/run_all.sh

Each suite starts from a fresh database, applies every migration in `supabase/migrations/2026092500*`,
then checks behaviour as real roles (anon / authenticated users) — e.g. "a student cannot make
themselves admin", "3 reports send a document to review", "5 positive reviews verify it",
"exam réseau 2024 returns the 2023/2024 exam first".
Last run: 100 passed, 0 failed.
