-- Enable hourly purge of popisi older than 48h (requires pg_cron in Supabase Dashboard)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'purge-expired-popisi';

SELECT cron.schedule(
  'purge-expired-popisi',
  '0 * * * *',
  $$SELECT public.purge_expired_popisi()$$
);
