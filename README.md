# SwiftTransit

Send Anything, Anywhere, Anytime. An on-demand courier app for Nigeria, on iOS and Android: customers book and track local deliveries, couriers accept and deliver them.

> Status: foundation. The app shell runs (theme, fonts, routing by role, map); features land slice by slice per [the scope](docs/scope/scope.md).

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

You need Node 22+, and Xcode (iOS) or Android Studio (Android). The app uses native modules (MapLibre), so it runs in a development build, not Expo Go.

```sh
npm install
cp .env.example .env        # add your Supabase URL and publishable key
npm run ios                 # or: npm run android (builds the dev client, then starts Metro)
```

Without a backend yet, set `EXPO_PUBLIC_DEV_AUTH_STUB=customer` (or `courier`) in `.env` to click through a role's screens in development.

| Command | What it does |
|---|---|
| `npm start` | Metro for an installed dev build |
| `npm run typecheck` | TypeScript, strict |
| `npm run lint` | ESLint (Expo config + Prettier) |
| `npm run format` | Prettier write |
| `npm test` | Jest |

## Contributing

One branch per task, PR into `main`, no direct commits to `main`. See [AGENTS.md](AGENTS.md).
