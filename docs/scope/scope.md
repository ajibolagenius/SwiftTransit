# Scope: SwiftTransit

An on-demand courier app for Nigeria (Lagos first), built as a production-quality portfolio project: customers book, pay for and track local deliveries; couriers go online, accept nearby jobs and deliver them. One Expo app for iOS and Android, two roles.

**Build approach:** Tracer Bullet (stand up a thin end-to-end thread through every layer first, then thicken it).
**Workflow:** Beta (`/check verify`, then `/test` after each `/develop`). Features touching auth, RLS, storage or money are `· GA` and also get `/check review` plus a `secure-me` pass.

_These are recommendations to keep your build orderly, not requirements. Skip anything that does not fit: if you already know how to build a feature, use `/develop` and skip `/architect`. You decide when a feature is `done`._

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| 1 | Stack & architecture | Foundation | in-progress |
| 2 | Coding standards & tooling | Foundation | planned |
| 3 | Data model & security | Foundation | done |
| 4 | Design system & UI primitives | Foundation | planned |
| 5 | Onboarding & authentication | Slice 1 | planned |
| 6 | Create a delivery | Slice 1 | planned |
| 7 | Orders list & order detail | Slice 1 | planned |
| 8 | Courier application & go online | Slice 2 | planned |
| 9 | Delivery requests & lifecycle | Slice 2 | planned |
| 10 | Live tracking & navigation | Slice 3 | planned |
| 11 | Chat & call | Slice 3 | planned |
| 12 | Wallet & earnings (mock payments) | Slice 4 | planned |
| 13 | Profile & settings | Slice 4 | planned |
| 14 | Push notifications | Slice 4 | planned |
| 15 | Demo mode & showcase | Slice 5 | planned |

## Foundations

### 1. Stack & architecture · in-progress
Decide the stack and scaffold a runnable project so every later slice builds on real structure.
**Done when:** the stack is recorded in a spec and the scaffold boots on iOS and Android dev builds with theme, fonts, i18n, Supabase client, route shell and a map, and passes CI.
- [x] Decide the stack (spec): `/architect stack & architecture`
- [x] Build it: `/develop stack & architecture`
   - [x] Expo SDK 57 scaffold, lint, tests, CI (AC-1, AC-8)
   - [x] Tokens → NativeWind, Urbanist, light/dark (AC-2, AC-3)
   - [x] i18n, Supabase client with encrypted session, env validation (AC-5, AC-6, AC-9)
   - [x] Route tree with role-based gate, MapLibre placeholder (AC-4, AC-7)
- [x] Verify it: `/check verify stack & architecture`
- [x] Test it: `/test stack & architecture`
Spec 0001 · code in `./` (app/, components/, features/, lib/, theme/)

### 2. Coding standards & tooling
Capture conventions from the real scaffold, then enforce them with lint, format and pre-commit hooks.
**Done when:** root `AGENTS.md` reflects the real stack and commands, and lint/format/typecheck run clean locally and in CI.
- [x] Capture conventions + tooling choices: `/audit`

### 3. Data model & security · GA · done
Tables, RLS policies, status machine, wallet ledger, storage buckets and realtime channel policies every feature builds on.
**Done when:** migrations apply cleanly, RLS denies cross-user access in tests, and generated types are in the app.
- [x] Design it (spec): `/architect data model & security` → [0002](../specs/0002-data-model-security/index.md)
- [x] Build it: `/develop data model & security`
   - [x] Toolchain, first policy thread, CI test harness (AC-1, AC-3)
   - [x] Full schema, RLS matrix, definer functions (AC-1, AC-4, AC-5, AC-6, AC-9, AC-10, AC-11)
   - [x] Storage and realtime guards, delete-account function (AC-7, AC-9)
   - [x] Generated types, error copy, seeds, completion tests (AC-2, AC-3, AC-5, AC-8, AC-10)
- [x] Verify it: `/check verify data model & security`
- [x] Test it: `/test data model & security`
- [x] Review it (fresh model): `/check review data model & security`
- [ ] Document it: `/document data model & security`
Spec [0002](../specs/0002-data-model-security/index.md) · code in `supabase/` (migrations, `.test`, `functions`), `lib/supabase/types.ts`

### 4. Design system & UI primitives
Build the primitives in DESIGN.md (Button, IconButton, Input, PhoneInput, OtpInput, SelectCard, Segmented, StepperHeader, Chip, Sheet, TabBar with centre action, OrderCard, BalanceCard) with light/dark, accessibility labels and Reduce Motion.
**Done when:** every primitive renders in both themes on a dev-only gallery screen, meets 44 pt targets, and passes an `impeccable audit`.
- [ ] Build it: `/develop design system & UI primitives`

## Slice 1: Customer can book and see a delivery

### 5. Onboarding & authentication · needs a decision · GA
Onboarding carousel, welcome screen, phone and email OTP, Google and Apple sign-in, registration with account type, location permission sheet.
**Done when:** a new user can sign up with any of the four methods, verify OTP (with invalid-code and resend timer states), choose customer or courier, and lands in the right tabs; a returning user skips onboarding.
- [ ] Design it (spec): `/architect onboarding & authentication`

### 6. Create a delivery · needs a decision
The tracer-bullet core: home shortcuts and centre-action sheet into the 6-step wizard (type, pickup, drop-off, receiver, package, schedule), order summary with price breakdown, mock payment, booking confirmation with tracking number.
**Done when:** a customer completes the wizard using map pick, address search or saved address, sees the price before paying, pays with the mock card or wallet, and gets a tracking number; the order exists in the database as `searching`.
- [ ] Design it (spec): `/architect create a delivery`

### 7. Orders list & order detail
Orders tab with all / active / past filters, tracking-number search, home "Active deliveries", order detail with status timeline.
**Done when:** the customer sees their orders filtered correctly, can search by tracking number, and opens any order to see its status history.
- [ ] Design it (spec): `/architect orders list & order detail`

## Slice 2: Courier can take a job

### 8. Courier application & go online · needs a decision · GA
Courier application (vehicle type, vehicle number, licence number, licence photo upload, location permission), pending/approved states, online/offline toggle and courier home.
**Done when:** a courier submits an application with photo, sees its status, and once approved can toggle online; offline couriers receive no requests.
- [ ] Design it (spec): `/architect courier application & go online`

### 9. Delivery requests & lifecycle · needs a decision · GA
Nearby request feed and detail, accept, at-pickup / picked-up / at-drop-off / delivered steps, report an issue, cancellation rules.
**Done when:** one request can be accepted by exactly one courier (race-safe), each step updates the customer's order status, and illegal transitions are rejected server-side.
- [ ] Design it (spec): `/architect delivery requests & lifecycle`

## Slice 3: Live experience

### 10. Live tracking & navigation · needs a decision
Courier location broadcast while on a delivery, customer live map with ETA, courier route with distance, next-turn banner and remaining distance; production geocoding/routing hosting.
**Done when:** the customer sees the courier move within a few seconds of real movement, ETA updates, and location sharing stops at delivery.
- [ ] Design it (spec): `/architect live tracking & navigation`

### 11. Chat & call
Per-order chat between customer and courier, call button using the device dialer.
**Done when:** both sides exchange messages in real time on an active order, history persists, and chat closes after delivery.
- [ ] Design it (spec): `/architect chat & call`

## Slice 4: Money, profile, notifications

### 12. Wallet & earnings (mock payments) · needs a decision · GA
Customer wallet balance, mock top-up, pay with wallet, transaction history; courier earnings balance, weekly stats, mock withdrawal. All behind the `PaymentProvider` interface.
**Done when:** balances are derived from the ledger, every payment/top-up/payout is idempotent, and swapping the mock for a real provider touches only `lib/payments`.
- [ ] Design it (spec): `/architect wallet & earnings`

### 13. Profile & settings
Profile, edit profile with avatar upload, saved addresses, payment methods (mock), language (English only, wired to i18n), notification settings, help/contact/legal links, logout.
**Done when:** every profile row leads to a working screen or link, edits persist, and a user can delete their account and personal data in-app (NDPA 2023, store requirement).
- [ ] Build it: `/develop profile & settings`

### 14. Push notifications
Order status updates for customers, new nearby requests for online couriers, chat messages; permission asked at first relevant moment.
**Done when:** notifications arrive on both platforms for each event and deep-link to the right screen.
- [ ] Design it (spec): `/architect push notifications`

## Slice 5: Showcase

### 15. Demo mode & showcase · needs a decision
Let a hiring team try the whole product alone in two minutes: seeded demo customer and courier accounts with fixed test OTPs, a simulated courier that accepts a demo order and drives the route so live tracking is visible on one phone, a weekly demo-data reset (which also keeps the free Supabase project awake), and a README with screenshots, a screen recording, an install link and CI badges.
**Done when:** a reviewer installs the Android build from the README link, signs in as the demo customer without SMS, books a delivery and watches a simulated courier complete it; demo users cannot see or change real users' data.
- [ ] Design it (spec): `/architect demo mode & showcase`

## Deferred
Out of scope for the current build pass, kept so the plan stays honest.
- **Real payment provider**: Paystack vs Flutterwave, card tokenisation, payouts · needs a decision · GA
- **Nigerian languages**: Pidgin, Yoruba, Hausa, Igbo translations · needs a decision
- **QR scan for tracking numbers**: the scan icon in search fields
- **Courier approval admin tool**: manual approval in Supabase dashboard until then · needs a decision
- **Analytics & error tracking (PostHog)**: before public launch
- **Scheduled pickups beyond 7 days, multi-stop deliveries, ratings & tips**: not in the designs

## Legend

**The decision box.** The sub-task whose label ends with `(spec)`. Skills locate it by that suffix. Features already decided elsewhere (4 by `DESIGN.md`, 13 by the designs) start at `/develop`.

- **Next step** = the first unticked box.
- **needs a decision** = run `/architect` first; otherwise straight to `/develop` (or `/audit` for standards & tooling).
- **Atomic build tasks live in the spec's `## Build plan`**; the scope carries only the milestone rollup.
- **Status** `planned` → `in-progress` → `done`, plus `dropped`.
- **`· GA`** raises that feature's rigor: `/check verify`, `/test`, `/check review`, `/document`, plus a `secure-me` audit.
- **Pointer line** (`Spec <n> · code in <path>`): spec added by `/architect`, code path by `/develop`.
