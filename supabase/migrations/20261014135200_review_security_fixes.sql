-- Security fixes from code review (docs/reviews/2026-10-14-feat-data-model-security.md).
-- Mirrors the corrected 20261014114200 and 20261014114500 migrations for
-- databases that already applied them (the hosted project). Idempotent:
-- a fresh db reset replays this after the edited migrations with no change.
--
-- 1. pay_order checks ownership BEFORE the replay short circuit, so a
--    stranger never receives another customer's order row (receiver phone,
--    addresses).
-- 2. change_order_status requires the caller to be a participant (customer
--    or assigned courier) for the failed transition; the service role path
--    (null uid) stays allowed.
-- 3. The ledger writer record_wallet_tx and the internal helpers lose client
--    EXECUTE. The blanket revoke must include PUBLIC: Supabase's default
--    grant is to PUBLIC, and authenticated is a member of PUBLIC, so
--    revoking from the named roles alone changes nothing.

create or replace function public.pay_order(order_id uuid, idempotency_key text, payment_reference text)
returns public.orders
language plpgsql volatile security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  o public.orders;
  balance bigint;
begin
  if uid is null then
    raise exception 'swifttransit.auth.no_session' using errcode = 'P0001';
  end if;
  if payment_reference is null or btrim(payment_reference) = '' then
    raise exception 'swifttransit.payment.reference_required' using errcode = 'P0001';
  end if;

  select * into o from public.orders where id = order_id;
  if not found then
    raise exception 'swifttransit.order.not_found' using errcode = 'P0001';
  end if;

  -- Ownership first: a stranger gets not_owner whatever the status is, so a
  -- replay never returns another customer's row (receiver phone and addresses).
  if o.customer_id <> uid then
    raise exception 'swifttransit.order.not_owner' using errcode = 'P0001';
  end if;

  -- Replay: a paid order returns the original outcome, nothing is written twice.
  if o.status <> 'pending_payment' then
    return o;
  end if;

  perform public._set_tx_key(idempotency_key);

  if o.payment_method = 'wallet' then
    balance := public.wallet_balance();
    if balance < o.total_kobo then
      raise exception 'swifttransit.wallet.insufficient_balance' using errcode = 'P0001';
    end if;
    perform public.record_wallet_tx('booking', -o.total_kobo, o.id, o.customer_id,
                                    'pay:' || idempotency_key);
  else
    -- Card: booking rows are spend history and never move a balance.
    perform public.record_wallet_tx('booking', -o.total_kobo, o.id, o.customer_id,
                                    'pay:' || idempotency_key);
  end if;

  update public.orders
     set status = 'searching', payment_reference = pay_order.payment_reference
   where id = order_id;
  insert into public.order_events (order_id, status, actor_id) values (order_id, 'searching', uid);

  select * into o from public.orders where id = order_id;
  return o;
end;
$$;

create or replace function public.change_order_status(order_id uuid, new_status public.order_status)
returns public.orders
language plpgsql volatile security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  actor uuid;
  o public.orders;
  courier uuid;
  legal boolean;
begin
  if uid is null then
    -- Service role (no JWT sub): allowed only for the failed transition.
    if new_status <> 'failed' then
      raise exception 'swifttransit.order.system_only' using errcode = 'P0001';
    end if;
  end if;

  select * into o from public.orders where id = order_id;
  if not found then
    raise exception 'swifttransit.order.not_found' using errcode = 'P0001';
  end if;

  if o.status in ('delivered', 'cancelled', 'failed') then
    raise exception 'swifttransit.order.invalid_transition' using errcode = 'P0001';
  end if;

  if new_status = 'cancelled' then
    if o.status not in ('pending_payment', 'searching', 'assigned') then
      raise exception 'swifttransit.order.invalid_transition' using errcode = 'P0001';
    end if;
    if uid is distinct from o.customer_id then
      raise exception 'swifttransit.order.forbidden' using errcode = 'P0001';
    end if;
    actor := uid;
  elsif new_status = 'failed' then
    -- Client path: only a participant may fail the order. A null uid got here
    -- from the top check (service role only for failed), so it skips this.
    if uid is not null
       and uid is distinct from o.customer_id
       and uid is distinct from o.courier_id then
      raise exception 'swifttransit.order.forbidden' using errcode = 'P0001';
    end if;
    actor := uid; -- null actor means the service role path
  else
    if uid is distinct from o.courier_id then
      raise exception 'swifttransit.order.forbidden' using errcode = 'P0001';
    end if;
    legal := (o.status = 'assigned'   and new_status = 'at_pickup')
          or (o.status = 'at_pickup'  and new_status = 'picked_up')
          or (o.status = 'picked_up'  and new_status = 'at_dropoff')
          or (o.status = 'at_dropoff' and new_status = 'delivered');
    if not legal then
      raise exception 'swifttransit.order.invalid_transition' using errcode = 'P0001';
    end if;
    actor := uid;
  end if;

  -- Cancel from assigned frees the courier (invariant 6). The courier_id is
  -- cleared in its own statement so the terminal trigger still sees
  -- old.courier_id when the status row lands on 'cancelled'.
  if new_status = 'cancelled' and o.status = 'assigned' then
    courier := o.courier_id;
    update public.orders set courier_id = null where id = order_id;
    if o.payment_method = 'wallet' then
      perform public.record_wallet_tx('refund', o.total_kobo, o.id, o.customer_id,
                                      'refund:' || o.id, false);
    end if;
  end if;

  update public.orders set status = new_status where id = order_id;

  if courier is not null then
    update public.couriers_status
       set current_order_id = null
     where courier_id = courier and current_order_id is not null;
  end if;

  insert into public.order_events (order_id, status, actor_id) values (order_id, new_status, actor);

  select * into o from public.orders where id = order_id;
  return o;
end;
$$;

-- Stricter function lockdown: strip the default PUBLIC execute entry, then
-- re-grant exactly the RPC matrix (record_wallet_tx dropped, _is_privileged
-- added for the security invoker pin triggers).
do $$
declare
  r record;
begin
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
