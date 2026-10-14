# 0002 verify steps

Run against the local stack (`supabase start`, then `supabase db reset` if state is dirty). The policy suite covers most steps; the numbers name the script that proves each AC.

1. **AC-1** — `supabase db reset` applies all seven migrations plus `seed.sql` with zero errors. `supabase migration list --linked` shows local and remote histories in sync, no drift.
2. **AC-2** — `lib/supabase/types.ts` regenerates from the live schema (`supabase gen types typescript --local`); `npm run typecheck` passes with it wired into `lib/supabase.ts` (`createClient<Database>`).
3. **AC-3** — `bash supabase/.test/run.sh` green, led by `10_profiles_ownership.sql`, `20_cross_user_reads.sql` and `90_privacy_registration.sql`: a customer sees only their own orders, ledger, addresses and messages; a courier sees no other courier's assignments; anon is refused on every app table.
4. **AC-4** — `30_direct_write_refusal.sql` green: no client role can UPDATE `orders.status` or INSERT into `order_events`, `messages` or `wallet_transactions`; `50_status_machine.sql` shows every illegal transition raises `swifttransit.order.invalid_transition` (SQLSTATE P0001).
5. **AC-5** — `60_idempotency.sql` green: repeated `create_order` and `pay_order` with the same key insert nothing and return the original row. `70_wallet_cancel_refund.sql` green: balance is a sum over topup, payout and refund only (the booking debit never moves it), and a cancel refunds exactly once.
6. **AC-6** — `65_assign_race.sh` green: two concurrent `assign_order` calls on one searching order, exactly one wins, the loser receives `swifttransit.order.already_assigned`.
7. **AC-7** — `75_storage_access.sql` green: a user writes, reads and deletes only objects under their own `{user_id}/` path; other signed-in users read `avatars` but never `licences`; `package-photos` are readable only by order participants. `select public,false as public from storage.buckets` (or dashboard) shows all three buckets private.
8. **AC-8** — `supabase db reset` seeds demo customer and courier with `is_demo` true. `10_profiles_ownership.sql` proves a client cannot set or clear `is_demo`; no policy reads across the demo fence.
9. **AC-9** — `delete from auth.users where id = '<test uid>'` in the dashboard SQL editor removes every related row by cascade (`profiles`, `addresses`, `orders`, events, messages, ledger, courier rows). `supabase/functions/delete-account/index.ts` sweeps that user's Storage objects by `{uid}/` prefix before deleting the auth user.
10. **AC-10** — `80_courier_online.sql` green: a courier with a pending application is refused by `set_online`; only an approved courier toggles online, and location writes throttle to one per 15 seconds.
11. **AC-11** — `90_privacy_registration.sql` green: a stranger reads zero rows of another user's `profiles` (never phone or email), sees only id, first name, last name and avatar through `public_profiles`, and an assigned courier gains the full row as an order participant. `complete_registration` is the only client path to a profile row.

Deferred checks (outward actions, run by the engineer):
- Deploy `supabase/functions/delete-account` and `delete-package-photos` (`supabase functions deploy`), then apply `supabase/functions/_shared/cron-definitions.sql` in the dashboard SQL editor to schedule the nightly photo sweep.
- Add the Realtime channel authorization rule for `order:*` in the dashboard if the migration-set policy is not enough on the hosted project.
