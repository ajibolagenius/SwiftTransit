# Review, feat/onboarding-authentication, 2026-10-17

**Reviewed by**: reviewer model (fresh eyes; author model unknown)
**Scope**: 44 files, branch vs main (merge base 44d5447)
**Verdict**: Changes requested

## Summary

This lands the full onboarding/authentication feature: carousel, welcome with four sign-in methods, phone/email OTP + verify with a resend timer, OAuth (expo-auth-session PKCE → Supabase), registration writing through `complete_registration`, an offline reachability probe, expired-session and failed-profile-read states, a location sheet, legal stubs, and a `send-sms` Edge Function. The architecture is clean (thin routes, logic in `features/auth/`), the dev stub is gated to `__DEV__` in code, PKCE stores its verifier in the encrypted session store, no secret reaches `EXPO_PUBLIC_*`, and OTP is never logged or persisted client-side. Two things bite before merge: the expired-session detection reads the wrong storage key so AC-8 silently never fires in production, and the security/correctness-relevant units (error mapping, E.164, registration `email_taken`, OAuth exchange, stored-session) have no tests despite `TESTS = configured`.

## Major

### 🟠 Expired-session detection reads the wrong key, AC-8 never fires, `features/auth/stored-session.ts:8`
**Problem**: `hasStoredSession()` builds `sb-${EXPO_PUBLIC_SUPABASE_URL.replace(/^https?:\/\//,'')}-auth-token`, i.e. for `https://abc.supabase.co` it looks up `sb-abc.supabase.co-auth-token`. Supabase derives its storage key as `sb-${hostname.split('.')[0]}-auth-token` (`node_modules/@supabase/supabase-js/dist/index.cjs:647`) = `sb-abc-auth-token`, and persists the session under exactly that key (read back at `GoTrueClient` `getItemAsync(this.storage, this.storageKey)`). The two never match, so `getItem` always returns `null`, `hasStoredSession()` always resolves `false`, and `hadStoredSession.current` in `auth-provider.tsx:85` is never set.
**Why it matters**: The `expired` flag (`auth-provider.tsx:64-66`) is what drives the "Your session expired. Please sign in again." banner required by AC-8. With the key wrong, an expired launch is indistinguishable from a plain first launch and the notice is never shown. The test suite cannot catch this because `auth-provider.test.tsx:41` mocks `hasStoredSession` outright and no test asserts the real key format. It degrades gracefully (still lands on welcome, not a dead screen), so not a blocker, but a specced acceptance criterion is effectively not built.
**Suggested fix**: Derive the first hostname label the way Supabase does, e.g. `new URL(env.EXPO_PUBLIC_SUPABASE_URL).hostname.split('.')[0]` → `sb-${ref}-auth-token`, and add a small unit test for `hasStoredSession` that stubs the storage and asserts it is called with that exact key.

### 🟠 Security/correctness-relevant auth units are untested, `features/auth/errors.ts:4`, `features/auth/register.ts:14`, `features/auth/oauth.ts:22`, `features/auth/phone.ts:4`
**Problem**: The branching that decides user-visible auth outcomes has no test coverage: `describeAuthError` (the entire error-state machine for AC-5 — offline via `TypeError`, `rate limit`/`too many requests`, `expired`, `invalid`, fallback), `completeRegistration` (the `email_taken` vs `failed` mapping and the "don't write email when the account already has one" branch, AC-6), `toE164`/`displayNumber` (AC-2 phone normalization), and the OAuth `buildAuthorizeUrl`/`exchangeCallbackUrl` (AC-4, incl. the missing-code throw). Guards, provider, offline probe, onboarding and routing are tested; these are not.
**Why it matters**: Per the review guide, new branching/security-relevant logic that isn't covered is at least Minor and Major here because these paths are exactly where auth bugs hide — a message-match change ("too many requests" added, "invalid" reworded) silently reclassifies a state, and the E.164 and email-taken branches are the ones that route a real user to the wrong screen. None of it is protected by a regression test.
**Suggested fix**: Add focused unit tests: a table for `describeAuthError` (each substring + `TypeError`), a `completeRegistration` test with a mocked `supabase` (already has email → skip updateUser; taken error → `email_taken`; rpc error → `failed`), a couple of `toE164` valid/invalid Nigerian numbers, and an `exchangeCallbackUrl` no-code rejection.

## Minor

### 🟡 Resend countdown ignores app foreground, `features/auth/use-resend-timer.ts:11`
Spec 0003 says to "derive remaining time on each tick and on app foreground; if 45 s already elapsed, unlock immediately." This is interval-only; RN throttles timers while backgrounded, so a code sent just before backgrounding shows a stale "Resend in 0:30" for a beat after returning until the next tick. Consider an `AppState` 'active' listener that calls `setNow(Date.now())` (the derivation itself already unlocks correctly once `now` updates, so impact is small).

### 🟡 OAuth `redirectTo` appends an unused, un-allowlisted `provider` param, `features/auth/oauth.ts:15`
`makeRedirectUri({ path: 'auth/callback', queryParams: { provider } })` sends a `redirect_to` of `swifttransit://auth/callback?provider=google`, but the dashboard allowlist entry and the cold-start handler (`app/auth/callback.tsx`) both key on `swifttransit://auth/callback` and never read `provider`. Supabase falls back to Site URL when `redirect_to` doesn't match the allowlist, which is harmless here but makes the redirect behavior dependent on the dashboard config. Drop the `queryParams` (nothing consumes it) so the redirect matches the registered URI exactly.

### 🟡 Inline pixel sizes bypass the token scale, `app/(auth)/welcome.tsx:52`, `app/(onboarding)/index.tsx:51`, `app/(onboarding)/index.tsx:68`, `app/dev/gallery.tsx:75`
`style={{ width: 64, height: 64 }}`, `{ height: 176 }`, `paddingBottom: 160` are raw sizes in components, which DESIGN.md/AGENTS.md forbid ("no raw hex, sizes or radii"). These are the deliberate workaround for the >12 spacing scale compiling to nothing (correct call), but worth recording: the values are un-themeable and drift from the design tokens. Prefer a small `SIZES`/`spacing` constant or an added token scale entry over magic numbers at call sites.

### 🟡 Dead-spacing guard can't see dynamically-built className strings, `__tests__/dead-spacing-classes.test.ts:30`
The regex only scans `className="..."` literals. Screens that build classes by concatenation/ternary inside `className={...}` — `components/auth-scaffold.tsx:42` and `components/ui/phone-input.tsx:52` — are invisible to it, which is precisely where a `pb-40` regression would hide next to the valid `mt-7`/`p-6`. No offender today (I grepped `app/` and `components/`, everything above 12 is gone), but the guard's coverage is narrower than its comment implies. Consider also matching `className={...}` string contents.

### 🟡 Send SMS failure body returns upstream provider detail, `supabase/functions/send-sms/index.ts:81`
The 502 body interpolates Termii's raw response text (`termii send failed: ${status} ${detail}`). It is a hook-to-Supabase response, not surfaced to the end user, but it writes provider internals (and possibly account/balance messages) into the function logs. Return a fixed reason and log the detail yourself, or omit `detail`.

## Nits
- ⚪ `app.config.ts:20` / `lib/env.ts:9`, the `EXPO_PUBLIC_GOOGLE_CLIENT_ID`/`EXPO_PUBLIC_APPLE_CLIENT_ID` values and the `extra` block are read nowhere; the OAuth path builds its URL server-side. Dead config until a native-client-id flow needs them — add a comment or drop.
- ⚪ `app/(auth)/welcome.tsx:50` and `app/(onboarding)/index.tsx:48`, the brand logo `Image`s have no accessibility label. They're decorative next to a heading, so acceptable, but `accessible={false}`/`importantForAccessibility="no"` would make the intent explicit.
- ⚪ `features/auth/register.ts:21`, the `email_taken` check matches `already`/`taken` on the raw Supabase message; a Supabase wording change would silently fall through to the generic `failed`. A single test (see Major) locks this in.

## Strengths
- Dev auth stub is gated to `__DEV__` in code (`auth-provider.tsx:34`) and both the "stub works in dev" and "stub ignored in release" paths are tested (`auth-provider.test.tsx:177,184`) — exactly the invariant AC-14 needed.
- The offline probe regression is caught by a real test: `offline.test.ts:45` asserts the `apikey` header is sent, which is the subtle requirement that would otherwise make every sign-in button permanently disabled.
- Guard design is correct and well-tested: a signed-in user with a profile cannot re-enter `(auth)` or `(onboarding)` (`guards.ts` + `guards.test.ts`/`routing.test.tsx`), and AC-9 cleanly separates a failed profile read (`profileError`) from a missing row so it never routes to registration.
- Resend timer is a single `RESEND_SECONDS` constant imported everywhere (no stray `45` literals), and secrets stay out of `EXPO_PUBLIC_*` — the publishable key is the only Supabase credential in the bundle, Termii/hook secrets live in Edge Function env.

## Test coverage
Guards, AuthProvider state machine, offline probe, onboarding carousel, and route gating are covered and assert real behavior (not just mocks). The gaps map onto the two Majors: `stored-session.ts` (buggy, fully mocked out), and the auth units `errors.ts`, `register.ts`, `phone.ts`, `oauth.ts` plus `use-resend-timer.ts` have no direct tests. Dashboard-dependent flows (OAuth, real SMS) can't be integration-tested here, so the static units that decide their error/redirect outcomes are the ones that most need coverage.
