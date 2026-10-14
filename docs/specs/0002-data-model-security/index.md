# 0002. Data model and security

**Date**: 2026-10-14
**Status**: In Progress

## Summary

This is the whole backend shape for SwiftTransit: nine tables, the rules about who may read and change each row (called row level security, or RLS), the server functions that move orders and hold money, and the file and live update rules. Every later feature builds on it, so it is designed and built in one pass, as a set of SQL migration files applied with the Supabase CLI and checked by automated policy tests running against a local Postgres in CI. Money and order status change only inside server functions; the app never writes them directly.

## Requirements

**User stories**:
- As a developer, I want the full schema, policies and functions in versioned migrations so every later feature writes code, not surprise schema changes.
- As a customer or courier, I want the database itself to refuse access to other people's rows so my parcels, phone numbers and photos stay private.
- As the team, I want proof (not promises) that the security rules work, so policy tests run in CI on every PR.

**Acceptance criteria**:
- **AC-1**: `supabase db push` applies the migration set cleanly against a fresh local database and against the linked remote project, with no drift.
- **AC-2**: `supabase gen types typescript` writes generated database types into the app, and `npx tsc --noEmit` passes with them.
- **AC-3**: The policy test suite (local Postgres in CI, acting as customer A, customer B, an approved courier, and an anonymous visitor) proves: a customer sees only their own orders, wallet rows, addresses and messages; a courier cannot read another courier's assignments; an anonymous visitor reads nothing; and no client role can UPDATE or DELETE `order_events`, `messages` or `wallet_transactions`.
- **AC-4**: A direct client UPDATE of `orders.status`, or an insert into `order_events`, `messages` or `wallet_transactions` is rejected (no row grant, and no permissive policy). `change_order_status` rejects every transition not in the state machine table, raising an error carrying a SQLSTATE and a dot-namespaced error key.
- **AC-5**: Wallet balance exists only as a function over `wallet_transactions` (no balance column) and counts only `topup`, `payout` and `refund` rows (a `booking` row is spend history, not balance movement). Repeating a write with the same `idempotency_key` inserts nothing and returns the original row (order replays find the original order through `orders.idempotency_key`, payments through the payment transaction key).
- **AC-6**: `assign_order` allows exactly one courier to take an order: the second concurrent call fails with `already_assigned`.
- **AC-7**: An approved courier can read, upload and list objects under its own Storage path `{user_id}/` in `avatars`, `package-photos` and `licences`; other authenticated users cannot read `licences` objects at all; all three buckets are private.
- **AC-8**: Demo data is fenced: `is_demo` lives on profiles, is set only by seeds or the service role, cannot be changed through the client API, and the demo users test seed proves a demo user's rows are ordinary rows (no policy lets any user read across the demo fence beyond normal ownership). The stronger promise from spec 0001 (demo users see only demo data) and the weekly demo reset are designed and built in feature 15, which this spec's `is_demo` column prepares for.
- **AC-9**: Deleting a profile row (and a full account through the delete function) removes every related row by `ON DELETE CASCADE`, and the delete function removes that user's Storage objects by path prefix first.
- **AC-10**: Only profiles of couriers whose `courier_applications.status` is `approved` can set themselves online, enforced inside the definer function, not in client code.
- **AC-11**: Another user's phone number and email are readable only by that user and by participants of an order they share; every signed-in user can read a reduced identity (name, avatar) through a `security_invoker` view, never the base table.

## Decision

**Chosen option**: Option 2: Postgres as the single enforcement point (RLS plus security-definer functions).

The database holds every rule: which rows each role may see, which columns each role may write, and the only code paths allowed to change money and order status. The app talks to Supabase directly with the publishable key and is treated as an untrusted client.

**Implementation skills**: `supabase` (`supabase/agent-skills`, global `~/.claude/skills/supabase/`) · `secure-me` (`ajibolagenius/vibe-secure-me`, `.claude/skills/secure-me/`) · `ponytail` (`DietrichGebert/ponytail`, `.claude/skills/ponytail/`)

## Build plan

Tracer Bullet: one thin thread (one table, one policy, one passing test) through the whole toolchain first, then thicken. The engineer has linked the remote Supabase project with the CLI; local development runs through `supabase start` (Docker).

1. Create `supabase/` with `config.toml` tracked (project ref and managed-service ids stripped), enable the Realtime publication placeholders, run `supabase db link` against the linked project, satisfies **AC-1**
2. First thread migration: `profiles` plus one pair of SELECT and UPDATE policies, satisfies **AC-3**
3. Test harness: `supabase/.test` SQL scripts driving a local Postgres (`supabase start`), impersonating roles with `set local role authenticated` and `set local request.jwt.claims`, each script inserting its own fixtures (auth users, profiles, an approved application) with the service role so assertions never depend on `seed.sql`, wired into `.github/workflows/ci.yml` as a service-container job, satisfies **AC-3**
4. Full schema migration: enums, the remaining eight tables plus `pricing_rules`, CHECK constraints, indexes, the `set_updated_at` trigger, `updated_at` deferrable on `couriers_status`, satisfies **AC-1**, **AC-9**
5. Full RLS policy matrix (below) with correct `TO` clauses, and column level denies (revoke `INSERT`, `UPDATE`, `DELETE` where clients must not write), satisfies **AC-3**, **AC-4**, **AC-7**, **AC-8**
6. Definer functions: `complete_registration`, `quote_price`, `create_order`, `pay_order`, `assign_order`, `change_order_status`, `record_wallet_tx`, `wallet_balance`, `set_online`, `update_courier_location`, `nearby_orders`; `security definer` with a locked `search_path`, grants to `authenticated` only, satisfies **AC-4**, **AC-5**, **AC-6**, **AC-10**
7. Storage and realtime guards: create buckets `avatars`, `package-photos`, `licences` (private, 5 MB image mime limits, path templates `{auth.uid()}/{filename}`) with RLS policies; add the Broadcast channel authorization policy for `order:*`; the nightly orphan photo sweep (an Edge Function on a `pg_cron` schedule, service role), satisfies **AC-7**, **AC-9**
8. `delete-account` Edge Function: service role, self only, removes Storage objects by prefix then the auth user (cascade does the rest), satisfies **AC-9**
9. Generate types with `supabase gen types typescript` into `lib/supabase/types.ts`; point `lib/supabase.ts` at them; add an `errors` block to `locales/en.json` carrying the copy for every `swifttransit.*` error key the functions raise, satisfies **AC-2**
10. Seed: `pricing_rules` rows, demo customer and courier profiles (`is_demo` true) with matching auth users, sample addresses, satisfies **AC-8**
11. Policy matrix completion tests: every AC-3 and AC-4 assertion, the double-accept race, the idempotent replay, the Storage read across users, and the online approval precondition, satisfies **AC-3**, **AC-4**, **AC-5**, **AC-6**, **AC-7**, **AC-9**, **AC-10**

## Feature design

### Data model

Nine tables plus `pricing_rules` (a seeded config table). Full field lists live in the migrations; this is the shape and the contracts.

| Table | Purpose | Key columns and rules |
|---|---|---|
| `profiles` | App identity, 1:1 with `auth.users` | id PK (= auth uid), role enum (`customer`,`courier`), first/last name, phone (E.164), email, avatar_path, locale, `is_demo` bool default false, created_at |
| `courier_applications` | Vetting record, one row per courier, edited and reused after rejection | courier_id FK UNIQUE, vehicle_type enum, vehicle_number, licence_number, licence_photo_path, status enum (`pending`,`approved`,`rejected`), rejected_at, approved_at, submitted_at, updated_at |
| `couriers_status` | Live state for matching, 1:1 with a courier | courier_id PK FK, is_online bool, last_lat, last_lng, last_seen_at, current_order_id FK null, updated_at (trigger maintained) |
| `addresses` | Saved places | id, owner_id FK, label, line, lat, lng (double precision), is_default; partial unique index on owner_id WHERE is_default |
| `orders` | The delivery | id uuid PK, tracking_code char(8) UNIQUE, idempotency_key text UNIQUE null (wizard draft key), customer_id FK, courier_id FK null, type, pickup_line/lat/lng, dropoff_line/lat/lng, receiver_name, receiver_phone, instructions (≤500), package_size enum, weight_kg (0 to 2000), package_photo_path text null, handling_flags checked against known set, scheduled_at null, status enum, base_kobo, distance_kobo, handling_kobo, total_kobo (CHECK total equals the sum), payment_method enum (`card`,`wallet`), payment_reference null, created_at |
| `order_events` | Append-only audit trail | id, order_id FK, status enum, actor_id FK null (null means system), created_at |
| `messages` | Per-order chat, never edited or deleted | id, order_id FK, sender_id FK, body (≤2000), created_at |
| `wallet_transactions` | The ledger; balance is computed, never stored | id, owner_id FK, amount_kobo signed integer, kind enum (`booking`,`topup`,`payout`,`refund`), order_id FK null, idempotency_key UNIQUE null, created_at |
| `pricing_rules` | Rate card read by `quote_price` | package_size PK, base_kobo, kobo_per_km, handling flag surcharges; seeded by migration |

Enums are Postgres enum types (typegen turns them into TypeScript unions). The open value sets are fixed here: `order_type` (`document`,`parcel`,`food`,`groceries`); `package_size` (`small`,`medium`,`large`) matching the wizard size cards; `vehicle_type` (`bike`,`car`,`van`); `handling_flags` (`fragile`,`perishable`,`handle_with_care`,`keep_upright`). Every foreign key is `ON DELETE CASCADE`. Money is integer kobo everywhere.

**Tracking code**: eight random characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no 0, O, 1, I), generated inside `create_order` with up to five retries on the rare unique collision.

### Order status machine

`pending_payment → searching → assigned → at_pickup → picked_up → at_dropoff → delivered`; `cancelled` is legal only from `pending_payment`, `searching` or `assigned`; `failed` is legal from any non-terminal state. The transition table lives in `change_order_status`; each accepted move inserts one `order_events` row in the same transaction.

### Server functions (RPCs)

All are `security definer` with `search_path` pinned, `EXECUTE` granted to `authenticated` only (no `anon`), and validate the caller with `auth.uid()` themselves. Failures raise `RAISE EXCEPTION SQLSTATE 'P0001'` with a dot-namespaced key (like `swifttransit.order.invalid_transition`) that the app maps to i18n copy (the keys live in `locales/en.json` under a `errors` block, see Build plan step 9).

| Function | Caller | Behaviour |
|---|---|---|
| `complete_registration(first, last, role)` | signing-in user, no profile yet | Inserts the profile; name comes from the argument, phone and email from `auth.users`, role from the argument. For `role = courier` it also inserts the `couriers_status` row (offline), so later UPDATEs always hit an existing row. The only client path that sets a role. |
| `quote_price(pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, size, flags, route_km)` | customer | Reads `pricing_rules`, returns the kobo breakdown. `route_km` comes from the `geo` Edge Function (decided in spec 0001). Never writes. |
| `create_order(draft, idempotency_key)` | customer | First looks up `orders.idempotency_key`; a hit returns the existing order (a replay of a dropped request never double-books). Otherwise re-quotes server side, ignores any client price, inserts the order as `pending_payment` with the quoted breakdown, generates the tracking code, stores the already uploaded `package_photo_path`. |
| `pay_order(order_id, idempotency_key, payment_reference)` | owner | Runs after the client-side mock `PaymentProvider` (spec 0001) succeeds; that call produces `payment_reference` (an id like `mock_xxx`). The function re-checks ownership and `pending_payment`, then: `payment_method = wallet` checks `wallet_balance()` covers the total and inserts the debit ledger row (`booking`, negative); `card` inserts a `booking` row with a null owner effect on balance (bookings never count toward balance). Stores `payment_reference`, moves status to `searching`, writes the event. Duplicate key replays return the original outcome. |
| `assign_order(order_id)` | approved courier | `UPDATE orders SET courier_id = auth.uid(), status = 'assigned' WHERE id = $1 AND courier_id IS NULL AND status = 'searching' RETURNING id`; no row updated means `already_assigned`. Writes `searching → assigned` as the sanctioned in-function transition (event row included, same transaction) and sets the caller's `couriers_status.current_order_id`. The transition table treats this move as legal only from inside this function. |
| `change_order_status(order_id, new_status)` | participant | Checks the transition table and the actor: the assigned courier may move `assigned → at_pickup → picked_up → at_dropoff → delivered`; the customer may only move to `cancelled` while legal; `failed` with a null actor is service role only. Cancelling from `assigned` also nulls `orders.courier_id` and clears that courier's `current_order_id`, and refunds a wallet-paid order (a `refund` ledger row, the money returns to the balance). Writes `order_events`. |
| `record_wallet_tx(kind, amount, order, idempotency_key)` | internal | The only ledger writer (called by `pay_order`, later by top-up and payout functions in feature 12). A duplicate key returns the original row. |
| `wallet_balance()` | any user | Returns the signed sum of the caller's `topup`, `payout` and `refund` rows (`booking` rows are history, not balance). |
| `set_online(bool)` | approved courier | Refuses unless `courier_applications.status = approved` (AC-10). |
| `update_courier_location(lat, lng)` | online courier | Throttled in SQL: refuses more than one write per 15 seconds per courier. Only ever touches its own row. |
| `nearby_orders(radius_km default 10, max 50)` | approved courier | Reads `couriers_status` for the caller's last position, returns searching orders within the radius using the spherical law of cosines on lat/lng (no extension; hundreds of rows, not millions), ordered by distance. Reduced projection: id, tracking code, type, size, price, and the pickup area as coordinates rounded to 2 decimals (about 1 km). No receiver name or phone, no exact address. |

`pricing_rules` updates and courier approval happen with the service role (dashboard SQL for now, per spec 0001's follow-up).

### RLS policy matrix

`TO` clauses carry the role (never the deprecated `auth.role()`); UPDATE policies always have both `USING` and `WITH CHECK`; nothing keys off `user_metadata` (it is user editable). Grants, deny by construction: `revoke all on all tables in schema public from anon, authenticated` (Supabase grants DML to `anon` by default on new public tables, so the blanket revoke comes first), then grant only what the matrix below allows: `SELECT` broadly as stated, plus `INSERT` only on `profiles` (via the function path), `addresses`, `courier_applications`, `messages`; `UPDATE` on `profiles`, `addresses`, `courier_applications`, `couriers_status`; no `DELETE` grants at all. Clients write orders, events and the ledger only through definer functions or the service role.

A `public_profiles` view (`WITH (security_invoker = true)`, so the underlying policy still applies) exposes id, first_name, last_name, avatar_path to any signed-in user; the base `profiles` table is restricted to the owner and order participants (AC-11).

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `profiles` | owner; participants of an order shared with that user (EXISTS subquery); everyone else reads names and avatars through `public_profiles` only | service role and `complete_registration` only | owner, `WITH CHECK` pins role and `is_demo` to their existing values | none (cascade handles it) |
| `courier_applications` | owner only | owner (creates its own application) | owner while status is `pending` or `rejected`; `WITH CHECK` pins courier_id, status, approved_at and rejected_at so approval cannot self-service | none |
| `couriers_status` | owner only | service role / seeds | owner; `is_online` and `current_order_id` pinned (change via `set_online` / `assign_order`); lat, lng and last_seen_at free (the throttled RPC path) | none |
| `addresses` | owner | owner, `WITH CHECK` owner = self | owner, `WITH CHECK` pins owner | owner |
| `orders` | customer owns it; courier where courier_id = self | definer only | definer only | none |
| `order_events` | participants (customer or assigned courier of that order) | definer only | never | never |
| `messages` | order participants, always (history persists after delivery) | participants (client insert, streamed back by realtime), `WITH CHECK` sender = self AND the order is not terminal | never (grant revoked; policy `TO` matches nothing) | never |
| `wallet_transactions` | owner | definer only | never | never |
| `pricing_rules` | any authenticated user | service role | service role | service role |

Anonymous role: no table grants, no function grants. Public tracking lookup is deferred (feature decision, this spec keeps the design clean for it).

### Storage and realtime

Buckets (private, image mimes, 5 MB max, path template `{auth.uid()}/{filename}`): `avatars` (owner writes; any signed-in user may read, it is a display picture), `package-photos` (owner writes; read by order participants via a policy joining `orders` on `orders.package_photo_path`), `licences` (owner writes and reads; nobody else except service role). Objects belonging to deleted users are removed by the delete function prefix sweep; a nightly service-role sweep deletes `package-photos` objects older than 7 days that no order references (no row in `orders.package_photo_path` matches).

Realtime: `orders` and `messages` are added to the publication with `REPLICA IDENTITY FULL`; clients subscribe per table filtered by id, and delivery is authorised by the same row policies above (a courier never receives change events for orders they do not own because the policy filters them). Courier GPS ticks go over a private Broadcast channel named `order:{id}` with a channel authorization rule (Supabase Realtime "channel authorization": one policy per channel name pattern `order:*`, in the dashboard or a migration, whose check is an `EXISTS` on `orders` matching `auth.uid()` to customer_id or courier_id), so a JWT holder cannot join a channel for someone else's order. No table write per tick (spec 0001); the throttled position column updates ride `update_courier_location`.

### Value sourcing

| Action | Value produced | Source |
|---|---|---|
| `create_order` | price breakdown, total | recomputed by `quote_price` logic from `pricing_rules` (never from the client) |
| `create_order` | tracking_code | generated in-function, unique index |
| `pay_order` | payment_reference | the client-side mock `PaymentProvider` call (spec 0001), passed in as an argument and re-validated in-function |
| `quote_price` | route_km | input from the `geo` Edge Function routing result (spec 0001) |
| `nearby_orders` | courier position | `couriers_status.last_lat/lng`, written by `update_courier_location` |
| `wallet_balance` | balance | sum over `wallet_transactions` |
| `change_order_status` | event row, timestamps | function inserts; DB defaults (`now()`) |
| registration | phone, email | `auth.users` (the trigger of trust), not client arguments |
| OTP delivery, rate limits | (unchanged) | Supabase Auth config and the Send SMS hook, owned by spec 0001 and feature 5 |

### Key invariants

1. `total_kobo = base_kobo + distance_kobo + handling_kobo` (CHECK constraint).
2. Order status moves only through `change_order_status` (grants + no client UPDATE).
3. Ledger rows are immutable; every balance is derived.
4. A courier has at most one application row (UNIQUE), a customer at most one default address (partial unique index).
5. A searching order is assigned to at most one courier (conditional UPDATE, AC-6).
6. A courier's `current_order_id` agrees with the orders table: `assign_order` sets it, and an `after update of status` trigger on `orders` clears it (for that order's courier) when the status reaches `delivered`, `cancelled` or `failed`; `change_order_status(→ cancelled from assigned)` clears `orders.courier_id` and that courier's `current_order_id` in the same transaction. Each writer touches exactly one `couriers_status` row and only when `current_order_id IS DISTINCT FROM` the expected value.
7. Two couriers are never online to one order: the partial unique index on `couriers_status(current_order_id) WHERE current_order_id IS NOT NULL` holds because a cancel or fail clears the old courier before any later assign sets a new one (an order can only be reassigned from `searching`, and reaching `searching` again never happens after assignment).
8. `role` and `is_demo` cannot be changed through the client API (UPDATE `WITH CHECK` pins them).
9. A wallet balance never goes negative (`pay_order` checks it in the same transaction as the debit).

### Security and compliance notes

- NDPA 2023 applies (phone numbers, location, licence images). Minimal collection (no declared value column), purpose-bound reads (receiver phone appears only after assignment), consent and policy links belong to feature 5, in-app deletion is AC-9.
- Supabase Auth keeps OTP generation, expiry and rate limits; tighten OTP rate limits and enable CAPTCHA in the dashboard to contain SMS cost (spec 0001). Access token lifetime: 3600 s (dashboard auth setting, recorded under Configuration).
- The publishable key is the only Supabase credential in the bundle; service role and provider secrets stay in Edge Function secrets (spec 0001 AC-9 unchanged).
- Never authorize from `user_metadata`; roles live in `profiles.role` written only by `complete_registration` and pinned thereafter.
- Run `secure-me` on this migration set before merge (GA feature, scope workflow).

### Configuration required

- Existing: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (no new app env vars).
- New local/CI: the Supabase CLI (v2) with Docker for `supabase start`; no secrets committed (`supabase/.temp/` is gitignored).
- Dashboard settings (documented, applied in the linked project): access token lifetime 3600 s, OTP rate limits tightened, CAPTCHA on OTP requests, anonymous sign-ins disabled.

### Critical test scenarios

- Happy path: push the full migration set to a fresh local database, typegen output compiles, verifies **AC-1**, **AC-2**
- Cross-user reads: customer A reads orders, wallet, addresses, messages as customer B and as anonymous; every query returns zero rows or is refused, verifies **AC-3**
- Direct write refusal: client SDK attempts `orders.status` update, event insert, message update, ledger insert; all refused, verifies **AC-3**, **AC-4**
- Illegal transition: `change_order_status(pending_payment → picked_up)` raises with SQLSTATE and key, verifies **AC-4**
- Idempotency: `create_order` and `pay_order` replayed with the same key produce one order and one payment, second call returns the first result, verifies **AC-5**
- Concurrency: two couriers call `assign_order` on one order simultaneously; exactly one succeeds, verifies **AC-6**
- Storage: courier A lists and reads a path in `licences` belonging to courier B; refused; owner round trip works, verifies **AC-7**
- Demo fence: a demo profile's rows obey the same policies; `UPDATE profiles SET is_demo = true` through the API fails, verifies **AC-8**
- Deletion: deleting a customer profile removes orders, events, messages, ledger, addresses (and their storage objects via the function), verifies **AC-9**
- Approval precondition: a courier with a `pending` application calls `set_online(true)`; refused, verifies **AC-10**
- Privacy: user B selects `profiles` for user A (no shared order) and gets zero rows; the same B reads `public_profiles` and sees only name and avatar, verifies **AC-11**
- Wallet payment: `pay_order` with `payment_method = wallet` and an insufficient balance raises and changes nothing; a sufficient one debits exactly once across a retry, verifies **AC-5**

## Consequences

**Positive**:
- Later features write queries and screens, not schema surprises; the policy matrix is built and proven once.
- Money and status integrity hold even if the app is fully compromised; the DB refuses.
- Generated types keep client code honest against schema drift.

**Negative / tradeoffs**:
- CI now needs Docker and a local Postgres job; PRs get slower and Supabase CLI versions must be pinned.
- The policy matrix and definer functions are a large first PR; reviewing it demands care (the `secure-me` pass is mandatory).
- Postgres enum values are slightly awkward to evolve (an `ALTER TYPE` per new value; acceptable for a two-role app).
- Broadcasting GPS ticks means no history of positions (only the throttled last seen), which is deliberate.

**Neutral**:
- Realtime delivery rides on row policies; if Supabase changes channel authorization behaviour, the fallback is manual `realtime.messages` policies.
- Dashboard SQL remains the approval path until an admin tool exists (spec 0001 follow-up).

## Follow-up

- [ ] Feature 12 (wallet) adds top-up and payout definer functions on this ledger; no schema change expected.
- [ ] Public tracking lookup (deferred here) will need one `anon`-granted function with a rate limit when designed.
- [ ] Consider capturing the RLS conventions (TO clauses, WITH CHECK, definer rules, error keys) in `supabase/AGENTS.md` via `/sync` once this lands.
- [ ] Pin the Supabase CLI version in CI (package.json devDependency) when the harness is built.

## Rationale

Context, options, reasoning and references: see [rationale.md](rationale.md).
