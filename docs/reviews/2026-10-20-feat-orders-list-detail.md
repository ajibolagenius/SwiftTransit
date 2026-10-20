# Review, feat/orders-list-detail, 2026-10-20

**Reviewed by**: qfmodel (author on prior model)
**Scope**: 121 files, branch vs base (main @ 44d5447). Substantive review targeted the orders-list-and-detail work (spec 0006) and the three freshest commits (5b3eefb realtime, 9d5fb09 review fixes, 3fcaf68 email/SMS config). Onboarding (2026-10-17) and create-a-delivery (2026-10-19) carry their own settled reviews and were not re-litigated.
**Verdict**: Changes requested

## Summary

The orders read feature is well built: clean separation of derivation into `features/orders/`, RLS-only reads with the one narrow `courier_vehicle` definer function, disciplined i18n/tokens, and a genuinely thorough test suite (list, detail, realtime, status map). The three newest commits are mostly correct fixes — the per-subscription realtime channel name, the array read for `courier_vehicle`, the null-actor expiry rule, and the cached-detail-on-refetch guard all hold up under scrutiny (I confirmed v5 retains `state.data` on error, so that fix does what it claims). The one real problem is the freshest commit (3fcaf68): it enables the native Twilio SMS provider in the committed `supabase/config.toml` with dummy SIDs and a hardcoded token that replaced the env-var substitution, contradicting the decided Termii-via-hook stack. A handful of minor gaps round it out.

## Major

### 🟠 config.toml commits a Twilio token and enables a provider the stack does not use, `supabase/config.toml:293`
**Problem**: The `[auth.sms.twilio]` block is flipped to `enabled = true` with placeholder SIDs, and the line that was `auth_token = "env(SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN)"` is now `auth_token = "local-dev-stub-token"` (line 298) — directly under the file's own comment "DO NOT commit your Twilio auth token to git. Use environment variable substitution instead". A hardcoded test OTP (`2348010000010 = "123456"`, line 273) is committed too.
**Why it matters**: AGENTS.md fixes SMS on `Termii SMS via Send SMS hook` (spec 0001), and `.env.example` documents the Auth→SMS Hook URL pointing at the `send-sms` function. Enabling the built-in Twilio provider contradicts that decision; worse it is inert (see `[auth.sms] enable_confirmations = false`), so "enable Twilio SMS" in the commit message is dead config that will mislead the next reader. `config.toml` is tracked (not gitignored), so restoring `env(...)` for the token is the pattern the file relies on; hardcoding the field teaches the wrong habit and the next person who pastes a real token commits it.
**Suggested fix**: Revert the token to `env(SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN)`, keep `enabled = false` (the send-sms hook is what ships OTPs), and drop the dummy account/message-service SIDs. If a test OTP for a demo number is wanted for local runs, gate it and note it is dev-only. Also confirm `content_path = "./supabase/templates/email-otp.html"` resolves against the same base dir the CLI uses when it reads the file (the pre-existing commented examples use the same form, so this is likely fine, but verify once with a real magic-link email).

## Minor

### 🟡 missing order id renders a perpetual spinner, not the not-found state, `app/(customer)/orders/[id].tsx:104`
`useOrderDetail(undefined)` has `enabled: false`, so its status is `pending` and `if (detail.isPending)` returns the loader forever. AC-14 and the in-code comment at lines 115-117 ("someone else's id and a missing id render the same state") both require the not-found view for a missing id. Reachable via a malformed deep link. Guard the not-found branch on `!id` before the pending check, or fix the comment to say the loader is intentional for a missing id.

### 🟡 detail cancel error is not reset between sheet open/close, `app/(customer)/orders/[id].tsx:219`
The screen's own Sheet uses `cancel.run(...)` / `onDismiss={() => setConfirming(false)}` but never calls `cancel.reset()`. After a failed cancel, reopening the sheet shows the stale error until the next attempt. This is exactly the bug fixed for `OrderActionsSheet` in 9d5fb09 (order-actions.tsx:91 adds `reset()` on close); it was not mirrored here. `useCancelConfirm` already returns `reset` — call it on dismiss.

### 🟡 the cached-detail-on-refetch-failure guard is untested, `__tests__/orders-detail.test.tsx:368`
`detail.isError && !detail.data` (added in 9d5fb09) is correct for v5, but no test drives "loaded successfully, then a background refetch fails". The only error test (`mockFailDetail` from the start) exercises the no-data path. This is branching/error-handling logic that was just changed and is not covered; add a case where data lands first and the subsequent read errors.

### 🟡 directional `text-right` violates the start/end convention, `features/orders/receipt.tsx:17`
AGENTS.md: "Use start/end, never left/right." The receipt value column uses `text-right`; it should be `text-end`.

### 🟡 duplicate `scheduled_at` column in the list select, `features/orders/queries.ts:41`
`scheduled_at` appears twice in `LIST_COLUMNS`. PostgREST de-duplicates so it is harmless, but it is a copy-paste smell in a load-bearing read. Remove the second occurrence.

## Nits
- ⚪ `features/orders/receipt.tsx:55` — arbitrary value `max-w-[60%]`; prefer a token/width scale per "no raw sizes".
- ⚪ `app/(customer)/(tabs)/index.tsx:39` — home reuses the full paging hook (fetches 20 rows to show 3). Acceptable per spec (same hook), but the over-fetch is worth a one-line comment.
- ⚪ `supabase/migrations/20261020090000_courier_vehicle.sql:12` — no `ORDER BY`; if a courier ever has multiple `courier_applications` rows the client's `[0]` picks an arbitrary vehicle. Fine today if one row per courier is guaranteed; a note or `ORDER BY` would remove the ambiguity.
- ⚪ `3fcaf68` is typed `feat(auth)` but the change is a Supabase email/SMS config tweak; scope label is a touch off.

## Strengths
- The realtime fix (5b3eefb) is right and well proven: the new test reproduces the shared-channel collision with a client that actually dedupes by name and kills it on removeChannel, then shows the detail still hears the push after the list unmounts — it tests behavior, not mocks.
- `courier_vehicle` reads as the array a table function returns (verified against the migration's `RETURNS TABLE`, so empty ≠ P0004), and the expiry rule now requires a real null-actor event — the two subtlest review items were fixed correctly, and the doc corrections (spec "no migration" → one migration; a stronger RLS-vs-query verify step) keep the spec honest.
- Money stays integer kobo and is formatted only in `lib/money` (`en-NG`/`NGN`); status/money changes go only through `change_order_status`; every icon-only control carries a label, and the AC-to-test mapping is explicit in `// covers:` comments.

## Test coverage
Strong. `orders-list`, `orders-detail`, `orders-realtime`, `orders-status-map` and the SQL tests (`95_courier_vehicle.sql`, `85_expire_pending_orders.sql`) map to ACs including the not-found, expiry, no-vehicle-row, and permission cases. Gaps: (1) the background-refetch-keeps-data branch is untested (Minor above); (2) no test for a truly missing `id` (would have caught the spinner-vs-not-found Minor); (3) the `endOfList` footer condition and the detail-screen cancel reset have no direct assertions. The 330-test suite is green as reported.
