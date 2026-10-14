-- pg_cron job definitions (spec 0002 task 7).
-- NOT part of the migration set (the local stack has no pg_cron). Apply on the
-- linked remote project via the dashboard SQL editor after deploying the
-- delete-package-photos Edge Function and saving its URL and the service key
-- as function settings (dashboard Edge Functions > Settings, or
-- `supabase secrets set FUNCTION_URL_DELETE_PACKAGE_PHOTOS=... SERVICE_KEY=...`).

select cron.schedule(
  'nightly-package-photo-sweep',
  '0 2 * * *',
  $$
  select net.http_post(
    url := (select (get_settings_by_key('FUNCTION_URL_DELETE_PACKAGE_PHOTOS')).setting),
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select (get_settings_by_key('SERVICE_KEY')).setting)
    )
  ) as request_id;
  $$
);
