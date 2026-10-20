# Review, feat/create-a-delivery, 2026-10-19

**Reviewed by**: qfmodel (author on the develop/build model)
**Scope**: 98 files, branch vs base (merge base 44d5447)
**Verdict**: Changes requested

## Summary

This is the customer booking wizard: six steps, a draft in a Zustand store, a route guard, a server-derived quote, a mocked card/wallet pay, and a confirmation, plus the `geo` Edge Function, the `route_km` SQL helper, the expiry job, and an owner-scoped replay fix on `create_order`. The architecture is sound and the money invariant is respected end to end: no client code sends a price or a distance, the price is recomputed in SQL, and the replay path is now scoped to the caller so one customer cannot read another's order. The headline problem is that the offline flag is only set once at launch and never refreshed, which breaks the reconnect half of AC-18. A second theme is thin coverage of the client booking orchestration and a per-user cache gap.

## Major

### 🟠 Offline flag is set once at launch and never updated, `features/auth/auth-provider.tsx:82`
**Problem**: `setOffline(!reachable)` runs only inside the one-shot `start()` effect. There is no network listener, no AppState re-probe, and no focus refresh. `summary.tsx:111` gates `canPay` on `!offline`, and `summary.tsx:280` shows the offline banner from the same stale value.
**Why it matters**: A customer who opens the app with no signal and then reconnects has `offline` stuck at `true` for the whole session. Pay stays disabled and the "you appear to be offline" line stays on screen even with full connectivity. AC-18 says "reconnecting lets the same draft pay"; that path does not work without killing and restarting the app.
**Suggested fix**: Re-probe reachability (or subscribe to connectivity) when the summary mounts or gains focus, or on `AppState` becoming active, and write the result back through `setOffline`. The reverse case (launch online, lose signal) is partly saved by `quote.isError` and the provider's own `probeReachable`, but the banner and the reconnect case are not.

## Minor

### 🟡 Client booking orchestration is untested on its key branches, `features/deliveries/booking.ts:57`
**Problem**: `book()` sequences create, replay short-circuit (`status !== 'pending_payment'`), the cancelled/failed re-key at `:69`, then pay. Tests cover the mock provider and `toOrderDraftJsonb`, but there is no unit test that drives `book()` with a faked supabase client to assert: a replayed paid order is returned without a second pay; a cancelled replay spends a fresh key and creates once; a card decline leaves the key intact so a retry replays the same order.
**Why it matters**: This is money and idempotency branching with the highest blast radius. A future edit to the ordering or the status checks could double-charge or double-book and no test would catch it. The runtime verify pass proved the server side, not this client sequence.
**Suggested fix**: Add a Jest test for `book()` with `@/lib/supabase` and the provider mocked, asserting call counts and outcomes on the replay, cancelled-rekey, and decline paths.

### 🟢 Query cache is never cleared on sign-out and some keys are not per-user, `lib/query.ts:5` and `features/deliveries/booking.ts:104`
**Problem**: No `queryClient.clear()` or `removeQueries` runs on `signOut`. The `addresses` query is correctly keyed by `userId` (`addresses.ts:35`), but `wallet-balance` and `quote` are not.
**Why it matters**: On a shared device, signing out of account A and into account B without an app restart can briefly show A's wallet balance or a cached quote within their stale windows. Low likelihood, but it is the same class of leak the address key was added to prevent.
**Suggested fix**: Clear the query client on sign-out, or scope `wallet-balance` (and the quote input) by user id the way addresses are.

### 🟡 Wizard step transition always animates forward, `features/deliveries/wizard.tsx:43`
**Problem**: `previous = useRef(step)` initialises to the current step, and `forward = step >= previous.current` is read before the effect updates the ref. Because `[step].tsx` returns a different step component per route param, `WizardScreen` remounts on every step change and the ref resets, so `forward` is always `true`.
**Why it matters**: Back navigation slides in as if it were forward. AC-22 is technically met (it still slides, and Reduce Motion still cross-fades), but the direction cue is wrong.
**Suggested fix**: Lift the direction signal out of the per-step component (derive it from navigation state or a store field) so the ref can actually compare consecutive steps.

### 🟡 Action sheet form sheet does not retheme in dark mode, `app/(customer)/_layout.tsx:7`
**Problem**: The root Stack sets `contentStyle` background from the theme, but the nested customer Stack sets only `headerShown: false`, and the `action-sheet` form sheet sets no `contentStyle`. The screen root (`action-sheet.tsx:25`) has no background class, so it shows the unthemed sheet surface in dark mode.
**Why it matters**: AC-1 asks for the sheet path in light and dark. The `booked` modal is fine because its own `SafeAreaView` carries `bg-primary`. Confirms finding (a) from the 2026-10-19 verify run.
**Suggested fix**: Give the customer Stack (or the action-sheet screen) a themed `contentStyle`, or set a background on the sheet content view.

### 🟡 Any non-coded backend error is reported as offline, `features/deliveries/booking.ts:30`
**Problem**: `serverCode()` returns `network.offline` whenever the message has no `swifttransit.*` code. A genuine database fault (a missing `pricing_rules` row, a constraint error, a permission failure) surfaces to the customer as "you appear to be offline."
**Why it matters**: It is fail-safe for the customer, but it mislabels real breakage and hides it from support signal.
**Suggested fix**: Distinguish "no code in message" (transport/unknown) from the specific server errors you expect, and log the raw message so a mislabel is at least diagnosable.

### 🟡 E.164 normaliser rejects a full international number typed without the plus, `features/deliveries/schemas.ts:27`
**Problem**: For input not starting with `+`, the code prepends `+234` unconditionally. A user who types `2348031234567` (country code, no `+`) becomes `+2342348031234567` and fails validation, rather than being corrected.
**Why it matters**: A common paste form. The number is rejected outright instead of normalised, which reads as "invalid number" to someone who entered a valid one.
**Suggested fix**: Strip a leading `234` the way you strip a leading `0`, or lean on `parsePhoneNumberFromString` with `defaultCountry: 'NG'` before the manual prefix.

### 🟡 A dismissed confirmation leaves a repayable draft, `app/(customer)/new-delivery/booked.tsx:120` and `features/deliveries/booking.ts:94`
**Problem**: The draft is cleared only through "send another". `useBookingMutation.onSuccess` regenerates the idempotency key and leaves the rest of the draft complete. If the customer dismisses the modal (iOS swipe) instead of tapping "send another", home and the sheet still see a complete draft with a fresh key.
**Why it matters**: They can re-enter the summary and Pay again, creating a second order for the same details. It is user-initiated, so not a double-submit bug, but the guard for "one booking done" rests entirely on one button.
**Suggested fix**: Clear the draft when the booked screen mounts or on `pay_order` success, rather than only on "send another", and let "send another" just navigate home.

## Nits

- ⚪ `features/deliveries/place-map.tsx:63`, the decorative centre pin uses a literal `border-white` and fixed `h-6 w-6`, against the "no raw colors or sizes in components" convention.
- ⚪ `docs/specs/0005-create-a-delivery.md:154` names the wallet error `swifttransit.wallet.insufficient`, while the deployed function, the capture regex (`booking.ts:25`), and `errors.swifttransit.wallet.insufficient_balance` in `locales/en.json` all use `...insufficient_balance`. Consistent at runtime, so this is a spec text fix, not a bug. It refutes verify finding (b) as a runtime defect.

## Strengths

- The price invariant is enforced cleanly and completely: `route_km` is an immutable SQL helper with the detour constant inside it, `quote_price` no longer takes a distance, `create_order` recomputes server side and ignores any price or distance key in the draft, and `toOrderDraftJsonb` sends no money field (asserted by a test).
- The owner-scoped replay fix in `20261018120000_create_order_replay_owner.sql` closes a real IDOR/PII leak (a crafted key could otherwise return another customer's order row with the receiver's name, phone and addresses).
- Idempotency is thoughtfully layered: replay returns the original order, a cancelled or failed replay spends a fresh key, and a successful booking rotates the key so the next booking is not a replay.
- The `geo` function verifies the caller's Supabase token before spending a credit, returns typed error keys, keeps the upstream key server-side, and filters non-Nigerian results.
- Step guards reuse the same zod slices as the Continue buttons, the copy is fully i18n'd, and icon-only controls carry accessibility labels with Reduce Motion honored.

## Test coverage

Jest coverage is genuine and broad for the client edge: schemas (`toE164`, `firstIncompleteStep`, `toOrderDraftJsonb`), schedule windowing, the mock provider (Luhn, decline, replay, race, offline), the wizard route guard and step flows, and the auth offline probe. SQL behaviors (distance derivation, idempotency, expiry, wallet refund) have harness tests. The main gap is the client `book()` sequence itself (replay, cancelled-rekey, decline retry), which is money and idempotency branching and currently only proven at the provider and server layer, not as a unit. Secondary gap: the stale offline flag and the cross-account cache keys have no test asserting the reconnect and sign-out behaviors.
