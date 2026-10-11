# Product

SwiftTransit is an on-demand courier app: customers book a pickup and drop-off for documents, parcels, food or groceries and track them live; couriers go online, accept nearby jobs and navigate them to completion. One app, two roles.

> Facts marked _(inferred)_ come from the design files in `design/`, not from a stakeholder. Confirm or correct them.

## Platform

adaptive

iOS and Android from one Expo codebase. The visual language is custom (brand green, Urbanist) and shared across both. Native affordances (sheets, haptics, back gestures, system pickers, permission prompts) follow each OS.

## Stack

Decided in [spec 0001](docs/specs/0001-architecture/index.md): Expo (SDK 57) + Expo Router, NativeWind, MapLibre with OpenStreetMap data, Supabase. Payments are mocked for the MVP.

## Users

- **Customer (client):** sends or receives packages around the city. Wants to book in seconds, know the price before paying, and see where the package is. _(inferred)_ Lives in Tunisia: Sousse in the designs, prices in TND.
- **Courier:** independent driver with a vehicle. Wants a steady stream of nearby jobs, clear pickup and drop-off info, earnings at a glance, and quick contact with the customer. Must apply (vehicle, licence number, licence photo) before taking jobs.

Role is chosen at registration ("Account type: Courier / Client").

## Product Purpose

Make same-day local delivery feel as easy as sending a message: pick what you are sending, where from, where to, who receives it, and when, then pay and track.

## Positioning

"Send Anything, Anywhere, Anytime." Fast, reliable, transparent. Price breakdown before payment, a tracking number for every order, live position on a map.

## Operating Context

- Used on the move, often one-handed, sometimes outdoors in bright sun (courier). Large touch targets and high contrast matter more than density.
- Couriers keep the app open for long sessions with GPS on. Battery and data use matter.
- Network quality varies. Screens must show something useful while offline or loading.

## Capabilities and Constraints

**Customer**
- Onboarding carousel (3 slides), then sign in with phone, email, Google or Apple. OTP verification by SMS or email.
- Home: current city, tracking-number search, QR scan, delivery-type shortcuts, active deliveries.
- New delivery wizard, 6 steps: type → pickup → drop-off → receiver contact → package details → schedule. Then order summary, payment (card or wallet), confirmation with a tracking number.
- Orders list (all / active / past), wallet (balance, top up, transaction history), profile (edit profile, saved addresses, payment methods, language, notifications, support, legal, logout).

**Courier**
- Online/offline toggle, earnings balance and withdrawal, weekly stats, pending actions.
- Nearby delivery requests with price, distance, ETA and handling tags; accept or view details.
- Active delivery: map with route, next-turn banner, pickup and drop-off details, arrived / picked up steps, report an issue.
- Chat and call with the customer.

**Constraints**
- Currency: TND, displayed as `TND12,50` (comma decimal) _(inferred)_.
- Payments: mocked for the MVP behind one interface. The designs show Stripe, but Stripe availability for Tunisian merchants is unconfirmed; local providers (Konnect, Flouci) are the likely alternative. Decide before launch.
- Location: needed for pickup and tracking, never required to browse. "Enter address manually" is always offered.
- Languages: English at launch, every string through i18n so French and Arabic (RTL) can follow.

## Brand Commitments

- Name and wordmark: **SwiftTransit**, with the green "S" mark.
- Tagline: "Send Anything, Anywhere, Anytime".
- Colour: deep green (`#0F403B`) for brand and primary actions, fresh green (`#67CE67`) for success and dark-mode actions, amber (`#D69431`) as a sparing accent.
- Type: Urbanist.
- Tone: friendly, short, plain. Sentences like "Where to send your next Parcel today?" and "Skip typing. Just allow location and confirm your address."

## Evidence on Hand

- Full screen designs, light and dark: `design/` (see [design/README.md](design/README.md)).
- Design system board: `design/_Design System.png` (colour primitives, semantic tokens, type scale, spacing, radius).
- No research, analytics or testimonials yet.

## Product Principles

1. **Three taps to "booked" for a repeat sender.** Saved addresses and sensible defaults beat forms.
2. **Price and time are never a surprise.** Show cost breakdown and ETA before commitment.
3. **Where is my package?** Tracking is always one tap from home.
4. **Couriers' attention is on the road.** Big targets, minimal reading, haptic confirmation, no modal stacks while navigating.
5. **Ask for permission at the moment of need,** explain why, and always offer a manual path.

## Accessibility & Inclusion

- WCAG 2.2 AA contrast for text in both themes; check `text-tertiary` (`#8C8C8C`) on white, which fails AA for body text, and keep it for non-essential metadata only.
- Minimum touch target 44×44 pt.
- Every icon-only control has an accessibility label; OTP inputs announce position; status changes (order booked, courier assigned) are announced.
- Respect Reduce Motion, Dynamic Type / font scale (layouts must survive 1.3× text), and system dark mode.
- RTL-ready layout (logical start/end, no hard-coded left/right) so Arabic can ship without a rewrite.
