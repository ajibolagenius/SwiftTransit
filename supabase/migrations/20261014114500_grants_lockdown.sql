-- Grants lockdown (spec 0002 task 5, paired with the blanket revoke rule;
-- AC-3, AC-4, AC-11). Runs after every object exists, so nothing created in
-- earlier migrations keeps Supabase's default anon/authenticated grants.
-- Revoke by construction, then grant exactly the RLS matrix.

do $$
declare
  r record;
begin
  for r in
    select c.oid::regclass as rel
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p', 'v')
  loop
    execute format('revoke all on %s from anon, authenticated', r.rel);
  end loop;

  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', r.sig);
  end loop;
end;
$$;

-- Table grants: SELECT broadly as stated, INSERT only where the client owns
-- the row lifecycle, UPDATE only on the four editable tables, no DELETE
-- grants at all except addresses (matrix).
grant select, update on public.profiles to authenticated;
grant select, insert, update on public.courier_applications to authenticated;
grant select, update on public.couriers_status to authenticated;
grant select, insert, update, delete on public.addresses to authenticated;
grant select on public.orders to authenticated;
grant select on public.order_events to authenticated;
grant select, insert on public.messages to authenticated;
grant select on public.wallet_transactions to authenticated;
grant select on public.pricing_rules to authenticated;
grant select on public.public_profiles to authenticated;

-- Function grants: RPCs to authenticated only (never anon). The blanket
-- revoke above strips Supabase's default authenticated EXECUTE too, so
-- internal helpers stay ungranted by construction: _tracking_letter,
-- _generate_tracking_code, _set_tx_key, _tx_key, _is_privileged and
-- record_wallet_tx (the ledger is written only inside pay_order and
-- change_order_status, which already run as the definer). Pin triggers
-- fire as the calling role so they need no EXECUTE.
grant execute on function public.is_order_participant(uuid) to authenticated;
grant execute on function public.complete_registration(text, text, public.user_role) to authenticated;
grant execute on function public.quote_price(double precision, double precision, double precision, double precision, public.package_size, public.handling_flag[], numeric) to authenticated;
grant execute on function public.create_order(jsonb, text) to authenticated;
grant execute on function public.pay_order(uuid, text, text) to authenticated;
grant execute on function public.assign_order(uuid) to authenticated;
grant execute on function public.change_order_status(uuid, public.order_status) to authenticated;
-- The pin triggers are security invoker and call _is_privileged as the
-- client role; the helper only reports the calling role, never data.
grant execute on function public._is_privileged() to authenticated;
grant execute on function public.wallet_balance() to authenticated;
grant execute on function public.set_online(boolean) to authenticated;
grant execute on function public.update_courier_location(double precision, double precision) to authenticated;
grant execute on function public.nearby_orders(numeric) to authenticated;
