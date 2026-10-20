# 0006. Orders list and order detail for customers

**Date**: 2026-10-20
**Status**: In Progress

## Summary

This builds the customer's order history: the Orders tab with All, Active and Past filters, search by tracking number, the home "Active deliveries" section, and an order detail screen with a status timeline, a route map, courier contact and a cancel button. The app already writes orders to the database when a booking completes. Until now it had no way to read them back. The decision underneath is how the app reads orders: direct database selects under the existing row level security, kept fresh by Supabase Realtime. The schema needs one small addition: today only a courier can read their own vehicle details, so the order detail could not show the courier's card. A new database function returns just the vehicle type and number to the two people on that order, and nothing else from the courier's application.

## Context

Spec 0002 built the tables, the status machine and the security policies. Spec 0005 built the booking wizard that creates an order. The Orders tab and the order detail route are placeholder screens. A customer who has booked a delivery cannot find it again, and the tracking number on the confirmation screen leads nowhere.

The forces that shape the choice: spec 0002 granted `authenticated` select on `orders` (own rows) and `order_events` (participants) precisely so read features need no server code; the orders table is already published to Realtime with per-subscriber authorization (spec 0002); the app reads through TanStack Query with a 30 second stale time and retries off for mutations; the design (design/main/Orders.jpg) shows search, three filters and order cards, and the OrderCard primitive already exists; the order detail screen was never drawn and its content is decided here. One read is not covered: `courier_applications` (the vehicle type and number) is selectable only by its owner, so the courier card needs one small server addition. Money and status changes stay server-side only, per the project invariants.

## Requirements

**User stories**:
- As a customer, I want my past and current orders in one place so that I can find any delivery I booked.
- As a customer, I want to search by tracking number so that I can open an order without scrolling.
- As a customer, I want to see where my order stands, step by step, so that I know whether to wait, call the courier, or cancel.
- As a customer, I want to cancel an order before a courier picks up so that I can stop a delivery I no longer need and get my wallet money back when the server's refund rule says so.

**Acceptance criteria**:
- **AC-1**: The Orders tab lists the signed-in customer's own orders, newest first, 20 per page with a load-more trigger and pull-to-refresh. No other customer's order can appear (row level security enforces this, not the query).
- **AC-2**: A segmented control filters the list: All Orders; Active Orders (status pending_payment, searching, assigned, at_pickup, picked_up, at_dropoff); Past Orders (delivered, cancelled, failed). The filter is the single source of truth for what the list shows.
- **AC-3**: The search field filters the list client-side on the tracking code, case-insensitive, with or without the `TN-` prefix, and applies under the current filter. The QR scan icon is present, disabled, and labeled as coming later.
- **AC-4**: Tapping a card opens `/orders/[id]`. The screen renders from a fresh select by id, not from data passed through navigation.
- **AC-5**: The detail shows a status timeline. The nine database statuses collapse into five customer steps by a fixed map: Booked (pending_payment, searching), Courier found (assigned, at_pickup), On the way (picked_up, at_dropoff), Delivered, plus a terminal Cancelled or Failed state. Each reached step carries its event timestamp from `order_events`. A cancel whose event row has a null `actor_id` is the 15 minute payment expiry, not a user cancel, and renders as "Payment window expired" with distinct copy.
- **AC-6**: The detail shows a static MapLibre map with pickup and dropoff pins and a line between them. No live courier position in this slice.
- **AC-7**: Once `courier_id` is set, the detail shows a courier card with the courier's display name (`profiles.first_name` plus `last_name`), the approved vehicle type and number (through the `courier_vehicle(order_id)` function added in this spec), and two actions: Call (device dialer through `Linking`, shown only when `profiles.phone` is set, since it is nullable) and Chat (routes to the existing chat placeholder).
- **AC-8**: The detail shows the full receipt: type, package size, weight, handling flags, receiver name and phone, instructions, schedule (the text "ASAP" when `scheduled_at` is null), the pickup and dropoff lines, and the price breakdown, formatted as naira (`en-NG`, `NGN`, integer kobo) through `lib/money`.
- **AC-9**: Cancel appears only while the status is pending_payment, searching or assigned. It asks for confirmation, then calls `change_order_status(order_id, 'cancelled')`. The client never writes status or money. The server's refund rule is exact, and the confirmation copy must match it: a wallet order cancelled from `assigned` is refunded by the server; a cancel from `pending_payment` or `searching` returns no money in this build (the mock provider has no card refund, and an unpaid order was never charged). A refusal shows copy through `errorLabel`.
- **AC-10**: The card overflow menu offers Cancel (when AC-9 allows) and Copy tracking code.
- **AC-11**: A realtime subscription on the customer's `orders` rows invalidates the list query, the detail query and the matching `['order-events', id]` query for the changed order (the events table is not in the publication; an order row change always accompanies an event insert), so a status change, including a timeline step, appears without a manual refresh.
- **AC-12**: Home's "Active deliveries" shows up to 3 most recent active orders using the same list hook, with a "View all" link to the Orders tab. The section hides when there are no active orders.
- **AC-13**: The booking confirmation's "View order" button navigates to that order's detail.
- **AC-14**: The tab distinguishes: no orders at all (empty state with a book-a-delivery call to action); a filter or search with no matches (different copy plus a clear action); a failed load (error state with retry); an id the customer cannot see (not-found state with a back action, existence never revealed). A `pending_payment` order that the expiry job cancelled appears in Past as expired rather than cancelled (AC-5's actor rule).
- **AC-15**: All copy goes through `locales/en.json`; all styling uses semantic tokens from DESIGN.md; every icon-only control has an accessibility label; Reduce Motion and font scaling are respected.

## Options considered

### Option 1: Direct selects under RLS, plus a small Realtime helper

The client selects from `orders` and `order_events` with TanStack Query, exactly as spec 0002 designed it to. A tiny shared helper subscribes to postgres changes on the customer's rows and invalidates the matching queries.

**Pros**:
- Almost no new server code: tables, indexes, policies and the realtime publication already exist; only one narrow read (the courier's vehicle) needs a new function.
- Queries stay composable (filters and paging are plain `where` and `range` clauses) and typecheck against the generated types.
- Instant freshness without polling.

**Cons**:
- Search only reaches loaded pages, not the whole history.
- The app now depends on a realtime subscription path that did not exist before and needs its own tests.

### Option 2: Definer RPCs per screen

Add `list_orders` and `get_order` SQL functions that shape each screen's payload, as the booking flow does for `create_order`.

**Pros**:
- One call per screen, server-shaped payloads, search could reach the whole history.

**Cons**:
- Duplicates what RLS selects already do; two more functions to migrate, test and secure-review for no new guarantee.
- Paging and filters become function arguments, which is worse than the query builder.

### Option 3: Polling or refetch-on-focus only

Skip realtime; refetch the list every 10 to 30 seconds while mounted.

**Pros**:
- Simplest possible; no new infrastructure.

**Cons**:
- Status can be minutes stale on the one screen whose job is status.
- Steady request load against a free-tier project, worse than an event-driven subscription.

## Decision

**Chosen option**: Option 1: Direct selects under RLS, plus a small Realtime helper.

A pure read feature on a schema designed for it. The only genuinely new machinery is `lib/supabase/realtime.ts`, a subscribe-and-invalidate helper of a few dozen lines.

**Implementation skills**: `mobile-native` (`emilkowalski/skills`, `.claude/skills/mobile-native/`) · `emil-design-eng` (`emilkowalski/skills`, `.claude/skills/emil-design-eng/`) · `ponytail` (`DietrichGebert/ponytail`, `.claude/skills/ponytail/`) · `secure-me` (`ajibolagenius/vibe-secure-me`, `.claude/skills/secure-me/`) · `impeccable` (`pbakaus/impeccable`, `.claude/skills/impeccable/`)

## Rationale

Spec 0002 granted `authenticated` select on `orders` (own rows) and `order_events` (participants) precisely so read features need no server code, and its invariants forbid client writes of status or money regardless. Option 2 would re-implement the authorization RLS already provides for the two big tables; the one function this spec does add, `courier_vehicle`, is the narrow exception the rule warns about in reverse: widening the `courier_applications` policy instead would hand customers licence numbers and licence photos, so a function that returns two columns to proven participants is the smaller exposure. Option 3 fails the feature's core promise: the detail screen exists to show fresh status, and the orders table is already in the realtime publication with per-subscriber policy checks, so the event-driven path costs less load than polling. The paging search gap is accepted deliberately: a portfolio-scale history fits in a few pages, and the server-side search route is recorded in Follow-up for when it does not.

## Feature design

**Data model sketch** (one policy change, no new tables or columns):
- `orders`: one row per delivery. Read here: `id`, `tracking_code`, `type`, `status`, `scheduled_at`, pickup and dropoff lines and coordinates, receiver fields, package fields, the four `*_kobo` price columns, `courier_id`, `created_at`. Index `orders_customer_created (customer_id, created_at desc)` serves the list query.
- `order_events`: append-only status history, one row per transition, read by participants. Timeline source. A null `actor_id` marks a system event (the payment expiry job).
- `profiles`: courier display name (`first_name`, `last_name`) and `phone` (nullable) for the courier card; the existing policy lets order participants read both sides' profiles.
- `courier_applications`: `vehicle_type` and `vehicle_number` for the courier card. Its SELECT policy is owner-only today, and widening it would also expose the licence number and licence photo path to customers, which is more personal data than the card needs. Instead this spec adds one small definer function, `courier_vehicle(order_id)`, `security definer` with a locked `search_path`, that checks the caller is a participant of that order (the existing `is_order_participant` helper) and returns only the vehicle type and number. The owner-only table policy stays as it is.

**State transitions** (server-owned, unchanged; the client only reads and may request `cancelled`):
`pending_payment → searching → assigned → at_pickup → picked_up → at_dropoff → delivered`; `cancelled` legal from `pending_payment`, `searching`, `assigned` (customer only); `failed` from any non-terminal state.

**API surface** (all through the existing Supabase client; one new definer function):
| Surface | Kind | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `orders` select (list) | query | `customer_id = auth.uid()`, `created_at desc`, `range` pages of 20, optional `status in (...)` | order rows | authenticated + RLS | transport failure → offline copy |
| `orders` select (detail) | query | `id` eq, single | one order row or empty | authenticated + RLS | empty → not-found state |
| `order_events` select | query | `order_id` eq, `created_at asc` | event rows | authenticated + RLS (participant) | empty → timeline shows current status only |
| `change_order_status` | rpc | `order_id`, `'cancelled'` | updated order | authenticated; server checks customer ownership and legal source state | `order.invalid_transition`, `order.forbidden`, `order.not_found` |
| `courier_vehicle` | rpc (new, this spec) | `order_id` | `vehicle_type`, `vehicle_number` or no row | authenticated; `security definer`, returns a row only when the caller passes `is_order_participant(order_id)` | non-participant → no row |
| `orders` realtime | subscription | postgres changes, filtered to the customer | invalidate list and detail queries | per-subscriber RLS (spec 0002) | subscription loss → refetch on focus covers |

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| Render card title | `Document delivery` etc. | derived: `orders.type` through an i18n map (decided in this spec) |
| Render card ETA | `Today, 15:30` | derived: `orders.scheduled_at` formatted `en-NG`; device-local day decides the Today and Tomorrow word; when null, show the status label instead |
| Render tracking id | `TN-5483921` | `orders.tracking_code` with the `TN-` display prefix |
| Render status chip | status word | `orders.status` through an i18n map |
| Build timeline | steps and timestamps | `order_events.status` + `created_at`, collapsed by the fixed map in AC-5; null `actor_id` on a cancelled event = the expiry job |
| Courier card | display name, phone | `profiles.first_name` + `last_name` (space joined), `profiles.phone` (nullable; Call hides when null) |
| Courier card | vehicle type and number | `courier_vehicle(order_id)` rpc (new in this spec) |
| Receipt total | naira amounts | `orders.*_kobo` through `lib/money` |
| Receipt schedule line | the time, or "ASAP" | `orders.scheduled_at`; null renders the ASAP label |
| Cancel decision | whether the button shows | `orders.status` against the server's legal set, mirrored client-side; server remains the authority |
| Cancel dialog | the money sentence | derived: `orders.status` and `orders.payment_method` against the server's refund rule (a wallet order cancelled from `assigned` refunds; other cancels return nothing in this build) |
| Copy / dial | tracking code, `tel:` link | `orders.tracking_code`; courier or receiver phone through `Linking` |

**Key invariants**:
- Status and money change only through the definer function; this feature adds no writes beyond the cancel call.
- The collapse map from 9 statuses to 5 timeline steps is a pure function in `features/orders/`, unit tested against every status, and it matches AC-5's map exactly.
- Query keys are stable (`['orders', filter]`, `['order', id]`, `['order-events', id]`) so the realtime helper can invalidate precisely: an orders row change invalidates the list, that order's detail, and that order's events.
- Search, filters and the home section all derive from the same loaded rows; no second copy of order data in state.

**Security model**: existing policies plus one narrow function. A customer reads own orders; a participant reads order and events; only the customer may request cancel and only from the three legal states. The realtime channel authorization is per-subscriber under the same policies. An id that is someone else's renders the same not-found state as a missing one. `courier_vehicle` is `security definer` with a locked `search_path`, granted to `authenticated`, and returns at most the vehicle type and number of the courier assigned to an order the caller participates in; the licence number and licence photo never leave the owner-only policy. NDPA 2023 data deletion remains with feature 13; this feature adds no new stored data.

**Configuration required**: none. No new environment variables, no new keys. The one migration runs through the existing Supabase pipeline.

**Critical test scenarios** (each maps to an acceptance criterion):
- Happy path: book an order, see it in All and Active, open detail, the timeline shows the single "Booked" step with its timestamp (a paid searching order has reached only step one), verifies **AC-1**, **AC-2**, **AC-4**, **AC-5**.
- Search: typing `5483` and `TN-5483` both narrow the list to the matching order; a no-match query shows the distinct empty state, verifies **AC-3**, **AC-14**.
- Failure case: a load while offline shows the error state with a working retry; a realtime status change invalidates the list, the detail and the events query, and the new timeline step appears without a manual refresh, verifies **AC-11**, **AC-14**.
- State: cancel on a `searching` order moves it to `cancelled`, the dialog stated that no money returns in this build, and the timeline and filter placement update without a manual refresh; cancel on a `picked_up` order is refused by the server and shows mapped copy; a wallet order cancelled from `assigned` shows the refund through the wallet balance, verifies **AC-9**, **AC-2**.
- State: an order the expiry job cancelled (null actor event) renders "Payment window expired" in Past, not the user-cancel copy, verifies **AC-5**, **AC-14**.
- Auth/permission: opening someone else's order id shows not-found, never data; calling `courier_vehicle` for an order the caller is not a participant of returns no row; the home section hides when no active orders exist, verifies **AC-14**, **AC-12**.
- Receipt: an assigned order shows courier display name, vehicle from `courier_vehicle`, Call (only when the profile has a phone) and Chat; the breakdown matches the stored kobo columns formatted as naira; a null `scheduled_at` renders ASAP, verifies **AC-7**, **AC-8**.

## Build plan

Ordered as a tracer bullet: one thin end to end thread first (hook to rendered list), then thicken. The single migration is small and sits just before the task that reads through it.

1. `features/orders/`: orders query hook with paging (20 per page, `created_at desc`), query keys, and the card title, ETA and status label maps. Wire the Orders tab route with a FlatList, RefreshControl and load-more, replacing the placeholder. No migration. Satisfies **AC-1**, **AC-15**
2. Segmented filter (All, Active, Past) driving the query, and client-side tracking search over loaded rows with the disabled QR icon. Satisfies **AC-2**, **AC-3**
3. The `courier_vehicle(order_id)` definer function: one migration, participant check via `is_order_participant`, grants to `authenticated` only, plus a SQL test in `supabase/.test/` proving a non-participant gets no row and the licence fields are unreachable. Satisfies **AC-7**
4. Order detail: select by id, the collapse map plus a new status-timeline component (built from DESIGN.md tokens and existing primitives), the static two-pin map, the courier card with Call and Chat, and the full receipt. Satisfies **AC-4**, **AC-5**, **AC-6**, **AC-7**, **AC-8**
5. Actions: cancel through `change_order_status` with a confirmation dialog carrying the exact refund copy (AC-9) and `errorLabel` copy for refusals; the card overflow menu (Cancel, Copy tracking code). Satisfies **AC-9**, **AC-10**
6. `lib/supabase/realtime.ts`: a subscribe-and-invalidate helper for `orders` postgres changes (invalidates list, detail and that order's events), hooked into the list, detail and home queries. Satisfies **AC-11**
7. Home "Active deliveries" (3 most recent active, View all link, hidden when empty) and the booking confirmation "View order" jump, replacing both stubs. Satisfies **AC-12**, **AC-13**
8. Empty, error, expired and not-found states across the three surfaces; i18n pass; accessibility labels, Reduce Motion, font scaling; jest tests for the hooks (mocked Supabase), the collapse map, and routes via `renderRouter`. Satisfies **AC-14**, **AC-15**

## Consequences

**Positive**:
- The tracking number from the confirmation screen now leads somewhere, and the booking loop closes end to end.
- No migration, no new server functions, no new dependencies.
- The realtime helper becomes the pattern every later status-driven screen (features 9, 10, 11, 14) reuses.

**Negative / tradeoffs**:
- Search covers loaded pages only; a customer with hundreds of orders can miss an old one until they page further.
- Cancelling a paid order before a courier is found returns no money in this build (the server refunds only a wallet order cancelled from `assigned`, and the mock provider has no card refund). The confirmation dialog must say so plainly, which is honest but uncomfortable.
- The client mirrors the server's cancel-eligibility rule; if the state machine changes, the mirror must change too (the server still refuses, so this can only hide a button, never allow an illegal write). The mirror also has to live with the 15 minute expiry job racing the cancel button.
- The timeline collapse map duplicates knowledge of the status machine in the client.
- "Estimated Delivery" shows the scheduled pickup time, not a delivery prediction; honest labeling matters here.
- The realtime helper is new infrastructure: subscription lifecycle, cleanup on unmount, and a mock for tests.

**Neutral**:
- The order detail screen is newly designed (it was never drawn in Figma); DESIGN.md rules and the existing primitives govern it, and its layout is `/develop`'s to compose.

## Follow-up

- [ ] When order histories outgrow a few pages, move tracking search server-side (a debounced `ilike` query) in a small spec update.
- [ ] The QR scan icon in the search field stays disabled until the deferred "QR scan for tracking numbers" item is designed.
- [ ] Live courier marker and ETA on the detail map arrive with feature 10 (live tracking); leave the map component a clear extension point.
- [ ] Chat content is feature 11; the detail's Chat button routes to the existing placeholder.
- [ ] Add `app/(customer)/orders/[id]` (order detail) to the screen to route map in `design/README.md`, since the detail was designed in this spec rather than in Figma.
- [ ] Card refunds do not exist in the mock provider, so a paid card order cancelled before assignment keeps its charge. The deferred "real payment provider" feature must close this gap and revisit the cancel copy.
- [ ] This feature touches money paths (the cancel refund rule), a new definer function (`courier_vehicle`) and realtime channels: run the `secure-me` pass and `/check review` before merge, per the project workflow.
