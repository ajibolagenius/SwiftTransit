# Verify: orders list and order detail (feature 7)

Run on a dev build (`npm run ios` / `npm run android`) with a real sign in, not
`EXPO_PUBLIC_DEV_AUTH_STUB`. The stub leaves `session` null, so the row level
policies have no `auth.uid()` to work with, the list comes back empty for the
wrong reason, and the realtime channel refuses the subscription.

Deploy first: `supabase db push` to apply `20261020090000_courier_vehicle.sql`.
The `orders` table is already in the realtime publication from spec 0002, so
nothing else to publish. Have three accounts ready: customer A with a few orders,
customer B with none, and one courier account that can accept a job. Keep the
dashboard SQL editor open on the side; half of these steps are proven by reading
one row.

Jest already pins most of the shape (24 tests across `__tests__/orders-list.test.tsx`
and `__tests__/orders-detail.test.tsx`, 329 tests green in the whole suite), and the
definer function is proven in the SQL harness (`supabase/.test/95_courier_vehicle.sql`:
customer and courier each read the two columns, a stranger and an unapproved courier
read nothing, the licence stays unreachable). Re ran that script on the local stack on
2026-10-20, all seven assertions green. What is left here is what only a running app
can show: the device dialer, the map, the clipboard, realtime freshness, and voice
over.

## AC-1: the tab lists the customer's own orders, newest first

- [ ] Sign in as customer A, open the Orders tab. Every card is an order A booked, sorted by `created_at` descending. Cross check against `select tracking_code, created_at from public.orders where customer_id = '<A>' order by created_at desc;`.
- [ ] Newest first holds across the boundary between pages, not only inside one page.
- [ ] Pull to refresh on the list. The spinner shows and the rows reload in place.
- [ ] Sign in as customer B. None of A's tracking codes appear. This is the policy doing the work, so confirm the query itself never names another customer: the list filters on `customer_id = auth.uid()` server side.
- [ ] With more than 20 orders on A, scroll to the bottom and trigger Load more. Page two appends the next 20 with no duplicate card, and the first page window asked for rows 0 to 19.

## AC-2: the filter drives the query

- [ ] All Orders shows every status. Active Orders shows only `pending_payment`, `searching`, `assigned`, `at_pickup`, `picked_up`, `at_dropoff`. Past Orders shows only `delivered`, `cancelled`, `failed`.
- [ ] The filter is what selects the rows, not the rows already on screen. Proof: book an order, leave the tab, come back on Past, and the fresh order is absent. Move to Active and it appears without any new booking.
- [ ] Switching filters keeps the paging honest: page two under Active must not leak a `delivered` order.

## AC-3: search on the tracking code

- [ ] Type the digits of a code without the prefix (`5483`), then with it (`TN-5483`), then in mixed case. All three narrow the list to that order.
- [ ] Search while on Active Orders, then on Past. The filter still applies; a matching order from the other bucket does not jump in.
- [ ] Type a code that matches nothing. The no match empty state appears with a clear action, not the "you have no orders" state.
- [ ] The scan icon is on screen, disabled, and announces that QR scan arrives later. Tapping it does nothing.
- [ ] Known gap, accept it deliberately: search walks the pages already loaded. With 25 orders, search a code that lives on page two, before Load more has pulled it. It reports no match. Spec 0006 records this as the cost of option 1 and as follow up work if the history grows.

## AC-4: a card opens the detail from a fresh read

- [ ] Cold start the app (kill it, relaunch), go to the Orders tab, tap a card. The detail renders the tracking code, status, receipt, everything, with nothing carried through navigation params.
- [ ] Push the detail route directly with a bare id while the app has no list cache for it. It still renders, which proves the read by id.

## AC-5: the timeline collapses the database statuses into customer steps

- [ ] Order in `searching`: one reached step, Booked, with the timestamp of its `order_events` row. The other steps render as not reached.
- [ ] Move the same order to `assigned`, then `at_pickup`. Courier found appears once, and its time is the `assigned` event, the earlier of the two statuses that collapse into it. It does not become two steps.
- [ ] Then `picked_up`, then `at_dropoff`: On the way appears once. Then `delivered`: Delivered.
- [ ] Cancel an order yourself from `searching`. The terminal step reads as your cancel.
- [ ] The expiry case, which is the one easy to get wrong: book, reach the card sheet, leave it unpaid past 15 minutes plus one cron tick (the recipe in `0005-create-a-delivery.md`). `select status, actor_id from public.order_events where order_id = '<id>' order by created_at;` ends with a `cancelled` row whose `actor_id` is null. The detail must read "Payment window expired", not the user cancel sentence, and Past must show it as expired.

## AC-6: the route map

- [ ] The detail shows a static map with a pin at pickup, a pin at dropoff, and a dashed line between them. The camera fits both, with padding so neither pin sits under the header.
- [ ] The coordinates on screen match `pickup_lat`, `pickup_lng`, `dropoff_lat`, `dropoff_lng` for that order.
- [ ] No courier marker and no movement. Live position is out of scope for this slice.

## AC-7: the courier card

- [ ] While `courier_id` is null, the section is absent entirely. Not empty, absent.
- [ ] Have the courier account accept the job. The section appears with the display name (`first_name` and `last_name` joined), and the vehicle line, which comes from the new `courier_vehicle(order_id)` function. Match it against `select vehicle_type, vehicle_number from public.courier_applications where user_id = '<courier>';`.
- [ ] Call opens the device dialer with the courier's stored number (`Linking` with a `tel:` URL). On a simulator with no dialer, confirm the app does not crash.
- [ ] Set the courier's `profiles.phone` to null in the SQL editor. Call disappears, the rest of the card stays. Phone is nullable and the card must not offer a call to nothing.
- [ ] Chat routes to the existing chat placeholder.
- [ ] Negative, from a SQL editor session as customer B: `select * from public.courier_vehicle('<A order id>');` returns no row. The harness covers this too; this confirms it on the deployed project.

## AC-8: the receipt

- [ ] Walk the rows against the database columns for one order: type, package size, weight, handling flags (a "None" line when empty), receiver name and phone, instructions, schedule, the pickup line, the dropoff line.
- [ ] The breakdown reads base, distance, handling, total, each formatted as naira from kobo. `total_kobo` 224900 shows as ₦2,249.00. The sum of the three lines above equals the total on screen.
- [ ] An order with `scheduled_at` null shows the ASAP text, not a blank and not a fabricated time.
- [ ] A scheduled order shows its slot in `en-NG` form.
- [ ] Switch between two order types (document and parcel) and confirm the labels come from `locales/en.json`, so nothing is hardcoded: a quick grep for quoted display strings in `features/orders/` should return none.

## AC-9: cancel, with copy that matches the server's refund rule

- [ ] Card on a `searching` order paid by card. Cancel appears on the detail and in the card menu. The dialog states plainly that no money comes back in this build, because the mock provider cannot refund a card and an unpaid order was never charged. Confirm, and the order becomes `cancelled`, lands in Past, and the timeline gains the cancel step, all without a manual refresh.
- [ ] Wallet order in `assigned`. The dialog states the wallet refund. Confirm, then `select wallet_balance();` (as that customer) shows the balance back by `total_kobo`. The sentence and the server agree; that is the whole point of this criterion.
- [ ] A `pending_payment` order offers Cancel too, and its dialog must not promise a refund.
- [ ] Once the order reaches `picked_up`, Cancel is gone from both places. To prove the server is the authority and not the button: open the confirm dialog on an `assigned` order, then let the courier move it to `at_pickup` from the other session, then press confirm. The server refuses and the screen shows the refusal copy through `errorLabel`. The client never wrote the status at any point.
- [ ] From a SQL editor session as that customer, `select public.change_order_status('<delivered order>', 'cancelled');` raises `order.invalid_transition`.

## AC-10: the card overflow menu

- [ ] The menu opens on a card with an accessible label. It offers Cancel only when the status allows it, and always offers Copy tracking code.
- [ ] Copy, then paste into any text field. It pastes the code with the display prefix, `TN-<code>`, matching what the card shows.

## AC-11: realtime keeps the screens fresh without a manual refresh

- [ ] Open the Orders tab on customer A's device. From the courier session, accept a job or move it forward. The chip on that card changes, and the order moves between Active and Past by itself.
- [ ] Open that order's detail and keep it on screen. The status line and the new timeline step appear with no pull to refresh. This is the trio working: the list query, the detail query, and that order's events query all invalidate on one row change. The events table is not in the publication, which is why the events query is invalidated from the order row change.
- [ ] Book a fresh order and watch the tab. It appears without a reload.
- [ ] Break the subscription on purpose: background the app for a few minutes, change the status meanwhile, come back. Refetch on focus covers the gap, so the screen is correct within a moment of return.

## AC-12: home shows up to three active deliveries

- [ ] On an account with no active orders, the section is not on the page at all.
- [ ] Book one, then a second, then a third. Each appears, newest first.
- [ ] Book a fourth. Home still shows three, and the oldest active one is the one that dropped. View all routes to the Orders tab.
- [ ] Cancel one from home's card. The section updates by itself (same subscription, same invalidation).

## AC-13: the confirmation screen reaches the order

- [ ] Complete a booking. On the confirmation, tap View order. The detail opens for exactly that order, and the tracking number on the confirmation matches the one in the detail header.

## AC-14: the four states stay distinguishable

- [ ] No orders at all (a fresh account, or customer B): the empty state with the book a delivery call to action.
- [ ] Orders exist but the filter or the search matches nothing: different copy plus a clear action. Both must be visibly not the same screen as the first.
- [ ] Failed load: enable airplane mode, open the tab. The error state with retry. Turn it off and press retry; the list comes back with no restart.
- [ ] Someone else's id, and a made up id, render the identical not found state with a back action. That sameness is the point: existence is never revealed. Try both in a row and compare.

## AC-15: copy, tokens, accessibility

- [ ] VoiceOver on iOS and TalkBack on Android, walking the tab and the detail. Every icon only control announces a purpose: search clear, the scan control (with its "arrives later" note), card overflow, Call, Chat, Copy, the sheet close.
- [ ] Font scale at the largest setting. Card rows, status chips, the timeline, and the price lines wrap or scroll rather than clip.
- [ ] Enable Reduce Motion at the system level. The sheet and the timeline settle without the animation; nothing that carries meaning disappears with it.
- [ ] No raw hex, size, or radius in the new components: everything reads through the semantic token classes from DESIGN.md. Spot check `components/ui/status-timeline.tsx`, `features/orders/route-map.tsx`, `features/orders/order-actions.tsx`.

## Value sourcing: every displayed number and word has a named origin

- [ ] Card title: `orders.type` through the i18n map, so `parcel` reads "Parcel delivery".
- [ ] Card second line: `orders.scheduled_at` formatted in `en-NG`. "Today" and "Tomorrow" follow the device's local day. When `scheduled_at` is null, the line shows the status label instead.
- [ ] Tracking id: `orders.tracking_code` with the `TN-` display prefix added at render, never stored with it.
- [ ] Status chip: `orders.status` through the i18n map, matching the label the detail uses for the same order.
- [ ] Timeline: `order_events.status` plus `created_at`, collapsed by the fixed map in AC-5. A null `actor_id` on a cancelled event means the expiry job.
- [ ] Courier name: `profiles.first_name` and `last_name`, joined with a space. A courier with a null last name renders one word, not a trailing space or "null".
- [ ] Courier phone: `profiles.phone`, nullable, and Call hides when null.
- [ ] Vehicle type and number: only through the `courier_vehicle(order_id)` rpc.
- [ ] Receipt amounts: `orders.*_kobo` through `lib/money`, formatted at display only.
- [ ] Schedule line: the stored time, or the ASAP label when `scheduled_at` is null.
- [ ] Whether Cancel shows: `orders.status` against the three legal source states, mirrored in the client. The server stays the authority (AC-9 proves it).
- [ ] The money sentence inside the confirm dialog: `orders.status` and `orders.payment_method` against the server's refund rule. Wallet from `assigned` refunds; every other cancel in this build returns nothing.
- [ ] Clipboard and dialer: `orders.tracking_code`, and the courier or receiver phone through `Linking`.

## Known state of the local stack

`bash supabase/.test/run.sh` currently exits 1 on two scripts, `80_courier_online.sql`
and `85_expire_pending_orders.sql`, both with "expected 1, got 6". The cause is data,
not code: the local development database holds 7 leftover orders from earlier manual
testing, dated 2026-10-19, and those two scripts count rows in a window that includes
them. Nothing here is a policy failure, proven by running the same scripts inside a
transaction that temporarily removes those rows and rolls back: no failures, and the
row count is untouched afterwards.

To clear it for real, decide first whether you still want those orders, then delete
children before parents:

```sql
delete from public.order_events where order_id in (select id from public.orders where created_at < now() - interval '1 day');
delete from public.wallet_transactions where order_id in (select id from public.orders where created_at < now() - interval '1 day');
delete from public.orders where created_at < now() - interval '1 day';
```

Then `bash supabase/.test/run.sh` should end with `policy tests ok`.
