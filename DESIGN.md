---
name: SwiftTransit
description: Send Anything, Anywhere, Anytime. Calm deep-green courier app with one confident action per screen.
colors:
  green-900: "#0F403B"
  green-700: "#1A5C54"
  green-500: "#67CE67"
  green-200: "#CDE7C1"
  green-100: "#E8F5E0"
  neutral-950: "#000000"
  neutral-900: "#0D0B26"
  neutral-800: "#111827"
  neutral-700: "#1E1E1E"
  neutral-600: "#28303F"
  neutral-500: "#344054"
  neutral-400: "#667085"
  neutral-300: "#8C8C8C"
  neutral-250: "#9F9F9F"
  neutral-200: "#ABB7C2"
  neutral-175: "#C3CBCA"
  neutral-150: "#CFD6DC"
  neutral-125: "#D0D5DD"
  neutral-100: "#E4E4E4"
  neutral-75: "#EAEAEA"
  neutral-50: "#F7F7F7"
  neutral-25: "#FAFAFA"
  neutral-0: "#FFFFFF"
  accent-amber: "#D69431"
  danger: "#D92D20"
  dark-bg: "#1A1A1A"
  dark-surface: "#333333"
  dark-border: "#444444"
  dark-brand-subtle: "#233023"
typography:
  display-lg:
    fontFamily: "Urbanist"
    fontSize: "32px"
    fontWeight: 400
    lineHeight: 1.2
  display-md:
    fontFamily: "Urbanist"
    fontSize: "20px"
    fontWeight: 400
    lineHeight: 1.3
  heading-h1:
    fontFamily: "Urbanist"
    fontSize: "32px"
    fontWeight: 600
    lineHeight: 1.2
  heading-h2:
    fontFamily: "Urbanist"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.25
  heading-h3:
    fontFamily: "Urbanist"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.3
  heading-h4:
    fontFamily: "Urbanist"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.3
  heading-h5:
    fontFamily: "Urbanist"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1.35
  subheading-xl:
    fontFamily: "Urbanist"
    fontSize: "22px"
    fontWeight: 500
    lineHeight: 1.3
  subheading-lg:
    fontFamily: "Urbanist"
    fontSize: "18px"
    fontWeight: 500
    lineHeight: 1.35
  subheading-md:
    fontFamily: "Urbanist"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1.4
  subheading-sm:
    fontFamily: "Urbanist"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.4
  subheading-xs:
    fontFamily: "Urbanist"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
  body-lg:
    fontFamily: "Urbanist"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.5
  body-md:
    fontFamily: "Urbanist"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: "Urbanist"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.45
  body-xs:
    fontFamily: "Urbanist"
    fontSize: "10px"
    fontWeight: 400
    lineHeight: 1.4
  label-lg:
    fontFamily: "Urbanist"
    fontSize: "17px"
    fontWeight: 500
    lineHeight: 1.2
  label-md:
    fontFamily: "Urbanist"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.2
  label-sm:
    fontFamily: "Urbanist"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.2
rounded:
  xs: "2px"
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  3xl: "24px"
  full: "9999px"
spacing:
  "1": "4px"
  "2": "6px"
  "3": "8px"
  "4": "10px"
  "5": "12px"
  "6": "14px"
  "7": "16px"
  "8": "20px"
  "9": "24px"
  "10": "32px"
  "11": "40px"
  "12": "48px"
components:
  button-primary:
    backgroundColor: "{colors.green-900}"
    textColor: "{colors.neutral-0}"
    typography: "{typography.label-md}"
    rounded: "{rounded.xl}"
    height: "52px"
  button-primary-pressed:
    backgroundColor: "{colors.green-700}"
  button-primary-dark:
    backgroundColor: "{colors.green-500}"
    textColor: "{colors.green-900}"
  button-secondary:
    backgroundColor: "{colors.neutral-0}"
    textColor: "{colors.neutral-950}"
    typography: "{typography.label-md}"
    rounded: "{rounded.xl}"
    height: "52px"
  button-icon:
    backgroundColor: "{colors.neutral-0}"
    textColor: "{colors.neutral-950}"
    rounded: "{rounded.full}"
    size: "44px"
  input:
    backgroundColor: "{colors.neutral-0}"
    textColor: "{colors.neutral-950}"
    typography: "{typography.body-md}"
    rounded: "{rounded.xl}"
    height: "48px"
    padding: "0 14px"
  segmented-track:
    backgroundColor: "{colors.neutral-50}"
    rounded: "{rounded.full}"
    padding: "4px"
  segmented-selected:
    backgroundColor: "{colors.green-200}"
    textColor: "{colors.green-900}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
  select-card:
    backgroundColor: "{colors.neutral-0}"
    rounded: "{rounded.xl}"
    padding: "14px"
  select-card-selected:
    backgroundColor: "{colors.green-100}"
  icon-tile:
    backgroundColor: "{colors.green-200}"
    textColor: "{colors.green-900}"
    rounded: "{rounded.full}"
    size: "40px"
  balance-card:
    backgroundColor: "{colors.green-200}"
    textColor: "{colors.neutral-950}"
    rounded: "{rounded.2xl}"
    padding: "16px"
  stepper-header:
    backgroundColor: "{colors.green-100}"
    rounded: "{rounded.xl}"
    padding: "12px"
  order-card:
    backgroundColor: "{colors.neutral-25}"
    rounded: "{rounded.2xl}"
    padding: "16px"
  sheet:
    backgroundColor: "{colors.neutral-0}"
    rounded: "{rounded.3xl}"
    padding: "24px"
  tab-fab:
    backgroundColor: "{colors.green-900}"
    textColor: "{colors.neutral-0}"
    rounded: "{rounded.full}"
    size: "52px"
---

# Design System: SwiftTransit

Source of truth: the Figma export in `design/` (`_Design System.png` plus per-screen files). Hex values are copied from the board's labels. Type sizes and the upper spacing/radius steps were measured from the export (±1 px) because the board crops their labels; confirm them in Figma and update this file. Dark-theme values were sampled from the dark boards.

## Overview

Calm, airy and trustworthy. White space, one deep-green action per screen, soft pale-green surfaces to group things, and very little else. Nothing shouts. Hierarchy comes from size and weight, not colour. The app should feel like a reliable service, not a promotion.

Light and dark are both first-class. In dark mode the deep green steps back and the fresh green (`green-500`) becomes the action colour.

The purchased UI kit uses Tunisian sample content (TND, +216, Sousse). Build with Nigerian content instead: naira, `+234`, Lagos addresses and names.

**Logo**: `design/logo svg.svg`, two interlocking shapes forming an "S", single colour. Use `green-900` on light backgrounds, `green-500` or `neutral-0` on dark and on `bg/brand`. The wordmark "SwiftTransit" is set in Urbanist SemiBold beside the mark. Minimum mark size 24 px; clear space = half the mark's width. App icon: mark on `green-200` (as on the splash screen); adaptive icon foreground = mark, background = `green-200`.

## Colors

Colour tokens come in two layers. Components use **semantic** tokens. Primitives (above) are only referenced by the semantic layer, never directly by a screen.

### Primary

`green-900` is the brand: primary buttons, active tab, links, headline accent words ("**Parcel** today?"), selected borders, the logo. `green-700` is its pressed state.

### Secondary

`green-200` and `green-100` are the "brand-subtle" surfaces: balance cards, icon tiles, the stepper header, selected cards, selected segments, outgoing chat bubbles. `green-500` means success (verified, completed step) in light mode and is the primary action colour in dark mode.

### Tertiary

`accent-amber` is rare: the drop-off pin, "Fragile" tag, warm package icons. Never a button. `danger` (`#D92D20`, not on the board; taken from the validation-error screens) is for errors, invalid OTP and destructive actions like Logout.

### Neutral

Mostly white (`neutral-0`) with `neutral-25`/`neutral-50` for quiet cards and tracks, `neutral-150` for borders, `neutral-950` for primary text, `neutral-500` for secondary text, `neutral-300` for tertiary/meta text and placeholders.

### Semantic tokens

| Token | Light | Dark |
|---|---|---|
| `bg/primary` | neutral-0 | dark-bg |
| `bg/secondary` | neutral-25 | dark-surface |
| `bg/tertiary` | neutral-50 | dark-surface |
| `bg/inverse` | neutral-950 | neutral-0 |
| `bg/brand` | green-900 | green-500 |
| `bg/brand-subtle` | green-200 | dark-brand-subtle |
| `bg/brand-soft` | green-100 | dark-brand-subtle |
| `bg/success` | green-500 | green-500 |
| `text/primary` | neutral-950 | neutral-0 |
| `text/secondary` | neutral-500 | neutral-175 |
| `text/tertiary` | neutral-300 | neutral-250 |
| `text/disabled` | neutral-250 | neutral-400 |
| `text/inverse` | neutral-0 | neutral-950 |
| `text/brand` | green-900 | green-500 |
| `text/link` | green-900 | green-500 |
| `text/on-brand` | neutral-0 | green-900 |
| `text/danger` | danger | danger |
| `border/default` | neutral-150 | dark-border |
| `border/subtle` | neutral-125 | dark-surface |
| `border/strong` | neutral-700 | neutral-200 |
| `border/brand` | green-900 | green-500 |
| `border/focus` | green-500 | green-500 |
| `border/danger` | danger | danger |
| `border/accent` | accent-amber | accent-amber |
| `interactive/primary` | green-900 | green-500 |
| `interactive/primary-pressed` | green-700 | green-200 |
| `interactive/secondary` | green-200 | dark-brand-subtle |
| `interactive/accent` | accent-amber | accent-amber |

Light column is from the board. Dark column is sampled and partly inferred; verify against Figma.

### Named Rules

- **One green button per screen.** If two actions compete, the second is `button-secondary` or a text link.
- **Brand-subtle groups, never decorates.** Pale green marks "this is the thing you are choosing / own", not empty filler.
- **`text/tertiary` is for metadata only.** It fails AA as body text on white (3.4:1). Labels, prices, addresses and anything the user must read use `text/primary` or `text/secondary`.

## Typography

**Urbanist** (Google Fonts, variable). Identified visually from the export; confirm in Figma. Load Regular 400, Medium 500, SemiBold 600, Bold 700 via `expo-font` at build time (config plugin), not at runtime.

### Hierarchy

- **Display** (32/20, Regular): big friendly headlines such as the Home greeting and balances (`₦43,050.00`). Light weight on purpose; the accent word goes `text/brand` + SemiBold.
- **Heading H1 to H5** (32 → 14, SemiBold/Bold): screen titles ("Orders", "Wallet"), sheet titles, section titles.
- **Subheading** (22 → 13, Medium): card titles, list titles, step titles ("What are you sending?").
- **Body** (17 → 10, Regular): descriptions, helper text, addresses.
- **Label** (17 → 12, Medium): buttons, tabs, chips, field labels.

Respect the OS font scale. Layouts must survive 1.3× without clipping; cap `maxFontSizeMultiplier` at 1.5 on tight elements (tab labels, chips) only.

Money uses tabular figures (`fontVariant: ['tabular-nums']`) so amounts don't jitter as they update.

## Layout

- Screen gutter 16 px (`spacing.7`); 24 px on large phones is fine but keep one value per screen.
- Vertical rhythm: 8 px within a group, 16 px between related groups, 24 to 32 px between sections.
- Primary action is pinned to the bottom above the home indicator (safe area + 16 px) on every form/wizard screen.
- Bottom tab bar on the root screens: Home · Orders · [centre action] · Wallet · Profile (customer) and Home · Deliveries · [centre action] · Earnings · Profile (courier).
- 4 px base grid. The board's spacing scale (4, 6, 8, 10, 12, 14, 16, then 20/24/32/40/48 inferred) is the only allowed spacing.

## Elevation & Depth

Flat. Depth comes from surface colour (`bg/secondary` cards on `bg/primary`), 1 px `border/default` outlines, and a scrim behind sheets. Shadows are reserved for elements that float over the map (map controls, the bottom card on map screens, the tab bar's centre action): one soft shadow, `0 4 16 rgba(0,0,0,0.08)` light, none in dark (use `dark-border` outline instead).

## Shapes

Generous, consistent rounding. Inputs, buttons and selectable cards use `rounded.xl` (12). Larger containers (order cards, balance card) use `rounded.2xl` (16). Sheets and modals use `rounded.3xl` (24) on top corners. Icon buttons, avatars, icon tiles, segmented controls, chips and the tab action are `rounded.full`.

## Components

### Buttons

- **Primary**: filled `interactive/primary`, `text/on-brand`, 52 px tall, full width on forms. Pressed: `interactive/primary-pressed` plus scale 0.97. Loading replaces label with a spinner and keeps width.
- **Secondary**: `bg/primary` with `border/default`; same size.
- **Text link**: `text/link`, underlined for navigation-away links ("Jump to Sign in", "Terms of Service").
- **Icon button**: 44 px circle with `border/default` (back, bell, call, chat). Always has an accessibility label.

### Chips

Small rounded-full tags inside delivery cards: distance ("2.4 km away", brand-subtle), handling ("Fragile", amber outline), size ("Medium"), time ("~25 min"). Leading icon + `label-sm`.

### Cards / Containers

- **Select card**: icon tile + title + subtitle + trailing radio. Selected = `bg/brand-subtle`-tinted (`green-100`) with 1 px `border/brand`. Used for delivery type (2-column grid), saved addresses, package size, special handling, schedule option, payment method.
- **Order card**: `bg/secondary`, package icon, title, "Tracking ID / Estimated Delivery" pairs, overflow menu.
- **Balance card**: `bg/brand-subtle`, label + display amount + white pill action ("Top up", "Withdraw").
- **Stepper header**: `green-100` card, "Step N of 6", step name in `text/tertiary`, 6 dots (done = green-500 check, current = green-900 filled square, upcoming = outline).
- **Summary card**: grouped key/value pairs with a dashed divider before totals.
- **Sheet / modal**: scrim, bottom-anchored card, icon tile (64 px, `green-200`), title, body, then actions. Used for permissions, the centre-action menu, success states.

### Inputs / Fields

Label above (`label-md`, `text/secondary`), 48 px field with leading icon, 1 px `border/default`, `rounded.xl`. Focus: `border/focus`. Error: `danger` border plus message below in `body-sm`. Phone field has a country prefix (flag + dial code + chevron), defaulting to Nigeria (`+234`). OTP is 6 single-digit boxes in two groups of three separated by a dash, auto-advancing, paste-aware, `textContentType="oneTimeCode"` / `autoComplete="sms-otp"`.

### Navigation

Expo Router stacks with a custom header row: 44 px back button left, centred title. Root tabs use the custom tab bar with the raised centre action (52 px `tab-fab`, chevrons-up icon) that opens the "What would you like to do?" sheet (Send Package / Track a Delivery). Active tab = `text/brand` icon + label; inactive = `text/tertiary`.

### Map

Light, desaturated basemap (Positron-style) so the green route and pins carry the meaning. Pickup = dark circular pin, drop-off = amber pin, courier = green circle with heading arrow, route = dashed `green-900` line (solid `green-500` in dark). Floating cards and controls sit on `bg/primary` with the map shadow. Dark mode uses a dark basemap variant.

### Motion & feedback

Follow the `animate-expo` and `emil-design-eng` skills. Defaults: press feedback scale 0.97 over ~100 ms; sheets and cards use springs (no bounce for UI chrome); step transitions in the wizard slide horizontally (~250 ms); list items do not animate on every render. Success moments (OTP verified, delivery booked) get one icon pop and a success haptic. Everything respects Reduce Motion (cross-fade instead of slide/scale). Haptics: light on selection, success on completion, warning on error. Never animate layout-critical numbers (balances) on every update; tick only on change.

## Do's and Don'ts

### Do:

- Use semantic tokens in components; primitives only in the theme file.
- Keep one primary action, pinned to the bottom, per screen.
- Show price, ETA and tracking ID in plain sight before and after commitment.
- Pair every permission prompt with a "do it manually" alternative.
- Write start/end, not left/right, so RTL works later.

### Don't:

- Don't introduce colours, sizes or radii outside these tokens; extend this file first.
- Don't use `accent-amber` or `green-500` for text on white (fails contrast).
- Don't stack modals while a courier is navigating.
- Don't use emoji as icons; use one icon set at 20/24 px, 1.5 stroke. Lucide (`lucide-react-native`) is the working choice; the designs look closer to Iconsax, so confirm the Figma icon library first.
- Don't put generic AI-slop flourishes (gradients, glassmorphism, oversized shadows) on top of this calm system.
