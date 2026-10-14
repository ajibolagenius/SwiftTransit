# Review, feat/data-model-security, 2026-10-14

**Reviewed by**: senior review agent (fresh eyes; did not author this change)
**Scope**: 43 files, branch `feat/data-model-security` vs `main` (merge base `38f444d`)
**Verdict**: Blocked

## Summary

This PR lays the whole SwiftTransit backend: seven migrations (nine tables + `pricing_rules`, the full RLS matrix, security-definer RPCs, storage/realtime guards, a grants lockdown), a Postgres policy test suite driven against the local stack, two Edge Functions, generated types, and the i18n error keys. The schema and the table-level policies are careful and well-reasoned, and the deny-by-construction grant ordering plus the conditional-UPDATE assign guard are genuinely good. The change is blocked by three authorization holes in client-callable SECURITY DEFINER RPCs — none of which the policy suite exercises, so it is green today: `record_wallet_tx` is granted to `authenticated` and mints arbitrary ledger rows (money forgery), `pay_order` returns a foreign order's full row to any caller before it checks ownership, and `change_order_status` lets any signed-in user mark any active order `failed`. Storage read authorization also keys off a client-controlled column, enabling a cross-tenant photo read.

## Blockers

### 🔴 `record_wallet_tx` is client-callable and writes the ledger for any owner, `supabase/migrations/20261014114500_grants_lockdown.sql:55`

**Problem**: The lockdown explicitly grants `EXECUTE` on `record_wallet_tx` to `authenticated`. The function (`supabase/migrations/20261014114200_definer_functions.sql:205-237`) takes `owner_id` and `amount_kobo` as arguments and performs NO caller validation — it runs as the definer (`postgres`) and bypasses RLS to insert into `wallet_transactions`. So any signed-in client can call `record_wallet_tx('topup', 999999999, null, auth.uid(), 'any-key')` and fabricate balance, or inject a fake `payout`/`refund` into another user's ledger. `wallet_balance()` sums `topup/payout/refund`, so forged `topup` rows become spendable money and `pay_order` will happily accept them.
**Why it matters**: This breaks the central guarantees of the spec — "money changes only server-side", invariant 3 (immutable derived ledger), and AC-5. It is direct money forgery through a public RPC. The policy suite never calls `record_wallet_tx` from a client (the `30_direct_write_refusal.sql` ledger check only tests the table-level INSERT grant, which is correctly revoked), so this passes green.
**Suggested fix**: Remove the authenticated grant on `record_wallet_tx` (it is internal: `pay_order` and `change_order_status` call it while already running as the definer/owner, which keeps its own execute privilege). Because the blanket revoke loop only strips `anon` (see Major below), also revoke the internal helpers from `authenticated` so the default grant cannot keep it reachable. Optionally add a caller check (`if owner_id <> auth.uid() and current_user = 'authenticated' then raise`) as defense in depth.

### 🔴 `pay_order` leaks a foreign order's full row before checking ownership, `supabase/migrations/20261014114200_definer_functions.sql:254-265`

**Problem**: The replay short-circuit runs before the ownership check:
```
select * into o from public.orders where id = order_id;   -- definer: RLS bypassed, returns ANY order
...
if o.status <> 'pending_payment' then return o; end if;   -- returns the full row, no owner check
if o.customer_id <> uid then raise ...not_owner; end if;  -- only reached for pending_payment
```
Any `authenticated` caller (only `payment_reference` is needed, any non-empty string) who knows an order UUID that is past `pending_payment` receives that order's entire row — including `receiver_name`, `receiver_phone`, exact `pickup_line`/`dropoff_line`/lat/lng and `instructions`. Order UUIDs are handed to couriers by `nearby_orders` and to counterparties via assignment/realtime.
**Why it matters**: Cross-tenant PII disclosure of NDPA-protected data (receiver phone + addresses), and it violates the spec's own "receiver phone appears only after assignment" rule (AC-11 / §Security). Untested: the only replay assertions in `60_idempotency.sql` are made by the owner.
**Suggested fix**: Move the `customer_id = uid` authorization check above the replay return, so a non-owner always gets `swifttransit.order.not_owner` regardless of status.

### 🔴 `change_order_status` `failed` transition has no authorization check, `supabase/migrations/20261014114200_definer_functions.sql:367-368`

**Problem**: For `new_status = 'failed'` with a non-null `uid`, the function jumps to `actor := uid` and proceeds — it never verifies that `uid` is the customer or the assigned courier (the `cancelled` branch checks `uid = customer_id`, the delivery branch checks `uid = courier_id`, but `failed` checks nothing). Any signed-in user can move any non-terminal order to `failed` (and only the service-role null-`uid` path is gated at the top).
**Why it matters**: Broken access control over order state (invariant 2, AC-4): a courier who saw a `searching` order's id in `nearby_orders` — or any user who obtained an id — can fail other people's orders, corrupting the audit trail and the matching flow. `50_status_machine.sql` never exercises a non-participant `failed` call.
**Suggested fix**: Require the actor to be a participant for a non-null `uid` (e.g. `if uid is distinct from o.customer_id and uid is distinct from o.courier_id then raise ...forbidden`), and reserve the null-actor service path for `failed` as the spec describes.

## Major

### 🟠 Storage package-photo reads authorized by a client-controlled column, `supabase/migrations/20261014114300_storage_realtime.sql:60-70`

**Problem**: `create_order` stores `draft->>'package_photo_path'` verbatim (`definer_functions.sql:180`) with no validation. The `participants read package photos` policy grants SELECT on a `storage.objects` row when `o.package_photo_path = storage.objects.name` and the caller is a participant of that order. A customer is always a participant of an order they create, so by setting `package_photo_path` to another user's object name (`{victim_uid}/{file}`) they can read that object through the Storage API. `public_profiles` already leaks every user's UUID, so the `{uid}/` directory is enumerable.
**Why it matters**: Cross-tenant read of private package photos whenever the object name is known (filename entropy is the only mitigation). `75_storage_access.sql` only ever sets a self-consistent path, so it does not catch this.
**Suggested fix**: In `create_order`, reject a `package_photo_path` whose first folder is not `auth.uid()` (the caller may only attach a photo they uploaded under their own path). Prefer authorizing the read by path prefix over an arbitrary matching column.

### 🟠 Grants lockdown revokes function EXECUTE from `anon` only, `supabase/migrations/20261014114500_grants_lockdown.sql:23-26`

**Problem**: The revoke loop does `revoke all on function %s from anon` but never from `authenticated`. Supabase's default privileges grant EXECUTE on new public functions to `authenticated`, so every internal helper stays client-callable. This is confirmed by the generated types: `lib/supabase/types.ts:548-552` lists `_generate_tracking_code`, `_is_privileged`, `_set_tx_key`, `_tracking_letter`, `_tx_key` in the client Functions surface. It also means removing only the explicit `record_wallet_tx` grant (Blocker 1) would not be enough — the default grant keeps it reachable.
**Why it matters**: Contradicts the lockdown's own header ("internal helpers ... stay ungranted") and defeats the "grant exactly the matrix" defense in depth; any future internal function silently becomes public.
**Suggested fix**: Revoke from both `anon` and `authenticated` in the loop (or add explicit `revoke ... from authenticated` for each internal helper), then re-grant only the RPCs the matrix allows.

### 🟠 Nightly orphan-photo sweep never recurses, `supabase/functions/delete-package-photos/index.ts:38`

**Problem**: Objects live at `{uid}/{filename}`, but the sweep lists only the bucket root (`admin.storage.from(BUCKET).list('', ...)`) and inspects those entries' `name`/`created_at`. The root listing returns the `{uid}` folder names, not the files, so nothing passes the age/reference checks and `removed` is always 0. The 7-day purge of unreferenced package photos (AC-9 privacy/retention) silently does nothing.
**Why it matters**: Stale package photos (which can show contents/addresses of past deliveries) are never cleaned up, contrary to the stated data-minimisation promise; the function reports success while deleting nothing. It is a manually-deployed Edge Function outside the tested path, so it ships broken unnoticed.
**Suggested fix**: Enumerate per-owner prefixes (or list recursively / track a flat object table) so the sweep sees actual files under `{uid}/`, and only compare against referenced paths there.

## Minor

- 🟡 `public_profiles` is a plain RLS-bypassing view, not `security_invoker = true` as AC-11 and the RLS matrix literally require (`rls_matrix.sql:116-119`). The author's reasoning (a security_invoker view would filter to owner/participant and show nothing to strangers) is correct and the outcome matches intent, but this is a written-spec deviation the spec owner should record; it also exposes all user UUIDs, which is the enabler for the storage IDOR above.
- 🟡 `nearby_orders` is not gated on `approved` application status (`definer_functions.sql:459`); the spec lists its caller as "approved courier". A pending courier who first calls `update_courier_location` gains a position and can then read the reduced order feed.
- 🟡 `update_courier_location` (`definer_functions.sql:441`) does not check the caller is an approved/online courier (spec: "online courier"); it only touches the caller's own row, so impact is low.
- 🟡 Dead indirection: `pay_order` calls `_set_tx_key` (`definer_functions.sql:267`) but every `record_wallet_tx` call passes `use_tx_key = false`, so `_tx_key` is never read and the transaction-scoped key mechanism does nothing (`definer_functions.sql:38-48`).
- 🟡 `pay_order`'s write is `update ... set status = 'searching' where id = order_id` with no `and status = 'pending_payment'` guard and no row lock (`definer_functions.sql:282-284`); unlike `assign_order`'s compare-and-swap this leaves a theoretical concurrent double-charge/overdraft race (invariant 9). Add the status guard (or `for update`).
- 🟡 Realtime Broadcast authorization is unproven: the policies target `realtime.messages` but the migration never `enable row level security` on it, the `nullif(replace(topic,'order:',''),'')::uuid` cast can raise for malformed order topics, and no test covers realtime. `verify.md` itself defers this to a dashboard rule — confirm it actually enforces before relying on it (`storage_realtime.sql:74-96`).
- 🟡 The policy suite is excellent at the table/RLS layer but never probes the client-callable definer RPCs (no test invokes `record_wallet_tx` directly, or a non-owner `pay_order`, or a non-participant `failed`). All three blockers would turn this suite red and are the gap that let them through.
- 🟡 `create_order`'s idempotent replay returns the existing order without an ownership check (`definer_functions.sql:138-141`) — the same anti-pattern as `pay_order`, lower exploitability (requires the caller's high-entropy wizard key).

## Nits

- ⚪ `delete-account` lists objects with `limit: 1000` and no pagination (`index.ts:40`); a user with >1000 objects per bucket would leave orphans after account deletion.
- ⚪ `record_wallet_tx` now has six params (`kind, amount, order_id, owner_id, idempotency_key, use_tx_key`) but the spec's function table lists four; the spec text is stale after this change.
- ⚪ The previously-committed `supabase/.temp/` values (project ref `pxyvzlbpoejqycudsewa`, org id, pooler host/user, version strings) still live in git history even though this branch deletes and gitignores them. No password or service-role key was exposed, so risk is low, but consider history scrubbing if the ref is treated as sensitive.

## Strengths

- The policy suite is a genuine assertion harness (not smoke tests): `expect_eq`/`expect_true`/`expect_refused` raise on mismatch, `run.sh` sets `ON_ERROR_STOP=1` and fails the run on any error, roles are impersonated with `set local role` + JWT claims, and fixtures are inserted as superuser so nothing depends on `seed.sql`. The `65_assign_race.sh` double-accept race with "exactly one winner" is the real deal.
- Deny-by-construction grant ordering (blanket revoke before re-grant), `assign_order`'s conditional UPDATE as a correct compare-and-swap, and the `revoke ... from anon, authenticated` applied to views/tables are all the right instincts.
- The column-pin-via-BEFORE-UPDATE-trigger pattern with a well-reasoned `_is_privileged()` exemption is a clean way to lock `role`/`is_demo`/`status`/`is_online` where a `WITH CHECK` subquery genuinely cannot see the old row; the trigger comments explain the why.
- Edge Functions handle auth correctly for a portfolio project: `delete-account` verifies the caller's own JWT via `getUser()` before acting, uses the service role only server-side, and never bundles it; `supabase.ts` ships only the publishable key. `config.toml` keeps secrets as `env(...)` placeholders and strips the managed-service ref (local `project_id = "swifttransit"`).

## Test coverage

TESTS = configured and the suite is strong where it aims, but its aim is the wrong layer for the highest risks. `10/20/30/40/50/60/70/80/90` + the race script faithfully prove AC-3, AC-4, AC-5, AC-6, AC-7 (table layer), AC-8, AC-10, AC-11: cross-user reads return zero rows, direct table writes/deletes are refused, illegal transitions raise `P0001`, idempotent replays write once, wallet balance ignores `booking` rows, refunds happen exactly once, approval gates `set_online`, and the privacy view leaks no phone. The gap is that every money/status mutation is reached through the definer RPCs, and the suite only ever calls those RPCs as the legitimate actor. No test calls `record_wallet_tx` as a client, no test reads a foreign order via `pay_order`, no test fails a stranger's order via `change_order_status`, and no test attaches another user's path via `create_order`. Those four untested paths are precisely the three blockers and the storage IDOR. Realtime and the orphan-photo sweep have no coverage at all (both are manually deployed / deferred). The green signal is real for what it checks and misleading for what it does not.
