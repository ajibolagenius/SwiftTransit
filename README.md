# SwiftTransit

Send Anything, Anywhere, Anytime. An on-demand courier app for Nigeria, on iOS and Android: customers book and track local deliveries, couriers accept and deliver them.

> Status: planning. Docs are in place; the Expo scaffold is the next step (scope feature 1).

## Docs

| Doc | What it answers |
|---|---|
| [PRODUCT.md](PRODUCT.md) | Who it is for, what it does, constraints, principles |
| [DESIGN.md](DESIGN.md) | Design tokens, components, motion, do's and don'ts |
| [docs/scope/scope.md](docs/scope/scope.md) | Features by phase, status and next step |
| [docs/specs/0001-architecture](docs/specs/0001-architecture/index.md) | Stack, project layout, routes, data model sketch, security model |
| [design/README.md](design/README.md) | Figma exports and screen → route map |
| [AGENTS.md](AGENTS.md) | Conventions, git workflow, agent skills |

## Stack

Expo SDK 57 · Expo Router · TypeScript · NativeWind · Reanimated · MapLibre + OpenStreetMap (OpenFreeMap tiles, Geoapify search and routing) · Supabase · TanStack Query · i18next. Payments are mocked.

## Getting started

Setup commands land with the scaffold. You will need Node 22+, an EAS account or local Xcode/Android Studio (development builds, not Expo Go), and a Supabase project.

## Contributing

One branch per task, PR into `main`, no direct commits to `main`. See [AGENTS.md](AGENTS.md).
