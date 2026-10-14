# 0002 rationale: data model and security

## Context

SwiftTransit runs on Supabase (decided in spec 0001): one Expo app, two roles, orders with money and live status, chat, courier vetting with licence photos, GPS tracking. The scaffold boots with an auth stub and no backend. Every upcoming feature (5 through 14) reads and writes the same rows, and the app ships the publishable key to anyone who installs it, so the client must be treated as untrusted.

Forces at play:

- Portfolio project on free tiers: one Postgres, 200 concurrent realtime connections, 1 GB storage, no budget for a separate API layer or managed auth service.
- NDPA 2023 covers phone numbers, location history and identity documents; app stores require in-app account deletion.
- Money correctness: prices, wallet balances and payouts must survive retries, double taps and concurrent couriers.
- One developer (with agents): whatever is designed must be operable without a platform team, and provable in CI rather than by spot checks.
- Not deciding means each feature invents its own schema and guards; four later specs would each re-open the same questions and the audit trail story collapses.

## Options considered

### Option 1: Backend for frontend (an API layer holds the rules)

Every client call goes through Edge Functions or a small hosted API; the database trusts its server, policies stay trivial.

**Pros**:
- Familiar layering; authorization logic in TypeScript, easy to unit test.
- One choke point for logging, rate limiting and future provider swaps.

**Cons**:
- Duplicates work Supabase already does (REST, realtime, storage all need hand-written wrappers).
- More cold starts, more code to operate on a free tier, slower iteration for one developer.
- Realtime row delivery would have to be rebuilt on top of an API, losing Supabase's strongest fit.

### Option 2: Postgres as the single enforcement point (RLS plus definer functions)

Row level security decides row visibility; security-definer functions are the only write paths for money, status and assignment; the client queries Supabase directly.

**Pros**:
- Rules live where the data lives; a compromised app token still cannot read another user's rows.
- TanStack Query, realtime changes and storage policies all work straight against the client SDK.
- The policy set is testable in one place (SQL harness in CI).

**Cons**:
- RLS debugging is unfamiliar; policies are easy to write wrong without tests.
- Schema and policy changes are migrations, not code review of a normal pull request.
- Column level denies need care (grants plus policies, both).

### Option 3: Application-level checks only (RLS off or token deep)

Trust the app, check ownership in queries and hooks.

**Pros**:
- Fastest first build, no policy learning curve.

**Cons**:
- Any leak of the publishable flow, or one forgotten WHERE, exposes everyone's parcels and phone numbers. Not defensible for a GA-marked feature or NDPA data.

## Rationale

Option 2 wins because the product's riskiest invariants (privacy across users, money, status integrity) are exactly the ones Postgres can enforce unconditionally, and because spec 0001 already bought Supabase for its realtime and storage; Option 1 would pay for a second enforcement layer that adds latency and maintenance without adding safety beyond Option 2. The known failure mode of Option 2 (policies written wrong) is answered by AC-3 and the CI harness, which is why the test suite is part of this feature, not a follow-up. Option 3 was rejected outright for regulated PII.

Within Option 2, the engineer chose: full schema in one pass (later features write no migrations), one SQL function for the status machine, ledger-only balances with idempotency keys, Broadcast for GPS ticks and Postgres changes for chat and status, seeded `pricing_rules`, dashboard service-role approvals, direct storage uploads with signed reads. Each is recorded in the build spec with its enforcement point.

## References

**Project sources**:
- `AGENTS.md`: stack, kobo money rule, RLS convention ("status and money change only server-side"), secure-me requirement
- spec 0001 (`docs/specs/0001-architecture/index.md`): the data model sketch, security model, PaymentProvider mock, `geo` Edge Function, Send SMS hook, free-tier ceilings
- `PRODUCT.md`: NDPA 2023 constraint, demo showcase requirement, Nigerian locale rules
- `docs/scope/scope.md` feature 3: done-when criteria and the GA marking that raised the testing bar
- installed `supabase` skill: current RLS guidance (TO clauses over deprecated `auth.role()`, UPDATE needs USING plus WITH CHECK, views need `security_invoker`, never authorize from `user_metadata`)

**Practices & standards**:
- deny by default row level security; least privilege column grants
- idempotency keys for money operations
- append-only audit trail (event rows written in the same transaction as the state change)
- derived balance from an immutable ledger (double entry thinking, single entry ledger)
- reduced projection reads for states before assignment
- defence in depth (grants and policies both refusing client writes)
- OWASP ASVS style access control verification through automated policy tests
