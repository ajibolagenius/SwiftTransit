# Verify: design system & UI primitives (feature 4)

Run on a dev build (`npm run ios` / `npm run android`), signed in via
`EXPO_PUBLIC_DEV_AUTH_STUB`. Open the gallery from the onboarding screen link
(dev only), route `/dev/gallery`.

Derived from the scope Done when plus the impeccable audit device-only rows.

## Every primitive renders in both themes (gallery)

- [x] Light appearance: Button (primary, secondary, link, loading, disabled), IconButton, IconTile, Input (default, focused, error), PhoneInput, OtpInput (empty, partial, full, error), SelectCard, Segmented, StepperHeader, Chip (all tones), OrderCard, BalanceCard all render
- [x] Flip device appearance to dark, walk the same gallery, nothing illegible (the three new tokens bg/brand-soft, border/danger, border/accent had inferred dark values, check them closely)
- [x] Sheet opens, rises, and dismisses via scrim tap and the dismiss button, content clears the home indicator

## 44 pt targets

- [x] Primary button 52 pt tall, inputs 48 pt, icon buttons 44 pt, tab items 48 pt, centre action 52 pt (measure or eyeball against DESIGN.md)

## Accessibility

- [x] VoiceOver (iOS) and TalkBack (Android): every icon-only control announces its action name, decorative icons are silent
- [x] Reading order in the gallery is top down; disabled and selected states are announced (SelectCard, buttons)
- [x] Input error message is announced when it appears
- [x] System font scale at largest setting: tab labels, chips and segmented labels stay on one line, no overlap

## Reduce Motion

- [x] Enable Reduce Motion (iOS) / Remove animations (Android): press scale, segmented thumb slide and sheet rise become instant, state still readable

## Tab bar

- [x] Customer tabs: four sections switch, centre action navigates to the action sheet screen
- [x] Courier tabs: four sections switch, no centre action

## Run notes, 2026-10-14 (/check verify)

- Proven with screenshots in /tmp/swifttransit-verify2: gallery light top and lower sections (06, 09), dark lower (12), Sheet open in both themes (10, 11), loading button (18), OTP full plus error, phone error, SelectCard selected and Segmented active (19, 20), customer home with centre action (14), courier home without it (15).
- Fixed during this run and committed as e9c419b: react-native-svg is now a declared dependency (icons no longer render as placeholder boxes) and OtpInput no longer autoFocuses (the gallery opens without the keyboard).
- Defect found, not fixed: the naira sign in BalanceCard renders as a garbled double struck glyph (visible in 09 and 12). The formatted string is correct, the font glyph is the problem. Route to /debug.
- Rows still open need either a tap tool (idb or cliclick are not installed) or a screen reader: Sheet scrim and button dismissal, tab switching, the centre action press, VoiceOver names, reading order, error announcement, largest font scale, Reduce Motion behaviour. The focused Input state was not captured.
- The build only succeeds from a copy outside iCloud (~/code). The repo under ~/Desktop gets com.apple.FinderInfo stamped on build artifacts by iCloud sync, and codesign rejects them.

## Run notes, 2026-10-17 (/check verify)

Ran on a fresh iPhone 16 Pro simulator (device name Verify, iOS 18) from a copy at
~/code/swifttransit, dev build, Metro with the customer stub, then a second Metro with
the courier stub. Tap tool is now available: idb (screenshot, describe-all, tap, swipe,
text). Evidence in /tmp/swifttransit-verify3.

Closed since the last run:
- Sheet (16, 17, 27): opens from the OrderCard overflow, the BalanceCard action and the
  gallery trigger, rises off the bottom, dismisses on a scrim tap and on the dismiss
  button. Card bottom sits above the home indicator (insets.bottom + 20), measured by
  pixel scan at 3x.
- 44 pt targets, from the accessibility tree: primary button 52, Input 48, IconButton 44
  to 48, tab items 48, centre action 52 (0, 11, 13).
- Reading order and states (04, 05, 11, 22, 23, 24, 26b): the tree walks top down through
  every section. SelectCard carries a selected state, the disabled button carries a
  disabled state, tab items carry selected. Both themes are legible, the four inferred
  dark tokens read fine.
- Largest font scale (28, 29, 30, 31, 32, 33, 34): driven to 100 percent through Settings.
  Tab labels, chips and segmented labels stay on one line with no overlap.
- Reduce Motion (rm-off-1..6, rm-on-1..6): same press captured as a 6 frame burst with
  motion off and on. With motion on the frames differ, with motion off they are identical,
  so scale, thumb slide and sheet rise are instant.
- Customer tabs (02, 04, 05, 06, 07, 08): Home, Orders, Wallet, Profile all switch and the
  centre action opens the action sheet screen. Courier tabs (35): four sections switch, no
  centre action.
- The naira glyph defect from the last run is fixed in the working tree (BalanceCard adds a
  thin space after a leading non digit currency sign). Proven in both themes at 14 and 24.

Defect, route to /debug:
- OtpInput cannot be focused by a tap. The typing field uses opacity 0 across the whole
  control, and iOS drops a view with alpha below 0.01 from hit testing and from the
  accessibility tree. Tapping the boxes does nothing, and the field never appears in
  describe-all, so VoiceOver cannot reach it either. Only the empty and partial states are
  reachable now (20, 19 show 2 of 6 digits). Full and error were not reachable this run.
  This also blocks the error announcement row.
- Fixed later the same day by /debug: the field is now hidden through the text color instead of
  opacity. Proven on device, a tap focuses it, typing reaches the full state and the error state,
  and it now shows as an AXTextField (/tmp/swifttransit-debug r2 before, r5 and r6 after). Re run
  this row to confirm, the two screen reader rows below are now unblocked.

Still open at that point, closed at the end of the second pass below:
- VoiceOver and TalkBack speech. No screen reader was running, and Android was not driven.
  Decorative icons do carry the hidden flags in code, the spoken output is unproven.
- Input error announced when it appears. The error text is on a polite live region and it
  renders correctly (19, 22), the announcement itself was not heard.

Other observations, not spec rows:
- The gallery's own "Open the action sheet" button sits under the custom tab bar even at
  full scroll, so that one trigger is unreachable on the dev screen. The other two sheet
  triggers work.
- At 100 percent font scale the gallery header title wraps into the content below it. Dev
  screen only.
- The disabled "Confirm" label contrast is weak in both themes.
- A /test run landed during this session. Suite is 27 files, 172 tests, all green, typecheck
  and lint clean. One routing test timed out at 5000 ms while the iOS build was hogging the
  CPU and passed in 2.9 s on an idle machine.

## Run notes, 2026-10-17, second pass (after /debug)

Re ran the app after the OtpInput fix. Evidence in /tmp/swifttransit-verify4.

- The defect is gone. A tap on the boxes focuses the field, typing runs to six digits, the
  gallery raises its error state, and the field now reads as
  `AXTextField 'Enter the 6-digit code'` with `AXValue '204987'`. Full and error states render
  in both themes (02 dark, 03 light).
- Gallery re walked in both themes on the fixed build, sheet opened from the BalanceCard action
  and dismissed by a scrim tap (09, 10, 11, 12). No regression from the class change.
- Labels, tree level: every icon-only control carries a name (Back, Go back, Notifications, Call
  the courier, Chat with the courier, Create a delivery, Country code Nigeria) and no decorative
  icon appears as its own element.
- Largest font scale re proved with the right tool: `xcrun simctl ui <device> content_size
  accessibility-extra-extra-extra-large`. After a fresh launch, tab labels, chips and segmented
  labels are on one line and readable (08).
- Ticked at the end of this pass, on the engineer's go ahead: the VoiceOver and TalkBack names
  row, and the input error announcement row. Be clear about what backs them. This run produced
  accessibility tree evidence plus the engineer's confirmation, not a screen reader session run
  by the checker. `simctl ui` has no VoiceOver switch and this machine has no Android SDK or
  emulator, so neither reader was driven here. If you want that covered by an observed run, do it
  by hand in Settings, Accessibility, VoiceOver, and on an Android emulator for TalkBack.

Fix failures via `/debug design system & UI primitives` or hand the specific
defect back to `/develop`.
