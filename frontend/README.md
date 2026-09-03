# Creators' Vault — Web App

The primary user-facing frontend for **Creators' Vault**, an intelligent digital asset
management workspace. It consumes the backend REST API documented in `../backend/api.md`.

> This is the **regular-user** web app only. The admin panel is a separate project.

## Stack

- **Next.js 16** (App Router, TypeScript, `src/`)
- **Tailwind CSS v4** — design tokens in `src/app/globals.css`
- **motion** — purposeful animation only (page transitions, hover/tap, expanding panels,
  drag-and-drop feedback)
- **lucide-react** — icons (no emoji)

## Getting started

```bash
npm install
cp .env.example .env.local     # then edit if your backend isn't on :4000
npm run dev                    # http://localhost:3000
```

The backend must be running and reachable at `NEXT_PUBLIC_API_BASE_URL`
(default `http://localhost:4000/api/v1`). For OAuth to work end to end, the backend needs
`FRONTEND_URL=http://localhost:3000` and Google OAuth credentials configured.

| Script | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |

## How it's wired

### API layer — `src/lib/api.ts`

Every network call goes through the typed `api.*` client. It attaches the bearer token,
and on a `401` it performs **one** refresh-token rotation (`POST /auth/refresh`) and retries;
if that fails it clears tokens and dispatches `cv:auth-expired`. Response/request shapes live
in `src/lib/types.ts`, transcribed from `../backend/api.md`.

### Auth flow

1. `/login` → `GET {API}/auth/google` (browser redirect; GitHub shown only if the server
   doesn't answer `503`).
2. Backend redirects to `/auth/callback?accessToken=…&refreshToken=…`.
3. `AuthProvider` stores both tokens in `SameSite=Lax` cookies (`cv_at`, `cv_rt`) and loads
   `GET /auth/me`.
4. `src/proxy.ts` (Next 16 "proxy", formerly middleware) does an optimistic redirect based on
   the presence of the refresh cookie; `AppShell` does the real check.

### Progressive disclosure

Cards and lists show only essentials + a "View Details" affordance. Detail pages
(`/assets/[id]`, `/projects/[id]`) reveal everything through tabs/sections. Relationship
reasons are one plain line, expandable.

## Route map

| Route | What |
|---|---|
| `/login`, `/auth/callback` | OAuth |
| `/dashboard` | Calm overview: stats, search, Recently added / Needs attention / Projects / Recently used |
| `/assets` | Browse + filter + sort + trash view |
| `/assets/new` | Upload · Import from URL · Marketplace link · Note |
| `/assets/[id]` | Tabs: Overview · Files · Relationships · Projects · Source · License · Versions · Activity |
| `/projects`, `/projects/[id]` | Project list; detail with section groups |
| `/search` | Keyword search, plus "by meaning" when `/search/status` reports it available |
| `/tags` | Tag management (rename changes the slug) |
| `/marketplace`, `/marketplace/[id]` | **Preview only** — sample listings, mock checkout |
| `/settings`, `/settings/extension`, `/settings/billing` | Profile · extension tokens · transactions |

## Known stubs (backend-side, surfaced honestly)

- **Marketplace** is sample data; write endpoints return `501`. Purchase runs a **mock**
  provider — the panel is labelled as such and offers "simulate success/failure" test helpers
  (the mock declines any amount ending in `.99`).
- **Payments** transactions are real rows but `isLive: false`.
- **`plan`** exists on the user but no billing reads it.

See `todo.md` for phase-by-phase status and anything deferred.
