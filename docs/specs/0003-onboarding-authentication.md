# 0003. Onboarding and authentication flows

**Date**: 2026-10-17
**Status**: In Progress

## Summary

This is how a person becomes a signed-in user of SwiftTransit. A new install sees three intro slides once, then signs in by phone, email, Google, or Apple; phone and email confirm with a one-time code (OTP). After the first sign-in, everyone completes one short registration form (name plus customer or courier), and the app routes them to the right tabs. The backend was already decided in spec 0001 (Supabase Auth) and the data rules in spec 0002; this spec designs the screens, the states between them, and the failures (wrong code, no SMS, offline, expired session).

## Context

The app boots to placeholder screens with a working route gate (`features/auth/`) and an encrypted session store (`lib/supabase.ts`), but no real sign-in exists. Four methods must converge on one identity: phone OTP, email OTP, Google, Apple. Nigeria-first realities shape the flow: many users have a phone number before an email, SMS delivery depends on a paid third party (Termii, spec 0001) that can fail or be delayed, and a reviewer testing the app may have no Nigerian SIM (handled by demo accounts in feature 15, prepared here).

The data side is settled and this feature must not reopen it: `profiles` and the `complete_registration` function exist in spec 0002, role is written only by that function, and RLS denies everything else. The open questions are the flow itself: who sees the carousel, what each method requires before registration, how the OTP screen behaves, and what every failure shows.

Compliance: NDPA 2023 applies (phone numbers, emails, OAuth identities). Consent must be visible at collection; in-app account deletion is owned by feature 13.

## Requirements

**User stories**:
- As a new user, I want three short slides to tell me what the app does before I hand over my phone number.
- As a user, I want to sign in with whichever of the four methods I already have, and end up in the right tabs either way.
- As a user who mistyped a code, I want to be told clearly and be able to try again without starting over.
- As a reviewer without a Nigerian SIM, I want the app to still let me in when SMS never arrives (email fallback here; fixed demo codes in feature 15).
- As a returning user, I want to open the app straight into my tabs, with onboarding and sign-in skipped.

**Acceptance criteria**:
- **AC-1**: The 3-slide carousel shows once per install (an AsyncStorage flag), has Next, a "Jump to Sign in" skip link on every slide, and a final action on slide 3; slide 3 content is defined in this spec because its Figma export is missing.
- **AC-2**: Phone sign-in accepts a Nigerian number through PhoneInput (default `+234`, E.164 stored), sends an OTP through Supabase, and an invalid or expired code shows the invalid-code state from the designs.
- **AC-3**: Email sign-in sends an OTP to a new or existing address (one path signs up and signs in), and a malformed address shows the validation error state from the designs before any send.
- **AC-4**: Google and Apple sign-in complete through Supabase OAuth with PKCE, land on registration with names prefilled, and skip OTP entirely.
- **AC-5**: The OTP screen auto-submits at the 6th digit, offers resend after a 45 s countdown, and when Supabase's rate limit is hit shows a "try again later" state instead of a silent failure.
- **AC-6**: A signed-in user with no profile lands on registration (first name, last name, optional email, account type); submitting calls `complete_registration` and the app routes couriers to courier tabs and customers to customer tabs.
- **AC-7**: A returning user with a live session skips onboarding and registration and lands in the tabs for their role; the session survives an app restart through the encrypted storage from spec 0001.
- **AC-8**: If the session has expired at launch, the user lands on welcome with a "session expired, sign in again" notice, not a blank or dead screen.
- **AC-9**: A failed `profiles` read (network error) never sends a signed-in user to registration; it shows a retry state. Only a confirmed missing profile row routes there.
- **AC-10**: On a signed-out offline launch the carousel renders (static content) and the welcome buttons show a clear "you are offline" state instead of spinning forever.
- **AC-11**: The verify screen carries an "SMS not arriving? use email instead" escape link that switches the flow to the email channel.
- **AC-12**: The shared location permission sheet exists at `permission/location` as a formSheet with allow, ask-later, and a denied path that opens device settings; any flow can link to it.
- **AC-13**: Terms of Service and Privacy Policy links sit at the sign-in decision (welcome) and on registration; all copy goes through i18n; every screen works in light and dark, respects Reduce Motion, and every icon-only control has an accessibility label.
- **AC-14**: `EXPO_PUBLIC_DEV_AUTH_STUB` keeps bypassing auth in dev builds only, exactly as it works today.

## Options considered

### Option 1: Supabase Auth with OTP plus OAuth through expo-auth-session

Use the already-chosen Supabase Auth for everything: `signInWithOtp` for phone and email, and its built-in Google and Apple OAuth providers driven by the standard React Native PKCE flow (expo-auth-session opening expo-web-browser, callback returning to the app scheme).

**Pros**:
- One code path for both providers and both platforms; no extra native SDKs to configure, version, or debug in the dev build.
- Supabase owns token exchange, user creation, and account linking; the app only handles redirects.
- The Send SMS hook keeps provider keys server-side (spec 0001).

**Cons**:
- Google shows its web consent sheet rather than the native account picker, a slightly lesser UX on iOS.
- Apple requires its service to be configured in the Supabase dashboard (extra one-time setup).

### Option 2: Native provider SDKs

`@react-native-google-signin/google-signin` with `signInWithIdToken` on both platforms and `expo-apple-authentication` on iOS, as spec 0001 originally leaned. Android Apple falls back to a web flow anyway.

**Pros**:
- Best UX on iOS: native sheets from both providers, Google's real account picker.
- `signInWithIdToken` is a well-documented Supabase path.

**Cons**:
- Two integration styles (native for Google, web for Apple on Android), more config keys, more dev-build surface to break.
- The Google native SDK has had frequent breaking minor releases; each one can block an Expo upgrade.

### Option 3: Email and password, hashed in Postgres

A self-managed credential table with bcrypt through Postgres extensions, keeping Supabase only as the database.

**Pros**:
- No OTP delivery cost at all; users keep one memorized secret.

**Cons**:
- Rebuilds reset, lockout, breach handling, and secure storage from scratch, the classic auth failure mode; spec 0001 rejected rolling our own for good reason.
- Passwords are unpopular in this market; the designs show no password field anywhere.

## Decision

**Chosen option**: Option 1: Supabase Auth with OTP plus OAuth through expo-auth-session.

Four sign-in methods, one backend identity, one client flow family. This supersedes the native-SDK lean in spec 0001's stack table for Google and Apple only; everything else in spec 0001 stands.

**Implementation skills**: `secure-me` (`ajibolagenius/vibe-secure-me`, `.claude/skills/secure-me/`) · `supabase` (`supabase/agent-skills`, global) · `expo-router` (`expo/skills`, global) · `mobile-native` (`emilkowalski/skills`, `.claude/skills/mobile-native/`) · `impeccable` (`pbakaus/impeccable`, `.claude/skills/impeccable/`) · `ponytail` (`DietrichGebert/ponytail`, `.claude/skills/ponytail/`) · `animate-expo` (`emilkowalski/skills`, `.claude/skills/animate-expo/`)

## Rationale

Option 1 wins because this is a portfolio app on a free tier maintained by one person: the boring, single-path option with the fewest native moving parts is the one that stays alive through Expo upgrades. The native picker UX in Option 2 is real but small, and Android Apple was going to be a web flow either way, so Option 2 keeps two code paths to gain one. Option 3 fails the "never reinvent auth" rule with no offsetting benefit. (basis: spec 0001 already chose Supabase Auth and the PKCE mobile flow is its documented React Native pattern; the ponytail convention in `AGENTS.md`, smallest change that works)

The OTP-first, one-path email flow matches the designs (no separate sign-up button) and leaks no account existence. Auto-linking on confirmed emails prevents the worst self-lockout: the same person tapping Google after signing up by phone. (basis: spec 0002 §Auth trust boundaries, the auth event log as the consent record)

## Feature design

**Data model sketch** (no new tables, no migration; this feature only reads and writes what spec 0002 built):
- `auth.users` (Supabase managed): identity for all four methods; phone E.164, email, OAuth identities; signup events are the consent record.
- `profiles` (spec 0002): id, role, first/last name, phone, email, locale, is_demo. Written for this feature only through `complete_registration`.
- AsyncStorage key `swifttransit.onboarding_seen` = `'1'`: the carousel gate. Not sensitive, never synced, one-way (set on completion or skip, never cleared by the app).
- Verify channel is route state, not storage: `verify?channel=phone|email` plus the destination shown in the header text.

**State transitions**:

Sign-in flow (one method at a time):
`welcome → (phone | email → code sent → verifying → success | invalid → code sent) → registration → role tabs`
`welcome → (google | apple → browser redirect → session) → registration → role tabs`
OTP sub-states: `idle → code_sent(45 s resend timer) → auto-submit at 6 digits → invalid (retry, resend unlocked) | rate_limited (try later) | success`. An expired code (Supabase default 120 s window) lands in the same invalid state with "code expired" copy.

**Client behavior rules** (settled here so `/develop` invents none of them):
- **Error mapping**: Supabase auth errors are matched on their message. Contains "rate limit" to the rate-limited state; contains "expired" to the invalid state with expired copy; any other verify failure to the invalid state with "check the digits" copy; any send failure to a generic retry plus the email escape link (AC-11).
- **OAuth handoff**: the `useAuthSession` hook lives on `welcome.tsx`; the browser opens full-screen; the redirect `swifttransit://auth/callback` is registered in the expo-router linking config; navigation to registration is driven by the existing `onAuthStateChange` path in `AuthProvider`, not by the hook callback. The provider is read from `session.user.app_metadata.provider` to decide name prefill.
- **Verify channel**: carried as a route param; a cold restart landing on `verify` with no param redirects to welcome (start over, no orphaned screen).
- **Resend timer**: store the send timestamp, derive remaining time on each tick and on app foreground; if 45 s already elapsed, unlock immediately.
- **Carousel flag timing**: read AsyncStorage once before the protected route tree renders (alongside the font load in `app/_layout.tsx`), pass it into `AuthProvider`; a read error defaults to seen (never trap a user in the carousel); the dev stub forces seen so stubbed walks land on tabs.
- **Registration email**: the optional email field is written with `supabase.auth.updateUser({ email })` first when the account is phone-only (an "email taken" error shows inline on the field), then `complete_registration(first, last, role)` runs unchanged; for email or OAuth accounts the field is prefilled, read-only, and already on `auth.users`.

Auth gate (extends `features/auth/guards.ts`):
`loading → signed-out(onboarding if flag unset, else signIn) | signed-in(role=null → registration | role → customer | courier)`.
Today `routeGuards` opens `onboarding` and `signIn` together; the `onboarding` guard becomes `signedOut && !onboardingSeen` (read the AsyncStorage flag once at provider start, held in `AuthState`), so a completed or skipped carousel never reappears for a signed-out user.

**API surface** (client calls, no new HTTP endpoints):
| Call | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|
| `supabase.auth.signInWithOtp({ phone })` | phone: E.164 string (req) | session null until verified | anon | rate limit exceeded, SMS provider failure |
| `supabase.auth.verifyOtp({ phone, token, type: 'sms' })` | phone, 6-digit token (req) | session | anon | invalid code, expired code, rate limit |
| `supabase.auth.signInWithOtp({ email })` | email (req) | session null | anon | rate limit |
| `supabase.auth.verifyOtp({ email, token, type: 'email' })` | email, 6-digit token (req) | session | anon | invalid code, expired code |
| `supabase.auth.getOAuthSessionForUrl(url)` + `exchangeCodeForSession` | PKCE code verifier (held by the hook) + redirect URL (req) | session | anon | invalid verifier, provider denial |
| `supabase.auth.updateUser({ email })` | email (req) | updated user | authenticated | email taken by another account |
| `supabase.rpc('complete_registration')` | first_name, last_name, role (all req; the shipped 3-argument signature, spec 0002; phone and email are read from `auth.users` server-side) | profile row | authenticated | already registered, invalid role |
| `supabase.auth.getSession()` / `signOut()` | none | session / ok | any | (none) |

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| Send phone OTP | E.164 number to send to | PhoneInput value, normalized with `libphonenumber-js` default region `NG` (AGENTS.md convention) |
| Resend countdown | "Resend code in 0:45" | Client timer constant `45` set at send time; the designs fix the number, Supabase rate caps guard abuse |
| Verify header | "sent to +234 8xx…" / the email | The entered value, carried as a route param (AC-2, AC-11 switch updates it) |
| Registration prefill | First and last name, email | From the new session's user object (`user_metadata.full_name` / `email` for OAuth, empty for OTP paths); email handling per Client behavior rules |
| Route after registration | Customer or courier tabs | `profiles.role` read by `fetchRole` (spec 0002, written only by `complete_registration`) |
| Expired-session notice | "session expired" banner on welcome | Client flag: a stored session existed but `getSession()` returned null at launch |
| Offline state | "you are offline" on welcome buttons | `navigator.onLine` is unreliable in RN; use a failed send attempt plus a reachable probe on launch (Supabase `GET /auth/v1/health`) |
| Slide 3 copy | Headline and body | Defined in this spec (see AC-1): headline "Track Every Step", body "Watch your courier move in real time and know the exact moment it arrives."; mark for Figma sync |
| Terms and Privacy pages | Legal copy | Static placeholder routes with plain English stub text; real policy text is a Follow-up |

**Key invariants**:
- A profile row exists if and only if registration was completed; `role` is null (absent row) exactly while the user sits on registration.
- `complete_registration` is the only client-reachable path that writes a role or profile (spec 0002 enforces this in RLS).
- The carousel flag is write-once from the app's side; only reinstall or OS cache eviction clears it.
- OTP codes are never logged, cached in TanStack Query, or stored outside Supabase internals.
- The resend timer is one constant in `features/auth/`, never a per-screen literal.
- The dev stub only takes effect under `__DEV__`, enforced in code, not just env discipline (already true today).

**Security model**:
- All authorization is spec 0002's RLS plus definer functions; this feature adds no grants, no policies, no new writable columns.
- OAuth uses PKCE with the code verifier in encrypted storage; redirect URIs are the app scheme only (`swifttransit://auth/callback`), registered in the Supabase dashboard allowlist.
- Account auto-linking is allowed only on provider-confirmed emails (dashboard setting "one user per confirmed email"); unverified provider emails do not link.
- Email OTP requires "Confirm email" off in the dashboard, otherwise a new email address creates an unconfirmed account that can never sign in. This is a load-bearing setting, not a nicety.
- OTP rate limits stay tightened with CAPTCHA on OTP endpoints (spec 0001); demo-number skip lives in the Send SMS hook (spec 0001 §SMS), with Supabase test-phone OTP mappings configured for the demo numbers (feature 15 consumes them).
- NDPA 2023: consent links visible before any identity is submitted (AC-13); collection stays minimal (name, one contact, role); the auth event log is the acceptance record; deletion is feature 13.
- Run `secure-me` on the PR: this touches auth, and the scope marks the feature GA.

**Configuration required**:
- Supabase dashboard: Google provider (client ID + secret), Apple provider (service ID + key), Site URL and redirect allowlist including `swifttransit://auth/callback`; "one user per confirmed email" on; "Confirm email" off; OTP expiry 120 s; test OTP codes for demo phone numbers.
- Edge Function secrets (already listed in spec 0001, first real use here): `TERMII_API_KEY`, `TERMII_SENDER_ID`, `SEND_SMS_HOOK_SECRET`, `DEMO_PHONE_NUMBERS`; the Send SMS hook URL pointed at the `send-sms` function, with the hook configured to send `SEND_SMS_HOOK_SECRET` as the bearer header the function checks.
- `app.json` / `app.config.ts`: scheme `swifttransit` (exists), `expo-location` plugin with a Nigerian-English permission string, Google and Apple associated domains for universal links on iOS.
- No new `EXPO_PUBLIC_*` variables; `EXPO_PUBLIC_DEV_AUTH_STUB` stays as-is.

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):
- Happy path: fresh install, three slides, phone OTP to a test number, registration as customer, lands on customer tabs; restart opens straight to tabs, verifies **AC-1**, **AC-2**, **AC-6**, **AC-7**
- Happy path: Google sign-in through the web sheet lands on registration with the provider name prefilled, no OTP screen, verifies **AC-4**
- Failure case: wrong code shows the invalid state, resend unlocks at 0:45, six wrong attempts then rate limit shows "try again later", verifies **AC-5**
- Failure case: kill the network after the carousel, welcome shows the offline state; restore, sign-in proceeds, verifies **AC-10**
- Failure case: `profiles` read fails with the network down while a session exists, the retry state shows and registration is never offered, verifies **AC-9**
- Auth/permission: an expired session at launch lands on welcome with the notice, never on a tab or a blank screen, verifies **AC-8**
- Auth/permission: a signed-in user with a profile cannot re-enter `(auth)` or `(onboarding)` routes; the guards return them to their tabs, verifies **AC-7**, **AC-14**
- Edge: email validation error blocks send; the SMS escape link switches the verify header to the email channel, verifies **AC-3**, **AC-11**
- Edge: the location sheet renders allow, later, and denied-to-settings paths, verifies **AC-12**

## Build plan

Tracer Bullet: the thinnest real sign-in thread first (phone OTP end to end through every layer), then thicken with each method and each failure state.

1. Install `expo-auth-session`, `expo-web-browser`, `expo-location`, `@react-native-async-storage/async-storage`; rebuild the dev client; extend `.env.example` notes for the dashboard settings, satisfies **AC-4** (enables it)
2. Tracer thread, phone: build `phone.tsx` (PhoneInput + E.164) and `verify.tsx` (OtpInput, auto-submit, 45 s resend) against `signInWithOtp`/`verifyOtp`; build `register.tsx` (react-hook-form + zod, calls `complete_registration`); route by role into the existing tabs; restart persistence rides the existing provider and encrypted storage, verify it holds, satisfies **AC-2**, **AC-5** (timer), **AC-6**, **AC-7**
3. Dashboard configuration pass, recorded as a checklist in the PR: providers, email confirm off, one-user-per-confirmed-email, OTP expiry, redirect allowlist; deploy the `send-sms` Edge Function (signature check, demo skip, Termii call, per spec 0001 §SMS), satisfies **AC-2**, **AC-4** (enables both)
4. Carousel: three slides in a paging FlatList with dots, Next, "Jump to Sign in", slide 3 copy from this spec; the AsyncStorage flag plus the `onboarding` guard change in State transitions, so the gate returns `signedOut && !onboardingSeen`, satisfies **AC-1**, **AC-7**
5. Email path: `email.tsx` with the validation error state, one OTP path for new and existing addresses, the "use email instead" escape link on verify, satisfies **AC-3**, **AC-11**
6. OAuth: `expo-auth-session` PKCE against Supabase Google and Apple providers, browser launch and scheme callback handoff to `exchangeCodeForSession`, names prefilled into registration, satisfies **AC-4**
7. Location sheet: `permission/location` as a formSheet with the `expo-location` request hook, ask-later, and denied path to settings, satisfies **AC-12**
8. Failure states: fix `fetchRole` to distinguish network error from missing row (retry state, AC-9); expired-session notice on welcome (AC-8); offline probe and welcome state (AC-10); rate-limit copy (AC-5)
9. Polish and proof: i18n keys for every string, light/dark, Reduce Motion, accessibility labels, Terms and Privacy placeholder routes with links at welcome and registration, satisfies **AC-13**; jest coverage for guards, the OTP state machine, and route flows with `renderRouter`; dev stub untouched and still working (AC-14); then `/check verify`, `/test`, `/check review`, and a `secure-me` pass per the GA workflow

## Consequences

**Positive**:
- One auth code path family (Supabase methods) for all four methods; adding biometric or WhatsApp OTP later touches the same `features/auth/`.
- No schema change: spec 0002's tables, functions, and policies already cover everything here.
- Reviewers can sign in with email alone when SMS is unavailable, which matters for a portfolio app.

**Negative / tradeoffs**:
- Google's web sheet is a slightly worse UX than the native picker, and the OAuth flow needs a dev build to test (no Expo Go, already true for this project).
- Several behaviors live in the Supabase dashboard (email confirm off, linking, OTP expiry, providers), invisible to git and easy to break silently; the checklist in build task 3 is the mitigation.
- Termii costs money per SMS with no free credit; rate limits and CAPTCHA contain it but a malicious loop before CAPTCHA is on is a real (small) cost risk.
- With "Confirm email" off, anyone can create an account at any email address. The email OTP at each sign-in is the proof of control, and no email is trusted until verified; this is the accepted tradeoff for the one-path email flow.
- AsyncStorage for the carousel flag is unencrypted; acceptable because it stores one boolean and nothing about identity.

**Neutral**:
- Supersedes the native-SDK entry in spec 0001's Auth row for Google and Apple; spec 0001 gets a pointer note.
- `courier-apply.tsx` stays a placeholder (feature 8); a courier who registers goes to courier tabs with no application, and feature 8 owns that state.
- The demo-number OTP mappings configured here are consumed by feature 15.

## Follow-up

- [ ] Export the third onboarding slide from Figma and reconcile it with the copy defined in this spec (Value sourcing, AC-1).
- [ ] Register the real Terms of Service and Privacy Policy text; the routes ship with stubs.
- [ ] Fund a small Termii balance and register the sender ID (already a spec 0001 follow-up; this feature cannot ship phone OTP without it).
- [ ] Add an Apple Developer account ($99/yr) or accept simulator-only iOS review before relying on Apple sign-in externally.
- [ ] `features/auth/AGENTS.md` does not exist; area conventions (the OTP state machine, timer constant, guard extension points) belong there when `/sync` next runs.
- [ ] Decide logout placement in feature 13 (Profile & settings); `supabase.auth.signOut()` is the only piece this spec leaves unhosted.
