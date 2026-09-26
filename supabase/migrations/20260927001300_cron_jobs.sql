-- ============================================================================
-- 9rawZid9ra — scheduled maintenance (pg_cron)
-- ----------------------------------------------------------------------------
-- Two jobs that used to need a human to click a button in the admin panel.
--
-- Times are given in UTC because that is what pg_cron reads. Morocco is UTC+1
-- all year (it does NOT observe DST the usual way — the clock goes back to
-- UTC+0 for Ramadan only, so during Ramadan these jobs fire one hour earlier
-- in local terms: 02:00 and 03:00. Harmless for both.)
--
--   03:00 Morocco -> 02:00 UTC   daily      pause_inactive_senpais()
--   04:00 Morocco -> 03:00 UTC   1st of mo  award_top_university_contributors()
--
-- Both functions are SECURITY DEFINER and guard on `auth.uid() is not null and
-- not is_staff()`. Under pg_cron there is no JWT, so auth.uid() is null and the
-- guard passes — that is deliberate, it is how a scheduler is allowed in while
-- a random authenticated student is not.
--
-- Safe to re-run: cron.schedule() upserts on jobname.
-- ============================================================================

create extension if not exists pg_cron;

select cron.schedule(
  'senpai-pause-inactive', '0 2 * * *',
  $$select public.pause_inactive_senpais()$$
);

select cron.schedule(
  'senpai-top-contributors', '0 3 1 * *',
  $$select public.award_top_university_contributors()$$
);

-- Inspect:   select jobid, jobname, schedule, active from cron.job order by jobid;
-- History:   select jobid, status, return_message, start_time
--              from cron.job_run_details order by start_time desc limit 20;
-- Unschedule: select cron.unschedule('senpai-pause-inactive');
