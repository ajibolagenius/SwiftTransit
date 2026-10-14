-- Security definer functions (spec 0002 task 6; AC-4, AC-5, AC-6, AC-10).
-- All: SECURITY DEFINER, search_path pinned to public, EXECUTE granted to
-- authenticated only (the lockdown migration re-applies this after the blanket
-- revoke), and each validates the caller with auth.uid() itself.
-- Failures raise SQLSTATE P0001 with a dot-namespaced key the app maps to
-- i18n copy.

-- Random letter from the unambiguous tracking alphabet (no 0, O, 1, I).
-- A fresh SPI plan per call keeps random() from collapsing repeats.
create function public._tracking_letter() returns text
language plpgsql volatile security definer set search_path = public as $$
declare
  s text;
begin
  execute 'select substr(''ABCDEFGHJKLMNPQRSTUVWXYZ23456789'', 1 + floor(random() * 32)::int, 1)' into s;
  return s;
end;
$$;

create function public._generate_tracking_code() returns text
language plpgsql volatile security definer set search_path = public as $$
declare
  code text;
  attempt int;
begin
  for attempt in 1..5 loop
    select string_agg(public._tracking_letter(), '')
      into code
      from generate_series(1, 8);
    if not exists (select 1 from public.orders o where o.tracking_code = code) then
      return code;
    end if;
  end loop;
  raise exception 'swifttransit.order.tracking_exhausted' using errcode = 'P0001';
end;
$$;

-- Transaction-scoped idempotency key for in-function ledger writes, so a
-- cancel refund or a paid replay re-derives the same unique key.
create function public._set_tx_key(text) returns void
language sql volatile security definer set search_path = public as $$
  select set_config('swifttransit.tx_key', $1, true)
$$;

create function public._tx_key(text) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(current_setting('swifttransit.tx_key', true), $1)
$$;

-- Registration ---------------------------------------------------------------

create function public.complete_registration(first_name text, last_name text, role public.user_role)
returns public.profiles
language plpgsql volatile security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  u auth.users;
  p public.profiles;
begin
  if uid is null then
    raise exception 'swifttransit.auth.no_session' using errcode = 'P0001';
  end if;
  if first_name is null or btrim(first_name) = '' or last_name is null or btrim(last_name) = '' then
    raise exception 'swifttransit.profile.name_required' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.profiles where id = uid) then
    raise exception 'swifttransit.profile.already_exists' using errcode = 'P0001';
  end if;

  select * into u from auth.users where id = uid;
  if not found then
    raise exception 'swifttransit.auth.no_session' using errcode = 'P0001';
  end if;

  insert into public.profiles (id, role, first_name, last_name, phone, email)
  values (uid, role, btrim(first_name), btrim(last_name), u.phone, u.email)
  returning * into p;

  if role = 'courier' then
    insert into public.couriers_status (courier_id) values (uid)
    on conflict (courier_id) do nothing;
  end if;

  return p;
end;
$$;

-- Pricing ---------------------------------------------------------------------

create function public.quote_price(
  pickup_lat double precision,
  pickup_lng double precision,
  dropoff_lat double precision,
  dropoff_lng double precision,
  size public.package_size,
  flags public.handling_flag[],
  route_km numeric
) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'base_kobo', r.base_kobo,
    'distance_kobo', ceil(coalesce(route_km, 0) * r.kobo_per_km)::int,
    'handling_kobo',
        (case when 'fragile' = any (flags) then r.fragile_kobo else 0 end)
      + (case when 'perishable' = any (flags) then r.perishable_kobo else 0 end)
      + (case when 'handle_with_care' = any (flags) then r.handle_with_care_kobo else 0 end)
      + (case when 'keep_upright' = any (flags) then r.keep_upright_kobo else 0 end),
    'total_kobo',
        r.base_kobo
      + ceil(coalesce(route_km, 0) * r.kobo_per_km)::int
      + (case when 'fragile' = any (flags) then r.fragile_kobo else 0 end)
      + (case when 'perishable' = any (flags) then r.perishable_kobo else 0 end)
      + (case when 'handle_with_care' = any (flags) then r.handle_with_care_kobo else 0 end)
      + (case when 'keep_upright' = any (flags) then r.keep_upright_kobo else 0 end)
  )
  from public.pricing_rules r
  where r.package_size = size
$$;

-- Orders ------------------------------------------------------------------------

create function public.create_order(draft jsonb, idempotency_key text)
returns public.orders
language plpgsql volatile security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  o public.orders;
  quote jsonb;
begin
  if uid is null then
    raise exception 'swifttransit.auth.no_session' using errcode = 'P0001';
  end if;
  if idempotency_key is null or btrim(idempotency_key) = '' then
    raise exception 'swifttransit.order.idempotency_required' using errcode = 'P0001';
  end if;

  -- Replay of a dropped request: return the original order, book nothing twice.
  select * into o from public.orders where orders.idempotency_key = create_order.idempotency_key;
  if found then
    return o;
  end if;

  -- Re-quote server side; any client price is ignored (value sourcing table).
  quote := public.quote_price(
    (draft ->> 'pickup_lat')::double precision,
    (draft ->> 'pickup_lng')::double precision,
    (draft ->> 'dropoff_lat')::double precision,
    (draft ->> 'dropoff_lng')::double precision,
    (draft ->> 'package_size')::public.package_size,
    coalesce(
      (select array_agg(f)::public.handling_flag[]
         from jsonb_array_elements_text(coalesce(draft -> 'handling_flags', '[]'::jsonb)) f),
      '{}'::public.handling_flag[]
    ),
    (draft ->> 'route_km')::numeric
  );

  insert into public.orders (
    tracking_code, idempotency_key, customer_id, type,
    pickup_line, pickup_lat, pickup_lng,
    dropoff_line, dropoff_lat, dropoff_lng,
    receiver_name, receiver_phone, instructions,
    package_size, weight_kg, package_photo_path, handling_flags,
    scheduled_at, status,
    base_kobo, distance_kobo, handling_kobo, total_kobo, payment_method
  ) values (
    public._generate_tracking_code(), idempotency_key, uid,
    (draft ->> 'type')::public.order_type,
    draft ->> 'pickup_line',
    (draft ->> 'pickup_lat')::double precision,
    (draft ->> 'pickup_lng')::double precision,
    draft ->> 'dropoff_line',
    (draft ->> 'dropoff_lat')::double precision,
    (draft ->> 'dropoff_lng')::double precision,
    draft ->> 'receiver_name',
    draft ->> 'receiver_phone',
    coalesce(draft ->> 'instructions', ''),
    (draft ->> 'package_size')::public.package_size,
    coalesce((draft ->> 'weight_kg')::numeric, 0),
    draft ->> 'package_photo_path',
    coalesce(
      (select array_agg(f)::public.handling_flag[]
         from jsonb_array_elements_text(coalesce(draft -> 'handling_flags', '[]'::jsonb)) f),
      '{}'::public.handling_flag[]
    ),
    (draft ->> 'scheduled_at')::timestamptz,
    'pending_payment',
    (quote ->> 'base_kobo')::int,
    (quote ->> 'distance_kobo')::int,
    (quote ->> 'handling_kobo')::int,
    (quote ->> 'total_kobo')::int,
    (draft ->> 'payment_method')::public.payment_method
  )
  returning * into o;

  insert into public.order_events (order_id, status, actor_id) values (o.id, o.status, uid);
  return o;
end;
$$;

-- The only ledger writer (spec: called by pay_order, later by top-up and
-- payout in feature 12). Duplicate key returns the original row.
-- use_tx_key routes through the transaction-scoped key so a replayed caller
-- re-derives the same unique key instead of double-writing.
create function public.record_wallet_tx(
  kind public.wallet_tx_kind,
  amount_kobo integer,
  order_id uuid,
  owner_id uuid,
  idempotency_key text,
  use_tx_key boolean default false
) returns public.wallet_transactions
language plpgsql volatile security definer set search_path = public as $$
declare
  w public.wallet_transactions;
  final_key text;
begin
  final_key := case
    when idempotency_key is null then null
    when use_tx_key then public._tx_key(idempotency_key)
    else idempotency_key
  end;

  if final_key is not null then
    select * into w from public.wallet_transactions
    where wallet_transactions.idempotency_key = final_key;
    if found then
      return w;
    end if;
  end if;

  insert into public.wallet_transactions (owner_id, amount_kobo, kind, order_id, idempotency_key)
  values (owner_id, amount_kobo, kind, order_id, final_key)
  returning * into w;
  return w;
end;
$$;

create function public.pay_order(order_id uuid, idempotency_key text, payment_reference text)
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

create function public.assign_order(order_id uuid) returns public.orders
language plpgsql volatile security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  o public.orders;
begin
  if uid is null then
    raise exception 'swifttransit.auth.no_session' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.courier_applications ca
    where ca.courier_id = uid and ca.status = 'approved'
  ) then
    raise exception 'swifttransit.courier.not_approved' using errcode = 'P0001';
  end if;

  -- Exactly one courier wins: the conditional update is the race guard (AC-6).
  update public.orders
     set courier_id = uid, status = 'assigned'
   where id = order_id and courier_id is null and status = 'searching'
   returning * into o;
  if not found then
    raise exception 'swifttransit.order.already_assigned' using errcode = 'P0001';
  end if;

  insert into public.order_events (order_id, status, actor_id) values (order_id, 'assigned', uid);

  update public.couriers_status
     set current_order_id = order_id
   where courier_id = uid and current_order_id is distinct from order_id;

  return o;
end;
$$;

-- Status machine ---------------------------------------------------------------
-- pending_payment → searching → assigned → at_pickup → picked_up → at_dropoff
-- → delivered; cancelled legal from pending_payment, searching, assigned;
-- failed legal from any non-terminal state. The searching → assigned move is
-- sanctioned only inside assign_order, so it is absent from this table.

create function public.change_order_status(order_id uuid, new_status public.order_status)
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

-- Wallet -----------------------------------------------------------------------

create function public.wallet_balance() returns bigint
language sql stable security definer set search_path = public as $$
  select coalesce(sum(w.amount_kobo), 0)::bigint
  from public.wallet_transactions w
  where w.owner_id = auth.uid()
    and w.kind in ('topup', 'payout', 'refund')
$$;

-- Courier state ------------------------------------------------------------------

create function public.set_online(online boolean) returns void
language plpgsql volatile security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'swifttransit.auth.no_session' using errcode = 'P0001';
  end if;
  -- AC-10: approved applications only, enforced here, not in client code.
  if not exists (
    select 1 from public.courier_applications ca
    where ca.courier_id = uid and ca.status = 'approved'
  ) then
    raise exception 'swifttransit.courier.not_approved' using errcode = 'P0001';
  end if;
  update public.couriers_status set is_online = online where courier_id = uid;
end;
$$;

create function public.update_courier_location(lat double precision, lng double precision)
returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  update public.couriers_status
     set last_lat = lat, last_lng = lng, last_seen_at = now()
   where courier_id = auth.uid()
     and (last_seen_at is null or last_seen_at < now() - interval '15 seconds');
  if not found then
    raise exception 'swifttransit.courier.location_throttled' using errcode = 'P0001';
  end if;
end;
$$;

-- Matching ------------------------------------------------------------------------
-- Spherical law of cosines on WGS84; reduced projection, ~1 km on the pickup
-- area, no receiver details (AC-3 and the NDPA purpose-bound read).

create function public.nearby_orders(radius_km numeric default 10)
returns table (
  id uuid,
  tracking_code text,
  type public.order_type,
  package_size public.package_size,
  total_kobo integer,
  pickup_lat double precision,
  pickup_lng double precision,
  distance_km numeric
)
language sql stable security definer set search_path = public as $$
  with caller as (
    select cs.last_lat, cs.last_lng
    from public.couriers_status cs
    where cs.courier_id = (select auth.uid())
  )
  select o.id,
         o.tracking_code::text,
         o.type,
         o.package_size,
         o.total_kobo,
         round(o.pickup_lat::numeric, 2)::double precision,
         round(o.pickup_lng::numeric, 2)::double precision,
         (6371 * acos(least(1.0, greatest(-1.0,
              cos(radians(c.last_lat)) * cos(radians(o.pickup_lat))
                * cos(radians(o.pickup_lng) - radians(c.last_lng))
              + sin(radians(c.last_lat)) * sin(radians(o.pickup_lat))
         ))))::numeric(7, 2) as distance_km
  from public.orders o, caller c
  where o.status = 'searching'
    and c.last_lat is not null
    and radius_km between 0 and 50
    and (6371 * acos(least(1.0, greatest(-1.0,
           cos(radians(c.last_lat)) * cos(radians(o.pickup_lat))
             * cos(radians(o.pickup_lng) - radians(c.last_lng))
           + sin(radians(c.last_lat)) * sin(radians(o.pickup_lat))
         )))) <= radius_km
  order by distance_km
$$;
