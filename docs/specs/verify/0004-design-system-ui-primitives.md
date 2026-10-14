# Verify: design system & UI primitives (feature 4)

Run on a dev build (`npm run ios` / `npm run android`), signed in via
`EXPO_PUBLIC_DEV_AUTH_STUB`. Open the gallery from the onboarding screen link
(dev only), route `/dev/gallery`.

Derived from the scope Done when plus the impeccable audit device-only rows.

## Every primitive renders in both themes (gallery)

- [x] Light appearance: Button (primary, secondary, link, loading, disabled), IconButton, IconTile, Input (default, focused, error), PhoneInput, OtpInput (empty, partial, full, error), SelectCard, Segmented, StepperHeader, Chip (all tones), OrderCard, BalanceCard all render
- [x] Flip device appearance to dark, walk the same gallery, nothing illegible (the three new tokens bg/brand-soft, border/danger, border/accent had inferred dark values, check them closely)
- [ ] Sheet opens, rises, and dismisses via scrim tap and the dismiss button, content clears the home indicator

## 44 pt targets

- [ ] Primary button 52 pt tall, inputs 48 pt, icon buttons 44 pt, tab items 48 pt, centre action 52 pt (measure or eyeball against DESIGN.md)

## Accessibility

- [ ] VoiceOver (iOS) and TalkBack (Android): every icon-only control announces its action name, decorative icons are silent
- [ ] Reading order in the gallery is top down; disabled and selected states are announced (SelectCard, buttons)
- [ ] Input error message is announced when it appears
- [ ] System font scale at largest setting: tab labels, chips and segmented labels stay on one line, no overlap

## Reduce Motion

- [ ] Enable Reduce Motion (iOS) / Remove animations (Android): press scale, segmented thumb slide and sheet rise become instant, state still readable

## Tab bar

- [ ] Customer tabs: four sections switch, centre action navigates to the action sheet screen
- [ ] Courier tabs: four sections switch, no centre action

## Run notes, 2026-10-14 (/check verify)

- Proven with screenshots in /tmp/swifttransit-verify2: gallery light top and lower sections (06, 09), dark lower (12), Sheet open in both themes (10, 11), loading button (18), OTP full plus error, phone error, SelectCard selected and Segmented active (19, 20), customer home with centre action (14), courier home without it (15).
- Fixed during this run and committed as e9c419b: react-native-svg is now a declared dependency (icons no longer render as placeholder boxes) and OtpInput no longer autoFocuses (the gallery opens without the keyboard).
- Defect found, not fixed: the naira sign in BalanceCard renders as a garbled double struck glyph (visible in 09 and 12). The formatted string is correct, the font glyph is the problem. Route to /debug.
- Rows still open need either a tap tool (idb or cliclick are not installed) or a screen reader: Sheet scrim and button dismissal, tab switching, the centre action press, VoiceOver names, reading order, error announcement, largest font scale, Reduce Motion behaviour. The focused Input state was not captured.
- The build only succeeds from a copy outside iCloud (~/code). The repo under ~/Desktop gets com.apple.FinderInfo stamped on build artifacts by iCloud sync, and codesign rejects them.

Fix failures via `/debug design system & UI primitives` or hand the specific
defect back to `/develop`.
