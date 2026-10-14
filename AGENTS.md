# AGENTS.md

SwiftTransit: Expo (React Native) courier app for Nigeria, iOS and Android, two roles (customer, courier). Portfolio project built to production standards. Read this before any task.

## Context files

- [PRODUCT.md](PRODUCT.md): who it is for, constraints, principles, accessibility
- [DESIGN.md](DESIGN.md): design tokens and component rules (normative for all UI)
- [docs/scope/scope.md](docs/scope/scope.md): features, phases, status, next step
- [docs/specs/](docs/specs/): decisions and build specs (`0001-architecture` = stack)
- [design/README.md](design/README.md): Figma exports and screen → route map

## Git workflow (required)

- Never commit to `main`. Every task starts on a new branch from `main`: `feat/…`, `fix/…`, `docs/…`, `chore/…`.
- No incremental auto-commits mid-task. When the task is done, commit on the branch (Conventional Commits), push, open a PR with `gh pr create`, and share the PR link. Don't merge it.
- Never commit secrets, `.env`, or the installed agent skills (gitignored).

## Stack (decided in spec 0001)

Expo SDK 57 · Expo Router · TypeScript strict · NativeWind 4 · Reanimated 4 · MapLibre RN + OpenFreeMap tiles · Supabase (Postgres/RLS, Auth, Realtime, Storage, Edge Functions) · TanStack Query · Zustand (wizard draft only) · react-hook-form + zod · i18next · mocked `PaymentProvider` · Geoapify geocoding and routing (via the `geo` Edge Function) · Termii SMS via Send SMS hook · Resend SMTP. Development builds, not Expo Go.

## Build approach

Tracer Bullet: stand up a thin end to end thread through every layer first, then thicken it. Recorded in the scope header.

## Commands

```sh
npm install
cp .env.example .env    # then fill Supabase URL and publishable key
npm run ios             # or npm run android: builds the dev client, then starts Metro
npm start               # Metro for an installed dev build
npm run typecheck       # tsc --noEmit
npm run lint            # expo lint
npm run format          # prettier --write .
npm test                # jest (jest-expo preset)
```

CI (`.github/workflows/ci.yml`) runs typecheck, lint, `format:check` and tests on every PR to `main` and on push to `main`. With no backend yet, set `EXPO_PUBLIC_DEV_AUTH_STUB=customer` (or `courier`) in `.env` to walk a role's screens in development.

## Conventions

- UI uses semantic tokens from DESIGN.md through NativeWind classes; no raw hex, sizes or radii in components.
- All copy goes through i18n (`locales/en.json`). Use start/end, never left/right.
- Money is integer kobo; format only at display (`en-NG`, `NGN`). Phone numbers default to `+234`, stored E.164.
- Use Nigerian content (naira, Lagos addresses, Nigerian names), never the UI kit's Tunisian sample data.
- Routes in `app/` stay thin; logic lives in `features/<area>/` and `lib/`.
- TypeScript paths: `@/*` maps to the repo root (`@/lib/env`, `@/features/auth/guards`); `strict` is on.
- Tests live in `__tests__/` and run on Jest (`jest-expo`). Route tests use `renderRouter` from `expo-router/testing-library` and mock the auth provider, `@/lib/env`, `global.css` and MapLibre.
- Order status and money change only server-side (Edge Functions / SQL functions), never from the client.
- Every icon-only control has an accessibility label; respect Reduce Motion and font scaling.
- Prefer the smallest change that works (ponytail); add a dependency only when it removes real code.

## Agent skills

Installed per project into `.claude/skills/` (gitignored), sources pinned in `skills-lock.json`. Restore on a new machine:

```sh
npx skills experimental_install
# or, explicitly:
npx skills add pbakaus/impeccable ajibolagenius/vibe-secure-me DietrichGebert/ponytail Leonxlnx/taste-skill JavaScript-Mastery-Pro/skills emilkowalski/skills -s '*' -a claude-code -y
```

| Use | Skill |
|---|---|
| Plan and build features | `scope`, `architect`, `develop`, `check`, `test`, `debug`, `sync`, `audit`, `document` (jsmastery) |
| Visual quality and UI critique | `impeccable` (reads PRODUCT.md + DESIGN.md), taste skills (`design-taste-frontend`, `high-end-visual-design`, `minimalist-ui`, `redesign-existing-projects`, `image-to-code`) |
| Motion, gestures, haptics | `animate-expo`, `emil-design-eng`, `mobile-native`, `review-animations`, `animation-performance` |
| Security | `secure-me`: run on every PR touching auth, RLS, storage, location or money |
| Keep it simple | `ponytail`, `ponytail-review` |

DESIGN.md wins over any skill's default style. Ignore taste skills that push a different look (for example `industrial-brutalist-ui`).
