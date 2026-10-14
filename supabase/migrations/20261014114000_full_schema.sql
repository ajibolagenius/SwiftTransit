-- Full schema: enums, eight remaining tables plus pricing_rules, constraints,
-- indexes, triggers (spec 0002 task 4; AC-1, AC-9).

-- Enums (user_role already exists from the first thread; profiles.role uses it)

create type public.order_type as enum ('document', 'parcel', 'food', 'groceries');
create type public.package_size as enum ('small', 'medium', 'large');
create type public.vehicle_type as enum ('bike', 'car', 'van');
create type public.handling_flag as enum ('fragile', 'perishable', 'handle_with_care', 'keep_upright');
create type public.order_status as enum
  ('pending_payment', 'searching', 'assigned', 'at_pickup', 'picked_up', 'at_dropoff', 'delivered', 'cancelled', 'failed');
create type public.application_status as enum ('pending', 'approved', 'rejected');
create type public.wallet_tx_kind as enum ('booking', 'topup', 'payout', 'refund');
create type public.payment_method as enum ('card', 'wallet');

-- Tables --------------------------------------------------------------------

create table public.courier_applications (
  id uuid primary key default gen_random_uuid(),
  courier_id uuid not null unique references public.profiles (id) on delete cascade,
  vehicle_type public.vehicle_type not null,
  vehicle_number text not null,
  licence_number text not null,
  licence_photo_path text not null,
  status public.application_status not null default 'pending',
  submitted_at timestamptz not null default now(),
  approved_at timestamptz,
  rejected_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  label text not null,
  line text not null,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- One default address per owner.
create unique index addresses_one_default on public.addresses (owner_id) where is_default;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  tracking_code char(8) not null unique,
  idempotency_key text unique,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  courier_id uuid references public.profiles (id) on delete cascade,
  type public.order_type not null,
  pickup_line text not null,
  pickup_lat double precision not null check (pickup_lat between -90 and 90),
  pickup_lng double precision not null check (pickup_lng between -180 and 180),
  dropoff_line text not null,
  dropoff_lat double precision not null check (dropoff_lat between -90 and 90),
  dropoff_lng double precision not null check (dropoff_lng between -180 and 180),
  receiver_name text not null,
  receiver_phone text not null,
  instructions text not null default '' check (char_length(instructions) <= 500),
  package_size public.package_size not null,
  weight_kg numeric(6, 2) not null check (weight_kg >= 0 and weight_kg <= 2000),
  package_photo_path text,
  handling_flags public.handling_flag[] not null default '{}',
  scheduled_at timestamptz,
  status public.order_status not null default 'pending_payment',
  base_kobo integer not null check (base_kobo >= 0),
  distance_kobo integer not null check (distance_kobo >= 0),
  handling_kobo integer not null check (handling_kobo >= 0),
  total_kobo integer not null check (total_kobo >= 0),
  payment_method public.payment_method,
  payment_reference text,
  created_at timestamptz not null default now(),
  check (total_kobo = base_kobo + distance_kobo + handling_kobo)
);

-- Untrusted client INSERT is blocked by grants; this guards the service role too.
alter table public.orders add constraint orders_handling_flags_known
  check (handling_flags <@ array['fragile', 'perishable', 'handle_with_care', 'keep_upright']::public.handling_flag[]);

create index orders_customer_created on public.orders (customer_id, created_at desc);
create index orders_courier_created on public.orders (courier_id, created_at desc);
create index orders_searching on public.orders (created_at) where status = 'searching';

create table public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  status public.order_status not null,
  actor_id uuid references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index order_events_order_created on public.order_events (order_id, created_at);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index messages_order_created on public.messages (order_id, created_at);

create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  amount_kobo integer not null check (amount_kobo <> 0),
  kind public.wallet_tx_kind not null,
  order_id uuid references public.orders (id) on delete cascade,
  idempotency_key text unique,
  created_at timestamptz not null default now()
);

create index wallet_transactions_owner_created on public.wallet_transactions (owner_id, created_at desc);

create table public.couriers_status (
  courier_id uuid primary key references public.profiles (id) on delete cascade,
  is_online boolean not null default false,
  last_lat double precision check (last_lat between -90 and 90),
  last_lng double precision check (last_lng between -180 and 180),
  last_seen_at timestamptz,
  current_order_id uuid references public.orders (id) on delete set null,
  updated_at timestamptz not null default now()
);

-- An order is held by at most one online courier at a time (invariant 7).
create unique index couriers_status_one_order on public.couriers_status (current_order_id) where current_order_id is not null;

create table public.pricing_rules (
  package_size public.package_size primary key,
  base_kobo integer not null check (base_kobo >= 0),
  kobo_per_km integer not null check (kobo_per_km >= 0),
  fragile_kobo integer not null default 0 check (fragile_kobo >= 0),
  perishable_kobo integer not null default 0 check (perishable_kobo >= 0),
  handle_with_care_kobo integer not null default 0 check (handle_with_care_kobo >= 0),
  keep_upright_kobo integer not null default 0 check (keep_upright_kobo >= 0)
);

-- (A CHECK with a subquery is not expressible in Postgres; the courier-role
-- precondition is enforced in assign_order, whose UPDATE is the only client
-- path that sets orders.courier_id.)

-- Triggers ------------------------------------------------------------------

create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger courier_applications_updated_at
  before update on public.courier_applications
  for each row execute function public.set_updated_at();

create trigger couriers_status_updated_at
  before update on public.couriers_status
  for each row execute function public.set_updated_at();

-- Invariant 6: when an order reaches a terminal status, clear that courier's
-- current_order_id (each writer touches one couriers_status row, and only when
-- it disagrees; assign_order relies on this firing after its own set).
create function public.clear_courier_current_order() returns trigger
language plpgsql as $$
begin
  if new.status in ('delivered', 'cancelled', 'failed') and old.status <> new.status and new.courier_id is not null then
    update public.couriers_status cs
      set current_order_id = null
      where cs.courier_id = new.courier_id and cs.current_order_id is distinct from new.id;
  end if;
  return new;
end;
$$;

create trigger orders_terminal_clears_courier
  after update of status on public.orders
  for each row execute function public.clear_courier_current_order();

-- Realtime: orders and messages stream to clients (spec 0002).
alter table public.orders replica identity full;
alter table public.messages replica identity full;
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.messages;
