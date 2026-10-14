# Verify: design system & UI primitives (feature 4)

Run on a dev build (`npm run ios` / `npm run android`), signed in via
`EXPO_PUBLIC_DEV_AUTH_STUB`. Open the gallery from the onboarding screen link
(dev only), route `/dev/gallery`.

Derived from the scope Done when plus the impeccable audit device-only rows.

## Every primitive renders in both themes (gallery)

- [ ] Light appearance: Button (primary, secondary, link, loading, disabled), IconButton, IconTile, Input (default, focused, error), PhoneInput, OtpInput (empty, partial, full, error), SelectCard, Segmented, StepperHeader, Chip (all tones), OrderCard, BalanceCard all render
- [ ] Flip device appearance to dark, walk the same gallery, nothing illegible (the three new tokens bg/brand-soft, border/danger, border/accent had inferred dark values, check them closely)
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

Fix failures via `/debug design system & UI primitives` or hand the specific
defect back to `/develop`.
