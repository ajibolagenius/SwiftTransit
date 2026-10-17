# 0005. Create a delivery: the customer booking wizard

**Date**: 2026-10-17
**Status**: Proposed

## Summary

This is the customer's booking path: six wizard steps, a price they see before paying, a mock payment, and a tracking number. The backend for it already exists and is proven (spec 0002), so almost all of this work is on the phone. The one rule that matters most: the app never decides what a delivery costs. The app collects a draft, and the database works out the distance from the two coordinates and prices it. That closes a hole in the current functions, which take a distance the caller can invent.

## Context

> ⚠️ Premise note: spec 0002 records that `create_order` "quotes again server side, ignores any client price". It does, but `quote_price` charges `ceil(route_km * kobo_per_km)` and `route_km` arrives as an argument from the client draft. A caller who passes 0.5 pays for half a kilometre across Lagos. The claim is true about the price and false about the number the price is built from. This spec corrects that contract, so it touches a function that is already migrated, typed and under test.

The schema, the row level rules, and the four money and status functions are built and tested. What does not exist is any of the client side: `/new-delivery/[step]`, `summary`, `booked` and the centre action sheet are placeholder screens. There is no geocoder anywhere, even though the wizard needs place names for a pin and a search list. TanStack Query and Zustand are named in the stack (spec 0001) but are not in package.json, and `features/auth` calls Supabase with plain async functions, so there is no query pattern to follow yet.

Forces at play. Free tiers only: Geoapify gives 3,000 credits a day, so a call per keystroke is not acceptable. The token lifetime is 3600 seconds, which is shorter than a distracted customer can take to finish six steps. Money is mock money, but a hiring reviewer reads this repo as a production standard, so a price a client can rewrite is a real problem in the record. Personal data (a receiver's phone number and two addresses, often for someone else) is collected here, and NDPA 2023 applies, per spec 0002.

The cost of not deciding: `/develop` would build six screens against a price contract that can be cheated, invent its own distance maths on the phone, and hard code place names, all of which is expensive to unwind after feature 9 and 10 build on the same order row.

## Requirements

**User stories**:
- As a customer, I want to book a delivery in under two minutes from my home tab, so that I can send a parcel without phoning anyone.
- As a customer, I want to see exactly what I am charged, and why, before any money moves.
- As the business, I want the price and the order status to be set by the database, so that no edited client can book a Lagos trip for the price of a short walk.

**Acceptance criteria**:
- **AC-1**: A signed in customer reaches the wizard from the centre action sheet (Send) and from a home shortcut. Each step shows the stepper header with "Step N of 6" and the six dot states from DESIGN.md, in light and dark.
- **AC-2**: Step 1 sets the delivery type (`document`, `parcel`, `food`, `groceries`). The choice changes nothing downstream; it is stored on the order for display and later reporting.
- **AC-3**: Steps 2 and 3 each produce a place (a line, lat, lng) by map pin, text search, saved address, and, on pickup only, a "use my location" button. A map pin is turned into a place name by reverse geocoding. A denied or stale location fixes the map camera over Lagos instead of blocking the step.
- **AC-4**: Text search sends at most one request per pause in typing (300 ms debounce), calls the geo Edge Function with the customer's token, and is biased to Nigeria.
- **AC-5**: Step 4 requires a receiver name and a Nigerian mobile number, normalised to E.164 with a +234 default, and blocks Continue with an inline error when invalid. The step states in one line, with a link to the privacy policy, that the number and the addresses are shared with the courier who takes the job.
- **AC-6**: Step 5 requires a package size (`small`, `medium`, `large`) and a weight in kilograms greater than zero and at most 2000. Handling flags come only from the known set. Instructions are optional, capped at 500 characters. An optional photo uploads as soon as it is taken or chosen, into `package-photos` under the customer's own id path, shows a thumbnail, and can be removed.
- **AC-7**: Step 6 offers ASAP (stored as `scheduled_at` null) or a slot two hours wide for today or the next six days. No slot is further than 7 days out and none is in the past.
- **AC-8**: Opening any step without the data it depends on, by deep link or a stray link, lands the customer on the first incomplete step. The summary is unreachable until the draft is complete.
- **AC-9**: The summary shows base, distance, handling and total, from one `quote_price` call, before any money moves, formatted in naira through `en-NG` on integer kobo. Tapping a row returns to that step and the draft is intact.
- **AC-10**: The chargeable distance is derived in SQL from the two coordinates (great circle times a 1.4 detour factor, a constant inside the function). `quote_price` no longer takes `route_km` and no client code can supply or change a price. The same two points, size and flags produce the same total from the quote call and from the stored order, and an order created with hand made arguments is priced the same way.
- **AC-11**: Card payment runs a fake form (number checked by Luhn, expiry, cvv), about 1.5 seconds pending, then returns a `mock_` reference. A card number ending 0002 always fails: the order stays `pending_payment`, the failure is shown, and retry works from the same screen.
- **AC-12**: Wallet payment reads the real derived balance. When it does not cover the total, the customer sees an insufficient balance state and nothing is charged or written. When it does, the debit happens once, and a second call with the same key does not debit again.
- **AC-13**: A successful booking leaves the order in `searching` with a tracking code, and one `order_events` row for each move (`pending_payment`, then `searching`).
- **AC-14**: An idempotency key (a uuid made when the wizard opens, held in the draft) means a double tap, a retry, or a dropped response books one order. A replayed `create_order` returns the original order.
- **AC-15**: The confirmation screen shows the tracking code with a copy button, the status line "searching for a courier", what was paid and how, "view order" (disabled, feature 7), and "send another", which clears the draft and returns to home.
- **AC-16**: A "save this address" choice on the confirmation writes a row owned by the customer into `addresses` for the pickup and the drop off the customer just used.
- **AC-17**: The Track row on the action sheet is visibly unavailable, with an accessible hint that tracking arrives with the orders screen.
- **AC-18**: With no network, the draft stays editable and the customer can move back and forth. The quote and the pay action show a retry message, and Pay is blocked while offline.
- **AC-19**: When the geo request fails, is rate limited, or has no key configured, the search field shows a retryable error and the map pin path still completes the step. No fake place list ships inside the function.
- **AC-20**: A lost session partway through the wizard routes the customer to sign in and keeps the draft, so a successful sign in returns them to the same step.
- **AC-21**: An order left in `pending_payment` for more than 15 minutes is cancelled by a scheduled job, with a system `order_events` row (null actor).
- **AC-22**: All copy is in `locales/en.json`. Icon only controls carry accessibility labels, targets are 44 pt and up, and with Reduce Motion on the step slide becomes a cross fade.
- **AC-23**: `npm run typecheck`, `lint`, `format:check` and the Jest suite pass, and the SQL change has a test in the existing `supabase/.test` harness proving the distance rule and the expiry job.

## Options considered

### Option 1: Dumb client, database sets the price

The six routes are a form. They collect a draft in memory, validate it with the same zod shape on every step, and hand it to the existing functions at the end. The geo function only turns text into a place and a place into a name; it never touches money. The distance for pricing is computed in SQL from the coordinates the customer already chose.

**Pros**:
- One source of truth for price, so the quote on screen and the stored total cannot disagree, and no client can lower its own bill.
- The geo call is decorative: when it fails, the booking still works through the map pin.
- Priced orders stay reproducible, which makes the SQL test meaningful and later features (courier pay, receipts) able to trust the row.

**Cons**:
- A straight line figure times 1.4 is not a road distance, so a trip through with heavy traffic Lagos can be off by a tenth or two against a routing API.
- The quote on screen and the charge use the same helper, but only because that helper was rewritten. The change touches migrated, typed, tested SQL.
- The in memory draft dies if the app is killed mid wizard.

### Option 2: Rich client, routing supplies the distance

Keep `route_km` as an argument. Add a route action to the geo function, call it once both points exist, pass the road distance to `quote_price` and `create_order`.

**Pros**:
- Real road distance, so prices match what a courier actually drives.
- No change to the existing function signature, so no migration and no test churn.

**Cons**:
- The client still decides the number the price is built from, so the cheapest way to abuse the app stays open, and closing it needs a second check anyway.
- One more billable request per booking against a 3,000 credit daily ceiling, and every failure of that request now blocks the price, so it blocks the booking.
- The phone must cache the route so a map nudge does not price again the order.

### Option 3: Whole booking as one scrolling form on a single screen

Skip the step routes. One screen, six sections, one submit.

**Pros**:
- Fewest routes, no step guard, no draft store, and the fastest thing to build.
- The customer sees the whole job at once, which is honest about what is required.

**Cons**:
- It abandons the six designed screens and the stepper, which is the part of the design that makes a long form feel short.
- A map picker and a photo need room; crammed into one scroll they fight each other, and validation lands all at once at the end.

### Option 4: Server side draft, resumable booking

Persist the draft to a table (or storage) as the customer types, so any device can resume it, and treat the saved draft as a booking candidate.

**Pros**:
- Survives a killed app, a crashed phone, and a device switch, which is genuinely useful in a market with cheap Android devices and app reloads.
- Gives a real "resume your booking" surface on home.

**Cons**:
- A new table, new policies, and a retention rule for someone else's phone number and address sitting in a half form.
- Autosaves turn typing into writes, so the database on the free tier gets churn for no revenue.
- Most of that cost buys back a case that the in memory draft handles badly, and nothing else in the product needs it.

## Decision

**Chosen option**: Option 1: Dumb client, database sets the price.

The app collects and validates; Postgres decides money. The booking runs on three existing functions, one new Edge Function for place names, and one small SQL change that makes the price a pure function of data the customer cannot fake.

**Implementation skills**: `supabase` (`supabase/agent-skills`, `.claude/skills/`) · `secure-me` (`ajibolagenius/vibe-secure-me`, `.claude/skills/secure-me/`) · `ponytail` (`DietrichGebert/ponytail`, `.claude/skills/ponytail/`) · `impeccable` (`pbakaus/impeccable`, `.claude/skills/impeccable/`) · `animate-expo` (`emilkowalski/skills`, `.claude/skills/animate-expo/`) · `mobile-native` (`emilkowalski/skills`, `.claude/skills/mobile-native/`) · `expo-router` (`expo/skills`, `.claude/skills/`)

Note: `impeccable`, `mobile-native` and `expo-router` are named in root `AGENTS.md`. A nested `features/AGENTS.md` does not exist yet, and `supabase/AGENTS.md` was already proposed in spec 0002 as a next step.

## Rationale

The choice that carries the most weight is where the distance comes from, and the forces point one way. This is a portfolio app whose reviewer reads it as a production standard, so a price the customer can type in is a flaw on display even when the money is fake (Context). Postgres already holds every other rule about orders and money, and spec 0002 proved that pattern in CI, so moving this rule there costs one helper and one migration instead of a new enforcement point. Option 2 gives a truer distance, but it buys that accuracy by keeping the client in charge of the number, which means it needs a second server side check anyway, and it spends a scarce daily credit on a figure the phone then has to cache so a map nudge cannot change the price.

The estimate is accepted knowingly. A constant 1.4 factor over straight distance is wrong in the places where Lagos roads bend, and the spec says so rather than hiding it, because the same helper makes the quote on screen and the stored total agree, which matters more for a booking a customer can audit. Option 3 abandons the six designed screens, and the stepper is the part of the design that makes a long form feel short. Option 4 solves a case nothing else in the product has (resuming on another device) at the price of storing a third party's phone number and address in a half state, which brings NDPA obligations and a retention rule to a feature that does not need them. Keeping the draft in memory only was the engineer's call, and its cost, losing the form if the app is killed, is recorded in Consequences.

The rest follows the stack rather than adding to it: the existing `package-photos` bucket and its orphan sweep already handle the photo, the existing `addresses` grants already handle saved places, and `@tanstack/react-query` and `zustand` were named in spec 0001 and never installed, so this feature is the natural place to install them. The `geo` function is built now, small (autocomplete and reverse only), because routing lost its job when the distance moved into SQL, and feature 10 can add the route action to a function that already exists.

## Feature design

**Data model sketch**:

No new tables and no new columns. The shape this feature writes already exists in spec 0002 (`orders`, `addresses`, `pricing_rules`, `order_events`, `wallet_transactions`). What changes is one function signature and one scheduled job.

| Object | Where it lives | Fields and rule |
|---|---|---|
| Delivery draft | In memory, one Zustand store (`features/deliveries/draft-store.ts`) | `idempotencyKey` (uuid, made when the wizard opens), `type`, `pickup` (line, lat, lng, optional addressId), `dropoff` (same), `receiverName`, `receiverPhone` (E.164), `packageSize`, `weightKg`, `handlingFlags[]`, `instructions`, `packagePhotoPath` (nullable), `scheduledAt` (nullable), `savePickup`, `saveDropoff` |
| `orders` row | Postgres, written only by `create_order` | Snapshot of the draft plus a priced by the server breakdown, `status` = `pending_payment`, then `searching` after `pay_order` |
| `addresses` row | Postgres, direct client INSERT under the owner grant from spec 0002 | `owner_id` = the customer, `label`, `line`, `lat`, `lng`; the default flag is not touched by this feature |
| `package-photos` object | Supabase Storage, private, 5 MB image cap | Path `{auth.uid()}/{filename}`, uploaded before submit, cleaned by the existing nightly orphan sweep if the order is never created |
| `pricing_rules` | Read only | Base, per km, and per flag surcharges, keyed by `package_size` |

Schema change (one migration): a helper `public.route_km(pickup_lat, pickup_lng, dropoff_lat, dropoff_lng) numeric`, IMMUTABLE, great circle distance by the spherical law of cosines (the same maths `nearby_orders` already uses) times a detour factor of 1.4, rounded up to two decimals. `quote_price` loses its `route_km` argument and calls the helper. `create_order` drops `route_km` from the draft it reads. Generated types are refreshed with `supabase gen types typescript`.

Scheduled change (second migration): `expire_pending_orders()` as `security definer`, service role only, moving `pending_payment` orders older than 15 minutes to `cancelled` through the sanctioned transition so the event row is written, plus a `pg_cron` entry on the pattern the photo sweep already uses.

**State transitions**:

Client draft (no persisted state): incomplete steps validated per step, complete draft = summary reachable.

Order, as enforced by `change_order_status` and the functions in spec 0002, unchanged: `pending_payment → searching` (by `pay_order`), `pending_payment → cancelled` (by the customer, or now by the expiry job with a null actor). This feature creates orders and pays them; it does not build the rest of the machine.

**API surface**:

| Surface | Kind | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `quote_price(pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, size, flags)` | SQL RPC (signature changed) | coordinates (req), size (req), flags (opt) | `base_kobo`, `distance_kobo`, `handling_kobo`, `total_kobo` as jsonb | authenticated, no ownership check, it writes nothing | no `pricing_rules` row for the size |
| `create_order(draft, idempotency_key)` | SQL RPC (existing) | draft jsonb (req, no `route_km`), key text (req) | the `orders` row, including `tracking_code` and the breakdown | authenticated, `auth.uid()` becomes `customer_id` | `swifttransit.auth.no_session`, `swifttransit.order.idempotency_required`, a replay returns the original row |
| `pay_order(order_id, idempotency_key, payment_reference)` | SQL RPC (existing) | order uuid, key text, reference text from the mock provider | the paid `orders` row in `searching` | owner only, order must be `pending_payment` | `swifttransit.wallet.insufficient`, `swifttransit.order.invalid_transition`, `swifttransit.order.not_found` |
| `wallet_balance()` | SQL RPC (existing) | none | signed kobo sum of topup, payout, refund | any authenticated user | none |
| `functions.invoke('geo', { action: 'autocomplete' })` | Edge Function | `text` (req, min 2 chars), optional bias | list of place predictions (name, lat, lng, address line) | requires the caller's Supabase token, no anon | `geo.quota`, `geo.no_key`, `geo.upstream` |
| `functions.invoke('geo', { action: 'reverse' })` | Edge Function | `lat`, `lng` (req) | one place name and address line | same | same |
| `storage.from('package-photos').upload(path, file)` | Supabase Storage | image under 5 MB | the object path | owner path only | `swifttransit.storage.too_large`, a path outside the user's own prefix is refused |
| `supabase.from('addresses').select()` and `.insert()` | Table read and write, RLS direct | owner rows only | saved addresses | owner | none expected |
| `PaymentProvider.pay(input)` | Local interface, `lib/payments/` | amount kobo, method `card`, card fields | `{ ok, reference }` or a typed failure | none, it is the mock | `card_declined` for a number ending 0002, `timeout` |

**Value sourcing**:

| Action | Value produced or shown | Source |
|---|---|---|
| Steps 2 and 3 | place name for a picked pin | `geo` action `reverse`, from the coordinates the map reports |
| Steps 2 and 3 | search results | `geo` action `autocomplete`, Geoapify, biased to Nigeria |
| Step 2 | current position | `expo-location` foreground fix, after the permission sheet from feature 5; Lagos camera when denied or stale |
| Step 4 | `receiver_phone` in E.164 | input normalised by `libphonenumber-js` with `NG` default (spec 0001 convention) |
| Step 5 | `package_photo_path` | the Storage upload result, stored in the draft, handed to `create_order` |
| Step 6 | `scheduled_at` | the chosen slot's start instant, in UTC; null for ASAP |
| Summary | base, distance, handling, total | `quote_price` (SQL, from `pricing_rules` and the coordinates) |
| Summary | distance shown as kilometres | derived in the same SQL helper as the charge, returned alongside the breakdown so the number on screen and the number charged cannot differ |
| Summary (wallet) | balance available | `wallet_balance()` |
| Pay (card) | `payment_reference` | the mock `PaymentProvider` result, passed to `pay_order` and checked again there (spec 0002 contract) |
| Confirmation | `tracking_code` | the `orders` row returned by `create_order` (generated in SQL, spec 0002) |
| Confirmation | status line | the order's `status` after `pay_order`, read from the returned row, not assumed |
| Expiry job | cutoff time | `now() - interval '15 minutes'` in SQL, no client clock involved |
| All money display | naira string | integer kobo from the DB, formatted at the edge through `Intl.NumberFormat('en-NG')` with `NGN` |

**Key invariants**:
1. The price of an order is a function of (pickup coordinates, dropoff coordinates, size, flags) and nothing else. No client argument and no computed by the client figure enters it.
2. `total_kobo = base_kobo + distance_kobo + handling_kobo` (the CHECK from spec 0002), and the sum shown on the summary is the same row of numbers the order stores.
3. One draft, one idempotency key. Every write after the wizard opens carries that key, so a retry cannot double book or double debit.
4. Money and status move only inside definer functions; the client writes `addresses` and uploads photos and nothing else.
5. A customer cannot reach the summary with an incomplete or invalid draft, checked by the full schema at the route, not only by the Continue buttons.
6. A weight, a phone number, or an instruction string that fails the database CHECK is caught on the phone first, and the database still refuses it.
7. Package photos are owned by the uploader; the object exists at most 7 days before the existing sweep removes it if no order references it.

**Security model**:
- Who may do what: any signed in user may call `quote_price` (it writes nothing) and `create_order` (they become the customer on the row). The function does not check `profiles.role`; only the customer tab bar offers the path today, and a courier sending a parcel is a legitimate future case. Owner checks on `pay_order`, `addresses`, and photo paths come from spec 0002 policies and are not restated here.
- The `geo` Edge Function verifies the caller's Supabase token before it spends a credit, so a stranger cannot drain the daily quota through your project. It returns typed error keys and never the upstream key.
- `GEOAPIFY_API_KEY` is an Edge Function secret only. Nothing new ships in the app bundle, and the publishable Supabase key stays the only client credential (spec 0001 AC-9 unchanged).
- Personal data: this is the screen where a third party's phone number and two physical addresses enter the system. NDPA 2023 applies. The collection point says who will see it (AC-5), the data is purpose bound (receiver contact is readable by the assigned courier only, per spec 0002), the draft is never written to disk, and account deletion already cascades to orders and addresses.
- The expiry job runs as the service role and is the only new automated write. It touches one status and writes one audit row, so `order_events` stays the full trail for a booking that died.
- This feature moves mock money and writes orders and Storage objects, so it is marked GA in the scope: `/check verify`, `/test`, `/check review`, `/document`, and a `secure-me` pass on the PR.

**Configuration required**:
- `GEOAPIFY_API_KEY`: Edge Function secret for the `geo` function (create a Geoapify account, free tier, and set it with `supabase functions secrets set`). No other Geoapify settings; the key is server side.
- Dashboard or migration: `pg_cron` enabled in the project (spec 0002 already relies on it for the photo sweep) for the 15 minute expiry job.
- New app packages, no new app env vars: `@tanstack/react-query`, `zustand`, `expo-image-picker`.
- `.env.example`: no change. The map style vars from spec 0001 already cover the map screens.

**Critical test scenarios** (each maps to a criterion in `## Requirements`):
- Happy path: from the home tab, open the sheet, complete all six steps with a saved pickup, a searched drop off, a receiver, a medium package at 3 kg, ASAP, pay by card, and land on a confirmation showing a copied tracking code with the order row in `searching`, verifies **AC-1**, **AC-3**, **AC-5**, **AC-6**, **AC-9**, **AC-11**, **AC-13**, **AC-15**
- Price integrity: call `quote_price` with two known Lagos points, then insert an order through `create_order` with the same draft and with a draft carrying an invented distance figure; both produce the same `total_kobo`, and the on screen breakdown equals the stored breakdown, verifies **AC-10**
- Double submit: tap Pay twice in quick succession, then replay `create_order` and `pay_order` with the same key; one order, one debit, one event pair, verifies **AC-14**, **AC-12**
- Wallet short: book with a wallet balance below the total; the insufficient state appears, no ledger row and no status change, then top up the fixture and the same draft pays, verifies **AC-12**
- Declined card: a card ending 0002 leaves the order `pending_payment`, the error is shown, and retry from the summary succeeds, verifies **AC-11**, **AC-13**
- Dangling booking: create a `pending_payment` order, run the expiry job against a clock 16 minutes on; the order is `cancelled` with a system event, verifies **AC-21**
- Step guard: deep link to `/new-delivery/4` and `/new-delivery/summary` with an empty and with a half draft; each redirect lands on the first incomplete step, verifies **AC-8**
- Geo failure: make the function return a quota error; the search shows retry, the pin path still produces a place, and a booking completes, verifies **AC-19**, **AC-4**
- Offline: drop the network at the summary; editing and back navigation still work, Pay is blocked with a message, and reconnecting lets the same draft pay, verifies **AC-18**
- Session lost: expire the token mid wizard; the app routes to sign in, and after signing in the customer is on the same step with the draft, verifies **AC-20**
- Permission and privacy: an attempt to read another user's address rows or photo path returns nothing or is refused; a second user's client cannot pay someone else's order, verifies **AC-16** (ownership rules from spec 0002)
- Accessibility and motion: with Reduce Motion on, the step transition cross fades; every icon only control has a label; a 44 pt audit of the wizard controls passes, verifies **AC-22**, **AC-17**

## Build plan

Tracer Bullet, the project default (scope header). One thin thread goes through every new layer first: SQL price rule, its type refresh, one query hook, one screen showing a number. Then the layers thicken.

1. Install `@tanstack/react-query`, `zustand`, `expo-image-picker`; add a `QueryClientProvider` to the root layout and to the test provider helper. Nothing renders differently yet, verifies **AC-23**
2. Price thread (the tracer): migration for the `route_km` helper, the `quote_price` signature change, and `create_order` no longer reading a client distance; refresh generated types; one SQL test in `supabase/.test` proving two coordinates price identically from either entry point and that no argument can change it, verifies **AC-10**
3. `lib/money.ts` (kobo in, `en-NG` naira string out) and the summary screen at its thinnest: two hard coded Lagos points, one `quote_price` call through a query hook, the four breakdown lines on screen, verifies **AC-9**, **AC-22**
4. The `geo` Edge Function (autocomplete and reverse, token check, typed error keys, Nigeria bias), its secret, and `lib/geo.ts` with the 300 ms debounced search hook, verifies **AC-4**, **AC-19**
5. Wizard shell: the draft store with the idempotency key, one zod draft schema plus per step slices in `features/deliveries/schemas.ts`, the `[step]` route that resolves the step, the stepper header, and the redirect guard, verifies **AC-8**, **AC-14**, **AC-22**
6. Step 1 (type cards) and step 6 (ASAP plus slot two hours wides to 7 days, past slots blocked, UTC storage), verifies **AC-2**, **AC-7**
7. Steps 2 and 3: the map screen with a pin and reverse geocoded name, the search list, the saved address list, "use my location" on pickup with the permission fallback, verifies **AC-3**
8. Step 4: receiver name, `PhoneInput` with the `+234` default and E.164 output, the privacy note and link, verifies **AC-5**
9. Step 5: size cards, weight, handling flag chips, instructions cap, and the photo pick, upload, thumbnail, remove round trip, verifies **AC-6**
10. Full summary: rows for every part of the draft with tap to edit and return, and the pay method chooser (card and wallet), verifies **AC-9**, **AC-12**
11. `lib/payments/` with the `PaymentProvider` interface, the `MockPaymentProvider` card sheet (Luhn check, pending, `mock_` reference, the 0002 decline), and the offline block, verifies **AC-11**, **AC-18**
12. Submit flow: `create_order` then `pay_order` behind one mutation with the draft key, loading and error states, the wallet short path, and the insufficient balance state, verifies **AC-12**, **AC-13**, **AC-14**
13. Confirmation: tracking code with copy, status line, what was paid, save this address, view order disabled, send another clearing the draft, verifies **AC-15**, **AC-16**
14. Entry points: the action sheet Send row wired, Track disabled with its hint, home shortcuts starting the wizard, verifies **AC-1**, **AC-17**
15. Session and expiry handling: the expired session route with the draft kept, the `expire_pending_orders` migration and `pg_cron` job with its SQL test, verifies **AC-20**, **AC-21**
16. i18n sweep, light and dark pass, accessibility labels and Reduce Motion, route and component tests for the wizard, and CI green, verifies **AC-22**, **AC-23**

## Consequences

**Positive**:
- The price cannot be argued with or gamed from the client, and it is reproducible in a test rather than approximate in a phone.
- The `geo` function is one small, reusable piece: feature 10 gets routing on the same deploy, and if Geoapify is ever replaced only that function changes.
- Screens stay thin and the state lives in one typed draft, so feature 7 (orders list and detail) reads the same shapes it wrote.
- The app now has a query layer, so later features (wallet, orders, chat) get caching and retry states without inventing them again.

**Negative / tradeoffs**:
- Straight line times 1.4 is an estimate. A Lagos route that leaves the mainland for the island can be priced low against the road truth. Accepted for mock money, and it is a one function change when a real provider and real invoices arrive.
- The wizard now owns a dependency the rest of the app does not use yet (`@tanstack/react-query`), and `features/auth` still calls Supabase by hand, so two data patterns exist until feature 7 or `/sync` settles one.
- A dead app process loses the draft, and the customer starts again. This is the conscious cost of keeping a third party's phone number and address out of on the device storage.
- Changing a live function signature means every existing caller and test must be updated in the same PR, and the remote project needs the migration applied before the app builds against it.
- The card sheet is fake UI that looks real. It must never be mistaken for a payment integration, so its copy says "mock" on screen.
- One more scheduled job to reason about when something cancels an order unexpectedly.

**Neutral**:
- Three new packages, one new Edge Function, two new migrations, and roughly ten new route level files under `features/deliveries/`.
- The expiry job cancels quietly today; a notification about it belongs to feature 14.
- "View order" on the confirmation is disabled until feature 7 builds `/orders/[id]`.

## Follow-up

- [ ] Record the price rule (derived distance, 1.4 factor, no client distance) in `supabase/AGENTS.md` alongside the other RLS and function conventions, already proposed by spec 0002, so feature 9 and 12 do not reintroduce a client distance.
- [ ] Decide for real whether a courier may book a delivery (feature 6 leaves `create_order` open to any signed in user). If couriers may not, add the role check then, not now.
- [ ] Notify the customer when the expiry job cancels their unpaid order (feature 14).
- [ ] Consider whether the 1.4 detour factor should be replaced by Geoapify routing once feature 10 deploys the route action, and whether the price should then move to a server side call rather than a client argument (which is the security question this spec closed by derivation).
- [ ] Replace the mock card sheet when the real provider is chosen (Paystack or Flutterwave, deferred in the scope). The `PaymentProvider` interface is the only seam.
- [ ] Wire `features/auth` onto the query layer, or state in `AGENTS.md` that plain async functions are the auth exception, so the two patterns stop drifting.
- [ ] Confirm in the scope that feature 6 is GA (money and Storage), matching the scope's own rule.
- [ ] `expo-image-picker` needs a camera permission string in the app config; confirm it is set before the first device build, and that the copy lands in `locales/en.json`.
