# Design references

Figma exports for SwiftTransit. Reference only: nothing here ships in the app bundle (app icons, splash and fonts go in `assets/`). Tokens and rules extracted from these files live in [DESIGN.md](../DESIGN.md).

## Boards

| File | Contents |
|---|---|
| `_Design System.png` | Colour primitives, semantic tokens, type scale, spacing, radius |
| `logo svg.svg` | The "S" mark, single colour `#0F403B` (usage rules in DESIGN.md) |
| `Onboarding — Light/Dark.png` | 3 onboarding slides |
| `Auth — Light/Dark.png` | 12 auth screens |
| `Main App — Light/Dark.png` | 19 customer screens |
| `Courier Mobile — Light/Dark.png` | 6 courier screens |

## Screens → routes

| Design file | Route (spec 0001) | Scope feature |
|---|---|---|
| `onboarding/iPhone 14 & 15 Pro - 21, 22, 23` | `(onboarding)/index` | 5 |
| `auth/Splash Screen` | native splash | 1 |
| `auth/Welcome - Sign In Options` | `(auth)/welcome` | 5 |
| `auth/Enter Phone Number` | `(auth)/phone` | 5 |
| `auth/Enter Email Address`, `Enter Email - Validation Error` | `(auth)/email` | 5 |
| `auth/Verify Phone Number`, `Verify Email Address`, `Verify Email - Invalid Code`, `Verification Success` | `(auth)/verify` | 5 |
| `auth/Registration - Account Details` | `(auth)/register` | 5 |
| `auth/Courier Application`, `Courier Application - Location Permission` | `(auth)/courier-apply` | 8 |
| `main/Home`, `Home - Location Permission` | `(customer)/(tabs)/index`, `permission/location` | 6 |
| `main/Home - Action Sheet` | `(customer)/action-sheet` | 6 |
| `main/New Delivery - Step 1 … Step 6` (incl. Map, Saved List, Selected, Calendar variants) | `(customer)/new-delivery/[step]` | 6 |
| `main/New Delivery - Order Summary (Card)`, `(Wallet)` | `(customer)/new-delivery/summary` | 6, 12 |
| `main/New Delivery - Booking Confirmation` | `(customer)/new-delivery/booked` | 6 |
| `main/Orders` | `(customer)/(tabs)/orders` | 7 |
| `main/Wallet` | `(customer)/(tabs)/wallet` | 12 |
| `main/Profile`, `Edit Profile` | `(customer)/(tabs)/profile`, `profile/edit` | 13 |
| `courier/Home - Offline`, `Home - Online` | `(courier)/(tabs)/index` | 8, 9 |
| `courier/Home - Delivery Request Details` | `(courier)/delivery/[id]` | 9 |
| `courier/Home - Active Delivery (Pickup Details)`, `(Navigation)` | `(courier)/delivery/[id]` | 9, 10 |
| `courier/Chat with Customer` | `chat/[orderId]` | 11 |

Screens implied by the designs but not drawn (design them in the matching `/architect` pass): order detail with live map for customers, courier Deliveries/Earnings/Profile tabs, saved addresses, payment methods, notification settings, empty and loading states, offline state.

## Damaged files: re-export needed

These 11 files were overwritten by a scripting mistake during project setup (2026-10-11) and now contain contact-sheet montages (1636×888) instead of the original screen (393×852, or 1572×3408 for auth). They are not in `main`. Re-export them from Figma (same names, same folders), check the dimensions, then commit. Until then the same screens are visible on the boards above.

The UI kit's sample content is Tunisian (TND, +216, Sousse). The app is Nigerian: build with naira, `+234` and Lagos content.

- `auth/Enter Email Address.png`
- `auth/Verification Success.png`
- `auth/Welcome - Sign In Options.png`
- `courier/Home - Delivery Request Details.jpg`
- `courier/Home - Online.jpg`
- `main/Home.jpg`
- `main/New Delivery - Step 1 - Delivery Type.jpg`
- `main/New Delivery - Step 3 - Drop Off Location.jpg`
- `main/New Delivery - Step 6 - Schedule Pickup.jpg`
- `main/Wallet.jpg`
- `onboarding/iPhone 14 & 15 Pro - 23.jpg`
