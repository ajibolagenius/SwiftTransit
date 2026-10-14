-- Realtime publication placeholder (spec 0002 task 1).
-- Supabase-managed databases (local stack and hosted) already ship the
-- `supabase_realtime` publication; creating publications needs superuser,
-- which migrations do not run as. This guards the assumption and reports it.
-- Tables join the publication in later migrations.

do $$
begin
  if not exists (select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime') then
    raise notice 'supabase_realtime publication is missing; create it as a superuser (dashboard SQL or ALTER DATABASE) before enabling realtime for tables';
  end if;
end;
$$;
