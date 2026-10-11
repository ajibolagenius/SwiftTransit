# 0001. Rationale: stack and architecture

## Context

SwiftTransit needs a customer app and a courier app with phone/email/Google/Apple sign-in, a six-step booking flow, relational data (orders, addresses, wallet ledger), live courier location on a map, in-order chat, file uploads (avatars, package photos, licence photos), push notifications and payments in naira. Users are in Nigeria (Lagos first). The UI kit was bought with Tunisian sample content; that content is replaced. It is a portfolio project shown to hiring teams: production quality, free tiers, and reviewers must be able to try it without a Nigerian SIM. Every service we run ourselves is a cost.

The user supplied a candidate list (NativeWind, Mapbox, Dexie, gluestack, Photon/OSM, Leaflet, Howler/Tone.js, MapLibre, Motion, Amicro, Driver.js, Native Bloom) and asked to pick only what fits. Several are web libraries that don't run in React Native, so the decision is partly filtering.

Answers already given: payments mocked for MVP, MapLibre + OSM for maps, English at launch with i18n ready, Supabase as the backend (chosen 2026-10-11 after the comparison below).

## Options considered

### Backend

#### Option 1: Supabase

Postgres with RLS, Auth (phone OTP via Twilio/MessageBird/Vonage, email OTP, Google, Apple native via `signInWithIdToken`), Realtime (Broadcast, Presence, Postgres Changes, with private channels authorised by RLS on `realtime.messages`), Storage (RLS, image transforms, resumable uploads), Edge Functions.

**Pros**:
- Covers every backend need of this app in one service, including realtime for tracking and chat.
- Phone OTP is built in with documented providers, rate limits and CAPTCHA guidance.
- Documented Expo path, including native Apple sign-in.

**Cons**:
- Platform dependency (mitigated: standard Postgres, exportable).
- SMS cost per OTP; rate limits must be tuned. Built-in SMS providers (Twilio, MessageBird, Vonage, TextLocal) are not Nigerian, but the Send SMS hook (available on Free) lets any provider deliver.
- Free projects pause after a week of inactivity.

#### Option 2: Neon (+ Managed Better Auth + Data API)

Serverless Postgres with branching and scale to zero, Managed Better Auth (users stored in the `neon_auth` schema), a PostgREST-style Data API using JWT + RLS, object storage and Node functions.

**Pros**:
- Excellent Postgres: branching per PR, scale to zero, instant restore.
- Auth data lives in your own database and branches with it.
- Generous auth MAU allowance.

**Cons**:
- No realtime or change-subscription feature in the docs. Live tracking and chat would need a second vendor (Ably, Pusher) or a self-run WebSocket server.
- Managed auth documents Next.js, React (Vite/React Router/TanStack) only; React Native/Expo is not listed, and "standalone frontend + backend" is "coming soon".
- Apple sign-in is not listed; the Phone Number plugin is listed without saying how SMS is sent.
- Managed auth is AWS regions only.

#### Option 3: Firebase

Auth + Firestore + Storage + FCM + Functions.

**Pros**: mature mobile SDKs, phone auth, realtime by default.
**Cons**: document store fits orders/wallet ledger poorly (no joins, no constraints); security rules instead of SQL; vendor lock-in.

#### Option 4: Custom API (Node + Postgres)

**Pros**: full control.
**Cons**: we would build auth, OTP, realtime, uploads and ops ourselves; slowest path for a small team.

### Maps

- **MapLibre React Native + OpenFreeMap** (chosen by the user): open source, no token, no per-load billing.
- **Mapbox (`@rnmapbox/maps`)**: polished, includes navigation SDK options, but token-based and billed per load/request.
- **Leaflet**: web DOM library. In React Native it would only run inside a WebView. Rejected.

### Geocoding and routing

- **Public Photon + public OSRM demo**: free and keyless, but Photon's public instance is "reasonable use", may throttle or ban, with no guarantees, and the OSRM demo is "non-commercial", max 1 request/second, no uptime guarantee. Fine for development, risky in front of a hiring team.
- **Self-hosted Photon + OSRM/Valhalla**: no limits, but Photon wants ~95 GB disk and up to 64 GB RAM for the planet (less for a Nigeria extract) plus a routing server. Ops work that shows nothing in a portfolio.
- **Geoapify** (chosen): OSM-based geocoding, autocomplete and routing under one key; the free plan allows commercial use at 3,000 credits/day and ~5 req/s, with attribution. Called from an Edge Function so the key never ships in the app.
- **Stadia Maps**: free plan forbids commercial use. Rejected.
- **Mapbox Search/Directions**: polished, token-based and billed. Not needed.

### SMS provider

| Provider | Nigeria fit | Cost signal (from vendor pages, Oct 2026) | Notes |
|---|---|---|---|
| **Termii** (chosen) | Nigerian; DND/transactional route; sender-ID API; WhatsApp and voice channels | Pay as you go, no minimums; per-SMS rate from sales/dashboard; no free trial listed | Most common choice for Nigerian OTP; plug into the Send SMS hook |
| Sent.dm | Lists Nigeria in its rate table; lists Supabase as an integration partner | **No free tier.** $0.015 per unique contact per month platform fee, plus carrier fees passed through at cost (Nigeria shown at about $0.0095 on the homepage) | Unified SMS/WhatsApp/RCS API with a Node SDK. Viable, but the per-contact fee is on top of carrier cost, Nigeria sender-ID rules are unclear, and there is no setup guide for the Supabase integration. Not free, so it doesn't meet the "free tier" ask |
| Sendchamp | Nigerian | SMS from ₦4 per message (third-party listing) | Sender IDs approved in dashboard; DND handling not documented |
| BulkSMS Nigeria | Nigerian | From ₦6.49 per SMS excl. VAT (third-party listing) | Simple HTTP API; OTP use case page |
| Message Central VerifyNow | Lists Nigeria | Free test credits; OTP from about $0.0055 (vendor marketing) | Verification-as-a-service; pricing pages looked unpolished |
| Africa's Talking | Pan-African, includes Nigeria | Pricing page not reachable; sandbox for testing | Named in Supabase's hook docs as an option |
| Twilio | Global | $0.3868 per SMS segment to Nigeria | Built into Supabase, but tens of times the price of local providers |

None offers a lasting free tier for real Nigerian SMS. The free part is the architecture: demo numbers never send an SMS, email OTP (Resend free tier) and Google/Apple are the default real sign-ins, and the phone path is funded with a few dollars of Termii credit and guarded by rate limits and CAPTCHA.

### Styling and components

- **NativeWind 4** (chosen): Tailwind classes compiled for RN, dark variants, tokens in one config. v5 (Tailwind 4) is RC, so not yet.
- **gluestack-ui**: a component kit on top of NativeWind. Our design is fully custom, so we would restyle every component and carry the kit's abstractions. Rejected for now; individual patterns can be borrowed.
- **Native Bloom**: copy-paste RN blocks. Useful as reference, not a dependency.

### Local storage

- **Dexie**: IndexedDB wrapper, browser only. Doesn't run in React Native. Rejected.
- **expo-sqlite (kv-store) + expo-secure-store**: native, already part of Expo. Chosen for the encrypted session and small caches. TanStack Query handles server-data caching.

### Other candidates

- **Howler.js / Tone.js**: Web Audio libraries, not for RN. If the courier "new request" alert needs a custom sound, it ships with the push notification or uses `expo-audio`.
- **Motion (motion.dev)**: web animation library. In RN, Reanimated 4 is the equivalent and what the motion skills target.
- **Amicro**: open-source React (web) micro-interaction components installed through a shadcn-style CLI. Web only. Its ideas inform our Reanimated micro-interactions.
- **Driver.js**: web product-tour library. The designs use an onboarding carousel, not a tour. Not needed.

## Rationale

The deciding factor is realtime. Live courier tracking and chat are core to the product. Supabase ships authorised, low-latency Broadcast channels next to the database. Neon's docs describe no realtime feature at all, so choosing Neon means adding and securing a second service for the most important screen. Neon's auth also doesn't document React Native/Expo, Apple sign-in, or how phone OTP sends SMS, which are three of the four sign-in options in the designs. Neon is a better pure Postgres host (branching, scale to zero), but this app needs a backend platform, not only a database. Supabase covers auth, data, realtime, storage and server functions with one security model (RLS), which keeps the codebase and the threat surface small.

MapLibre + OpenFreeMap gives a map that matches the grey basemap in the designs with no keys or billing. Geoapify covers search and routing on a free tier that allows this use, behind an Edge Function so the key stays private and the provider can be swapped. It is weaker on turn-by-turn navigation than Mapbox, but the courier screens only need a route line, distance and next turn, which a routing response provides. That trade is revisited in the live-tracking spec if real navigation becomes a requirement.

The remaining picks follow one rule: use what Expo and React Native already provide (Router sheets, expo-sqlite, expo-secure-store, Reanimated) and add a library only where it removes real code (NativeWind for tokens, TanStack Query for server state, react-hook-form + zod for forms). Web-only libraries from the candidate list are rejected because they don't run natively.

## References

**Project sources**:
- `design/` screen exports and `design/_Design System.png`
- `PRODUCT.md`, `DESIGN.md`
- Installed skills: `expo/skills`, `emilkowalski/skills`, `pbakaus/impeccable`, `ajibolagenius/vibe-secure-me`, `supabase/agent-skills`

**Practices & standards**:
- Deny-by-default RLS, server-side money and state transitions, append-only ledger for wallet balance
- OWASP MASVS: no secrets in the client bundle, encrypted token storage
- Integer minor units for money

**Links** (read on 2026-10-11 while writing this spec):
- Neon introduction: https://neon.com/docs/introduction
- Neon Auth overview: https://neon.com/docs/auth/overview
- Neon Auth roadmap: https://neon.com/docs/auth/roadmap
- Neon Data API: https://neon.com/docs/data-api/get-started
- Supabase phone login: https://supabase.com/docs/guides/auth/phone-login
- Supabase Realtime: https://supabase.com/docs/guides/realtime
- Supabase Realtime authorization: https://supabase.com/docs/guides/realtime/authorization
- Supabase Sign in with Apple: https://supabase.com/docs/guides/auth/social-login/auth-apple
- Supabase Storage: https://supabase.com/docs/guides/storage
- Supabase React Native quickstart: https://supabase.com/docs/guides/auth/quickstarts/react-native
- OpenFreeMap styles (positron, dark): https://tiles.openfreemap.org/styles/positron
- Photon (usage policy, self-hosting): https://github.com/komoot/photon
- OSRM demo server policy: https://github.com/Project-OSRM/osrm-backend/wiki/Demo-server
- Geoapify pricing: https://www.geoapify.com/pricing/
- Stadia Maps pricing: https://stadiamaps.com/pricing/
- Supabase pricing (Free plan limits, hooks on Free): https://supabase.com/pricing
- Supabase Send SMS hook: https://supabase.com/docs/guides/auth/auth-hooks/send-sms-hook
- Supabase self-hosted phone config (test OTP mapping): https://supabase.com/docs/guides/self-hosting/self-hosted-phone-mfa
- Sent.dm: https://www.sent.dm and https://www.sent.dm/pricing
- Termii pricing: https://termii.com/pricing
- Twilio SMS pricing, Nigeria: https://www.twilio.com/en-us/sms/pricing/ng
- Message Central VerifyNow, Nigeria: https://www.messagecentral.com/product/verify-now/pricing/nigeria
- Nigerian OTP API comparison: https://www.buildstudio.com.ng/features/otp
- Nigerian DND/transactional routes: https://sendar.io/blog/how-to-send-bulk-sms-nigeria/
- Resend pricing: https://resend.com/pricing
- EAS pricing: https://expo.dev/pricing
