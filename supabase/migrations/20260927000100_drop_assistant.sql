-- ============================================================================
-- 9rawZid9ra — Drop the AI assistant (permanently on hold)
-- ----------------------------------------------------------------------------
-- Prompt 27 (the assistant page/UI) was skipped for the whole of Phase 3: no
-- Anthropic key was ever set, no edge function was ever deployed, and
-- assistant_messages has zero rows. The recommendation RPCs from the same
-- migration (recommend_for_me, get_related_modules, get_missing_resources,
-- get_module_overview) are useful on their own and already wired into the
-- frontend (Prompt 28) — those stay. Only the assistant-specific tables and
-- quota functions from 20260926000500_assistant.sql are removed here.
-- ============================================================================

begin;

drop function if exists public.assistant_consume(integer);
drop function if exists public.assistant_quota();
drop table if exists public.assistant_messages cascade;
drop table if exists public.assistant_conversations cascade;

commit;
