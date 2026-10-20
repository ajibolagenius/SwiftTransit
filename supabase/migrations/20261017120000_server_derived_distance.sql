-- Spec 0005 AC-10: the chargeable distance is derived in SQL from the two
-- coordinates, so no caller can supply or change it. The straight line figure
-- times a detour factor is an estimate, accepted in the spec.

create function public.route_km(
  pickup_lat double precision,
  pickup_lng double precision,
  dropoff_lat double precision,
  dropoff_lng double precision
) returns numeric
language sql immutable as $$
  select (ceil(
    (1.4 * 6371 * acos(least(1.0, greatest(-1.0,
         cos(radians(pickup_lat)) * cos(radians(dropoff_lat))
           * cos(radians(dropoff_lng) - radians(pickup_lng))
         + sin(radians(pickup_lat)) * sin(radians(dropoff_lat))
    ))))::numeric
    * 100
  ) / 100)::numeric(7, 2)
$$;

comment on function public.route_km(double precision, double precision, double precision, double precision) is
  'Chargeable distance in kilometres: spherical law of cosines times a 1.4 detour factor, rounded up to two decimals. The only source of distance for pricing.';

-- The old signature took a caller supplied route_km. Dropping it is the point:
-- a function with a different argument list is a new function, not a replace.
drop function if exists public.quote_price(
  double precision, double precision, double precision, double precision,
  public.package_size, public.handling_flag[], numeric
);

create function public.quote_price(
  pickup_lat double precision,
  pickup_lng double precision,
  dropoff_lat double precision,
  dropoff_lng double precision,
  size public.package_size,
  flags public.handling_flag[]
) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'base_kobo', r.base_kobo,
    'route_km', d.km,
    'distance_kobo', ceil(d.km * r.kobo_per_km)::int,
    'handling_kobo',
        (case when 'fragile' = any (flags) then r.fragile_kobo else 0 end)
      + (case when 'perishable' = any (flags) then r.perishable_kobo else 0 end)
      + (case when 'handle_with_care' = any (flags) then r.handle_with_care_kobo else 0 end)
      + (case when 'keep_upright' = any (flags) then r.keep_upright_kobo else 0 end),
    'total_kobo',
        r.base_kobo
      + ceil(d.km * r.kobo_per_km)::int
      + (case when 'fragile' = any (flags) then r.fragile_kobo else 0 end)
      + (case when 'perishable' = any (flags) then r.perishable_kobo else 0 end)
      + (case when 'handle_with_care' = any (flags) then r.handle_with_care_kobo else 0 end)
      + (case when 'keep_upright' = any (flags) then r.keep_upright_kobo else 0 end)
  )
  from public.pricing_rules r,
       (select public.route_km(
          quote_price.pickup_lat, quote_price.pickup_lng,
          quote_price.dropoff_lat, quote_price.dropoff_lng
        ) as km) d
  where r.package_size = size
$$;

comment on function public.quote_price(double precision, double precision, double precision, double precision, public.package_size, public.handling_flag[]) is
  'Price breakdown for a booking. Reads only pricing_rules, writes nothing. Distance comes from public.route_km.';

-- create_order no longer reads a distance off the draft; the coordinates it
-- already reads are the whole input to the price.
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
  select * into o from public.orders where orders.idempotency_key = create_order.idempotency_key;
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

-- A new function gets Supabase's default EXECUTE grants, so strip them and
-- re-grant the way 20261014135200 does. route_km stays ungranted to clients:
-- it is reachable only through quote_price.
revoke all on function public.route_km(
  double precision, double precision, double precision, double precision
) from public, anon, authenticated;

revoke all on function public.quote_price(
  double precision, double precision, double precision, double precision,
  public.package_size, public.handling_flag[]
) from public, anon;

grant execute on function public.quote_price(
  double precision, double precision, double precision, double precision,
  public.package_size, public.handling_flag[]
) to authenticated;
