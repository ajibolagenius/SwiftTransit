# Verify: create a delivery (feature 6)

Run on a dev build (`npm run ios` / `npm run android`) with a real sign in, not
`EXPO_PUBLIC_DEV_AUTH_STUB` (the stub leaves `session` null, so the quote, the
`geo` calls and the booking all fail for the wrong reason).

Deploy first: `supabase db push` for the two new migrations, then
`supabase functions deploy geo` and set `GEOAPIFY_API_KEY` as a function secret.
Enable `pg_cron` on the project if it is not already on (spec 0002 relies on it
for the photo sweep).

Derived from spec 0005 AC-20 and AC-21.

## AC-20: a lost session keeps the draft

- [ ] Start the wizard and fill step 1, 2 and 3 (type, pickup, drop off). Stop on step 4 with the receiver form half written.
- [ ] Expire the session: call `supabase.auth.signOut()` from another tab, or delete the `sb-<project ref>-auth-token` entry the app writes through `lib/secure-session-storage.ts`. Leaving the app until the token expires works too.
- [ ] The app routes to sign in. Nothing about the draft is lost from memory, so if the process is also killed the customer starts again. That is the accepted cost in the spec.
- [ ] Sign in with the same account. From the home card or the centre sheet, the wizard opens on step 4, the step the customer was left on, with type, pickup and drop off still in place (`resumeStep` in `features/deliveries/draft-store.ts`).
- [ ] Confirm the same behaviour after a backgrounding the app, on iOS and on Android.

## AC-21: an unpaid order expires on the server clock

The SQL side is already proven in the harness (`bash supabase/.test/run.sh`, script
`85_expire_pending_orders.sql`): one old row moves, a fresh row and a paid row do
not, exactly one `order_events` row with `actor_id is null`, a second run moves
nothing, and an authenticated client call to `expire_pending_orders()` is refused.
What is left is the schedule and the app view of it.

- [ ] Confirm the job is registered: `select jobname, schedule from cron.job;` shows `expire-pending-orders` on `*/5 * * * *`. If not, run `supabase/functions/_shared/cron-definitions.sql` in the dashboard SQL editor.
- [ ] Start a booking, reach the card sheet, and leave it without paying. Wait past 15 minutes plus one cron tick.
- [ ] `select status from public.orders where tracking_code = '<that code>';` returns `cancelled`, and `select status, actor_id from public.order_events where order_id = '<that id>' order by created_at;` ends with a `cancelled` row whose `actor_id` is null.
- [ ] Check the wallet: a booking that died before payment never moved the balance, so `wallet_balance()` returns the same figure as before it started.
- [ ] Confirm the cutoff uses the database clock, not the phone. Set the device clock forward three hours and start a fresh booking. Leave it unpaid. It still survives 15 real minutes, because `expire_pending_orders()` compares against `now() - interval '15 minutes'` in Postgres.
