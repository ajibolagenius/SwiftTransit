-- Code review follow up on spec 0005. `create_order` looked a replayed
-- idempotency key up across the whole table, so a key belonging to somebody
-- else would have handed back that customer's order row, with the receiver's
-- name, phone number and both addresses in it. The key is a uuid, so this
-- cannot happen by accident, but it can happen on purpose from a crafted call,
-- and personal data never crosses between customers (NDPA 2023, spec 0002).
--
-- The lookup is now scoped to the caller's own orders. Two different customers
-- can no longer share a key at all: the unique index on `orders.idempotency_key`
-- refuses the second insert, and a refused write returns nothing to anybody.
--
-- Mirrors 20261017120000 in every other line. Grants survive a
-- `create or replace`, so no re-grant is needed here.

create or replace function public.create_order(draft jsonb, idempotency_key text)
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
  -- Only the caller's own order, never a row another customer holds that key.
  select * into o from public.orders
   where orders.idempotency_key = create_order.idempotency_key
     and orders.customer_id = uid;
  if found then
    return o;
  end if;

  -- Re-quote server side from the coordinates; the draft carries no price and
  -- no distance, and any such key in it is ignored.
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
    )
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
