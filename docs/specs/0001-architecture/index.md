# 0001. Stack and architecture for the SwiftTransit mobile app

**Date**: 2026-10-11
**Status**: Accepted (2026-10-11)

## Summary

SwiftTransit is one Expo app for iOS and Android, for Nigeria, that serves two roles: customers who send parcels and couriers who deliver them. We build it with Expo Router and NativeWind on the app side, MapLibre with free OpenStreetMap data for maps, and Supabase as the backend (database, sign in, live updates, file storage). Payments are faked behind one small interface until a real provider is chosen. Everything runs on free tiers because this is a portfolio project, and reviewers can try it with demo accounts. This spec covers the foundation only; each feature gets its own spec when it is designed.

## Requirements

**User stories**:
- As a developer, I want a scaffold that boots on a device with the real theme, fonts and navigation shell so every feature slice starts from working structure.
- As a customer or courier, I want the app to follow my system light/dark setting and text size so it is comfortable to use.
- As the team, I want secrets out of the repo and checks running on every PR so mistakes are caught before merge.

**Acceptance criteria**:
- **AC-1**: `npx expo start` with a development build runs the app on iOS and Android; `npx tsc --noEmit`, lint and tests pass.
- **AC-2**: Every colour, type style, spacing step and radius in [DESIGN.md](../../../DESIGN.md) is available as a NativeWind class, and semantic colours switch between light and dark with the system setting.
- **AC-3**: Urbanist (400/500/600/700) is embedded at build time; no flash of fallback font on launch.
- **AC-4**: The route tree in *Navigation map* exists with placeholder screens; signed-out users land on onboarding/auth, signed-in users land on the tabs for their role.
- **AC-5**: All user-facing strings go through i18n (English resource file); no hard-coded copy in components.
- **AC-6**: The Supabase client initialises from `EXPO_PUBLIC_*` env vars, persists the session in encrypted storage, and refreshes tokens only while the app is foregrounded.
- **AC-7**: A MapLibre map renders the OpenFreeMap Positron style (Dark style in dark mode) on a placeholder screen.
- **AC-8**: CI (GitHub Actions) runs typecheck, lint and tests on every PR to `main`.
- **AC-9**: No secret (service role key, provider secrets) exists in the app bundle or the repo; `.env` is gitignored and `.env.example` documents every variable.

## Decision

**Chosen option**: Expo SDK 57 + Expo Router + NativeWind 4 + MapLibre/OpenStreetMap + Supabase, with a mocked payment provider.

Build with development builds (not Expo Go, because MapLibre and native sign-in need native code), one codebase, two roles selected by the signed-in user's profile.

**Implementation skills**: `expo-router`, `expo-native-ui`, `expo-design-system`, `expo-dev-client` (`expo/skills`, global) · `animate-expo`, `emil-design-eng`, `mobile-native` (`emilkowalski/skills`, `.claude/skills/`) · `impeccable` (`pbakaus/impeccable`, `.claude/skills/`) · `secure-me` (`ajibolagenius/vibe-secure-me`, `.claude/skills/`) · `supabase` (`supabase/agent-skills`, global) · `ponytail` (`DietrichGebert/ponytail`, `.claude/skills/`)

## Proposed stack

| Layer | Choice | Reason |
|---|---|---|
| Language | TypeScript, `strict` | Default for Expo; catches contract drift with generated DB types |
| Framework | Expo SDK 57, React Native New Architecture, development builds via EAS | Managed native config (CNG), OTA updates, native modules |
| Navigation | Expo Router 57 (typed routes) | File-based, deep links for tracking links, native stack + sheets |
| Styling | NativeWind 4.2 (Tailwind 3 config) | Tokens from DESIGN.md become classes; `dark:` variants; v5 is still RC |
| UI components | Own primitives in `components/ui/` built to DESIGN.md | Design is custom; a kit (gluestack) would be restyled anyway. Native Bloom blocks used as reference only |
| Icons | `lucide-react-native` (pending Figma confirmation) | Consistent stroke icons, tree-shakeable |
| Animation & gestures | Reanimated 4, Gesture Handler, `expo-haptics` | UI-thread animation; what `animate-expo` assumes |
| Sheets & modals | Expo Router `formSheet` / `modal` presentations | Native sheets, no extra library |
| Maps | `@maplibre/maplibre-react-native` 11 | Open source, no vendor token or per-load fee |
| Basemap tiles | OpenFreeMap `positron` (light) / `dark` | Free OSM vector tiles, matches the grey map in designs |
| Geocoding & search | Geoapify Geocoding + Autocomplete, called through a Supabase Edge Function (`geo`) | OSM-based, free tier allows commercial use (3,000 credits/day), key stays server-side; results biased to Nigeria |
| Routing & ETA | Geoapify Routing through the same `geo` Edge Function | One provider and key for search and routes; the public OSRM demo is non-commercial and 1 req/s, so dev-only |
| Location | `expo-location` (+ `expo-task-manager` for courier background updates) | Foreground for customers, background only while a courier is on a delivery |
| Server state | TanStack Query 5 | Caching, retries, offline-friendly refetch |
| Local UI state | Zustand 5 (new-delivery wizard draft only) | Draft spans six routes; everything else is server or component state |
| Forms & validation | react-hook-form 7 + zod 4 | Same zod schemas validate client input and edge function input |
| Backend | Supabase: Postgres + RLS, Auth, Realtime, Storage, Edge Functions | All five needs (auth incl. phone OTP, relational orders, live tracking, chat, file uploads) in one service. See rationale |
| Auth | Supabase Auth: phone OTP (sent through the Send SMS hook → Edge Function → Termii, see *SMS*), email OTP (custom SMTP: Resend), Google and Apple sign-in. The Google/Apple mechanism (native SDKs vs OAuth) is superseded by [spec 0003](../0003-onboarding-authentication.md): Supabase OAuth providers through expo-auth-session PKCE | Matches the four sign-in options in the designs |
| Session storage | Supabase session encrypted with AES, key in `expo-secure-store`, ciphertext in `expo-sqlite` kv-store | SecureStore alone is too small for the session; plain storage would leave tokens readable |
| Payments | `PaymentProvider` interface + `MockPaymentProvider` | Real provider later (Paystack or Flutterwave for Nigeria); UI built once |
| Money & locale | Integer kobo; `Intl.NumberFormat('en-NG')`; `libphonenumber-js` with `NG` default | Exact arithmetic; Nigerian formats |
| Push | `expo-notifications` + Expo Push Service, sent from Edge Functions | Order status and new-request alerts |
| i18n | i18next + react-i18next + `expo-localization` | English now; French/Arabic later without refactor |
| Testing | Jest (`jest-expo`) + React Native Testing Library; Maestro for E2E flows | Standard for Expo |
| Lint & format | ESLint (`eslint-config-expo`, flat config) + Prettier | Expo default |
| CI/CD | GitHub Actions (typecheck, lint, test); EAS Build + EAS Update | PR gate plus store builds |
| Observability | PostHog (product analytics + error tracking), added in a later slice | One vendor for both; deferred until real users |
| Package manager | npm | Expo default, least surprise |

**Not adopted from the candidate list** (reasons in [rationale.md](rationale.md)): Mapbox, Leaflet, Dexie, gluestack-ui, Howler/Tone.js, Motion (motion.dev), Amicro, Driver.js.

## Architecture

### Hosting

Everything runs on free tiers; nothing to self-host.

| Concern | Where | Free-tier limit that matters | Upgrade path |
|---|---|---|---|
| Database, Auth, Realtime, Storage, Edge Functions | Supabase Free | Pauses after 1 week without activity; 500 MB DB, 1 GB storage, 200 concurrent realtime connections | A weekly GitHub Actions job that runs the demo reset (real activity, so the project stays awake); Supabase Pro ($25/mo) while actively interviewing if needed |
| Map tiles | OpenFreeMap | No key, no published quota | Self-host tiles or MapTiler |
| Geocoding + routing | Geoapify via `geo` Edge Function | 3,000 credits/day, ~5 req/s, attribution required | Paid Geoapify plan; cache frequent lookups in Postgres |
| SMS OTP | Termii via Send SMS hook | Pay-as-you-go, no free credit; demo numbers bypass SMS | Second provider as failover inside the same hook |
| Email OTP | Resend SMTP | 100 emails/day, 3,000/month | Resend paid |
| App builds & OTA | EAS Free | 15 Android + 15 iOS builds, low-priority queue; EAS Update 1,000 MAU | EAS Starter ($19/mo) |
| Distribution to reviewers | Android: EAS internal-distribution APK link. iOS: TestFlight public link (needs the $99/yr Apple Developer Program) or a simulator build + screen recording | n/a | n/a |
| CI | GitHub Actions | Free minutes for private repos are limited; unlimited if the repo is public | Make the repo public when it is ready to show |

### SMS

The Send SMS hook (on the Free plan) hands `{ user.phone, sms.otp }` to an Edge Function that verifies the webhook signature, skips sending for demo numbers, and calls the provider. Supabase keeps OTP generation, expiry and rate limits; the hook only delivers. Swapping providers touches one function.

Provider: **Termii**. It is Nigerian, has a DND/transactional route (OTPs reach numbers that opted out of promotions), a sender-ID API and WhatsApp/voice fallbacks. Alternatives and the Sent.dm assessment are in [rationale.md](rationale.md#sms-provider).

### Project layout

```
app/                      Expo Router routes (screens only, thin)
components/ui/            primitives built to DESIGN.md (Button, Input, OtpInput, SelectCard, Sheet, ...)
components/               feature components shared by several screens
features/<area>/          hooks, queries, schemas and logic per area (auth, delivery, orders, wallet, courier, chat, tracking)
lib/                      supabase client, i18n, payments, maps, geocoding, routing, storage
theme/                    tokens.ts (single source for tailwind.config + JS consumers)
locales/en.json           strings
supabase/                 migrations, seed, edge functions, generated types
assets/                   app icon, splash, fonts (app assets only; design references live in design/)
```

### Navigation map

```
app/
  _layout.tsx                         providers, fonts, theme, auth gate
  (onboarding)/index.tsx              3-slide carousel
  (auth)/welcome.tsx                  sign-in options
  (auth)/phone.tsx, email.tsx         enter phone / email (+ validation)
  (auth)/verify.tsx                   OTP (phone or email), invalid-code state
  (auth)/register.tsx                 name, email, account type (courier/client)
  (auth)/courier-apply.tsx            vehicle, licence, licence photo
  (customer)/(tabs)/index.tsx         Home
  (customer)/(tabs)/orders.tsx        Orders (all/active/past)
  (customer)/(tabs)/wallet.tsx        Wallet
  (customer)/(tabs)/profile.tsx       Profile
  (customer)/action-sheet.tsx         centre-tab sheet: Send / Track   (formSheet)
  (customer)/new-delivery/[step].tsx  wizard steps 1-6
  (customer)/new-delivery/summary.tsx order summary + payment
  (customer)/new-delivery/booked.tsx  confirmation                      (modal)
  (customer)/orders/[id].tsx          order detail + live tracking
  (customer)/profile/edit.tsx, addresses.tsx, ...
  (courier)/(tabs)/index.tsx          Home (offline/online, requests)
  (courier)/(tabs)/deliveries.tsx, earnings.tsx, profile.tsx
  (courier)/delivery/[id].tsx         request details / active delivery map
  chat/[orderId].tsx                  shared chat
  permission/location.tsx             shared permission sheet           (formSheet)
```

Screen-to-design mapping lives in [design/README.md](../../../design/README.md).

### Data model sketch

Detailed in the data-model spec (scope feature 3). Foundation-level shape:

- `profiles` (id = auth.users.id, role `customer|courier`, first/last name, phone, email, avatar_path, locale)
- `courier_applications` (courier_id, vehicle_type, vehicle_number, licence_number, licence_photo_path, status `pending|approved|rejected`)
- `addresses` (owner_id, label, line, lat, lng, is_default)
- `orders` (id, tracking_code unique, customer_id, courier_id null, type, pickup/dropoff snapshot + coords, receiver name/phone, instructions, package size/weight/value/photo_path, handling flags, scheduled_at null, status, price breakdown in kobo, payment_method, created_at)
- `order_events` (order_id, status, actor_id, at): the audit trail for every status change
- `messages` (order_id, sender_id, body, created_at)
- `wallet_transactions` (owner_id, amount_kobo signed, kind, order_id null, created_at); balance is a view/function over this ledger, never a mutable column
- Courier live position is **not** a table write per GPS tick: it goes over a private Realtime Broadcast channel per order, with a throttled `couriers_last_seen` upsert for matching.

Money is stored as integer kobo (₦1 = 100 kobo) and formatted only for display, e.g. `₦12,500.00`.

Order status machine: `pending_payment → searching → assigned → at_pickup → picked_up → at_dropoff → delivered`, with `cancelled` reachable before `picked_up` and `failed` from any active state. Only Edge Functions/SQL functions move status, each move writes `order_events`.

### Security model

- **RLS on every table, deny by default.** Customers read/write their own rows. Couriers read orders in `searching` within range through a SQL function that returns a reduced projection (no receiver phone or exact address until accepted) and read full rows only for orders assigned to them.
- **No client-side money or status writes.** Wallet entries, order pricing and status transitions run in Edge Functions or `security definer` functions that validate the actor.
- **Realtime**: private channels only (`order:<id>`), authorised by policies on `realtime.messages` so only the order's customer and courier can join. Keep JWT lifetime short since channel auth is cached per connection.
- **Storage**: private buckets (`avatars`, `package-photos`, `licences`), access through RLS and short-lived signed URLs. Licence photos readable only by the owner and service role.
- **Public tracking lookup** by tracking code returns status and ETA only, through a rate-limited function.
- **Auth abuse**: Supabase OTP rate limits tightened and CAPTCHA on OTP requests to contain SMS cost.
- **Secrets**: the app only ships the Supabase URL and publishable key (`EXPO_PUBLIC_*` values are public by definition). Service role key and provider secrets live in Edge Function secrets only.
- **Demo accounts**: reviewer logins use fixed test OTPs that skip SMS (Supabase test OTP mapping, or an allowlist checked in the Send SMS hook). Demo users can only see demo data, and a scheduled job resets it.
- **Privacy (NDPA 2023)**: collect only what a feature needs, consent at collection, privacy policy linked at sign-up, licence photos and phone numbers never exposed beyond their purpose, and in-app account deletion that removes personal data.
- **Location privacy**: courier position is shared only with the customer of the active order and only between `assigned` and `delivered`; background location stops when the delivery ends.
- Run the `secure-me` skill on every feature PR that touches auth, RLS, storage or money.

**Configuration required**:
- `EXPO_PUBLIC_SUPABASE_URL`: project URL
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: client key (public)
- `EXPO_PUBLIC_MAP_STYLE_LIGHT` / `EXPO_PUBLIC_MAP_STYLE_DARK`: style URLs (default OpenFreeMap positron/dark)
- Edge Function secrets (never in the app): `GEOAPIFY_API_KEY`, `TERMII_API_KEY`, `TERMII_SENDER_ID`, `SEND_SMS_HOOK_SECRET`, `DEMO_PHONE_NUMBERS`
- Supabase Auth SMTP settings: Resend SMTP credentials (dashboard, not env)
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`: native Google sign-in

**Critical test scenarios**:
- Happy path: fresh install boots to onboarding; a stubbed signed-in customer boots to customer tabs, a courier to courier tabs, verifies **AC-1**, **AC-4**
- Theme: switching system appearance swaps semantic colours without reload, verifies **AC-2**
- Failure case: missing env var fails fast at startup with a clear message, verifies **AC-6**, **AC-9**
- Session: token is not readable in plain storage; app resumes signed in after restart, verifies **AC-6**

## Build plan

Tracer Bullet: thin, working thread through every layer first.

1. Scaffold Expo SDK 57 (TypeScript, Expo Router) in the repo root, add dev-client, EAS config, `app.config.ts` with bundle ids, satisfies **AC-1**
2. ESLint + Prettier + `tsc` scripts, Jest with one smoke test, GitHub Actions workflow, satisfies **AC-1**, **AC-8**
3. `theme/tokens.ts` from DESIGN.md → `tailwind.config.js` + NativeWind setup, semantic colours as CSS variables with light/dark values, satisfies **AC-2**
4. Embed Urbanist via the `expo-font` config plugin, satisfies **AC-3**
5. i18n setup with `locales/en.json`, satisfies **AC-5**
6. `lib/supabase.ts` with encrypted session storage and AppState-driven auto refresh, env validation with zod, `.env.example`, satisfies **AC-6**, **AC-9**
7. Route tree with placeholder screens and the role-based auth gate, satisfies **AC-4**
8. MapLibre placeholder screen with light/dark styles, satisfies **AC-7**

## Consequences

**Positive**:
- One backend covers auth, data, realtime, storage and server logic; least glue code.
- No map vendor lock-in or per-load billing.
- Payment provider can change without touching UI.

**Negative / tradeoffs**:
- Development builds are required from day one (no Expo Go), so device testing needs an EAS or local build.
- Free tiers have ceilings (Supabase pauses after a week idle, Geoapify 3,000 credits/day, Resend 100 emails/day, EAS low-priority build queue). Fine for a showcase; see *Hosting* for the upgrade path.
- Supabase is a platform dependency; mitigated because it is plain Postgres underneath.

**Neutral**:
- `assets/` holds app assets only; Figma references moved to `design/`.
- NativeWind 5 (Tailwind 4) migration later, once it leaves RC.

## Follow-up

- [ ] Confirm font (Urbanist), icon library, and the measured type/spacing/radius values in Figma.
- [ ] Re-export the 11 design files overwritten during setup (list in `design/README.md`).
- [ ] Register a Termii sender ID and confirm DND (transactional) delivery and per-OTP cost; fund a small balance.
- [ ] Decide the real payment provider (Paystack vs Flutterwave) if the project goes beyond mock payments.
- [ ] Decide how courier applications are approved (manual in Supabase dashboard for MVP vs an admin tool).

## Rationale

Options, comparison (including Neon vs Supabase) and sources: [rationale.md](rationale.md).
