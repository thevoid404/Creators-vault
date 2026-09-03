# Creators' Vault — Admin Panel

The operators-only console for **Creators' Vault**. Regular users never see or reach this app.
It observes and manages what the backend and the main frontend already produce — it adds no
consumer-facing features.

> Separate app, not a route in the main frontend: separate deploy, separate access control, no
> risk of admin code shipping to regular users.

## Stack

- **Next.js 16** (App Router, TypeScript, `src/`) — same as the main frontend
- **Tailwind CSS v4** — design tokens copied verbatim from
  `../frontend/src/app/globals.css` so the panel belongs to the same product
- **lucide-react** icons · minimal motion (CSS transitions only)
- Typed API client `src/lib/api.ts`, built from `../backend/api.md` (incl. its `/admin/*`
  section), pointed at the **same backend** as the frontend

## Getting started

```bash
npm install
cp .env.example .env.local        # edit if the backend isn't on :4000
npm run dev                       # http://localhost:3100
```

The backend must be running and reachable at `NEXT_PUBLIC_API_BASE_URL`
(default `http://localhost:4000/api/v1`). For OAuth to work end to end, the backend needs, in
its `.env`:

```
ADMIN_URL=http://localhost:3100
CORS_ORIGINS=http://localhost:3000,http://localhost:3100
```

plus Google OAuth credentials. Sign-in starts at `GET {API}/auth/google?state=admin`; the
backend then redirects the callback to `ADMIN_URL/auth/callback` instead of the main frontend.

| Script | Purpose |
|---|---|
| `npm run dev` | Dev server on :3100 |
| `npm run build` | Production build |
| `npm run start` | Serve the production build on :3100 |
| `npm run lint` | ESLint |

---

## The first admin — set it directly in the database

**There is no public "become admin" flow, by design.** Every `/api/v1/admin/*` route already
requires the `admin` role, so the first one has to be granted out of band.

1. Sign in once through the normal OAuth flow (any Vault account, on the frontend or here) so
   the `User` row exists.
2. From the **backend** directory, run the one-line Prisma script that already ships there:

   ```bash
   cd ../backend
   npx ts-node scripts/promote-admin.ts you@example.com
   ```

   Equivalent manual SQL, if you prefer:

   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
   ```

3. Sign in to this panel. `GET /auth/me` now reports `role: "admin"` and the console loads.

After that, **existing admins promote other users from inside this panel** — open a user and
use *Make admin* (which calls `PATCH /users/:id`).

> The `User.suspendedAt` column and the `/admin/*` routes are new in this session. Run
> `npx prisma migrate dev --name add_user_suspension` in `../backend` once a database is
> reachable — no migration files are committed (same constraint as the rest of the backend).

---

## Access control

1. `/login` → `GET {API}/auth/google?state=admin` (GitHub shown only if the server doesn't 503).
2. Backend redirects to `/auth/callback?accessToken=…&refreshToken=…`.
3. The callback stores both tokens in `SameSite=Lax` cookies (`cv_admin_at`, `cv_admin_rt` —
   deliberately distinct from the frontend's `cv_at`/`cv_rt`, since a dev machine shares a
   cookie jar across ports) and loads `GET /auth/me`.
4. **If `role !== "admin"`**, the shell renders a full-screen *"You don't have access to this
   panel"* screen and nothing else. The panel UI is never partially rendered for a non-admin.
5. `src/proxy.ts` does an optimistic refresh-cookie presence check; `AdminShell` does the real
   role check. On a failed token refresh, tokens are cleared and the user is sent to `/login`.

## Route map

| Route | What |
|---|---|
| `/login`, `/auth/callback` | OAuth (admin `state`) |
| `/overview` | Platform stats + recent-activity feed (`GET /admin/stats`) |
| `/users`, `/users/[id]` | User table + detail; change role, suspend/reactivate |
| `/assets`, `/assets/[id]` | Platform-wide asset table + detail; hide/restore (moderation) |
| `/marketplace` | Listing table + approve/reject (**stub** — see below) |
| `/transactions` | Platform-wide transactions (**mock provider** — labelled) |
| `/system` | Which backend modules are live vs. stubbed (`GET /admin/system/status`) |

Every destructive or state-changing action (suspend, reactivate, change role, hide asset,
approve/reject listing) goes through an explicit confirmation dialog.

## Honest about stubs

- **Marketplace** is backend sample data. `GET /admin/marketplace/listings` returns the two
  fixtures; **Approve / Reject return `501 Not Implemented`** by design — the buttons exist so
  the review flow is ready when the real marketplace ships. The UI surfaces that response
  rather than faking success.
- **Transactions** are real database rows but every one has `isLive: false` — the backend runs
  `MockPaymentProvider` and no money moves (an amount ending in `.99` is a simulated decline).
- **`plan`** exists on users but no billing reads it.

## Backend endpoints this app relies on

New `/api/v1/admin/*` routes (all `@Roles(admin)`), documented in `../backend/api.md` and
`../backend/todo.md`:
`GET /admin/stats` · `GET /admin/users` · `GET /admin/users/:id` ·
`POST /admin/users/:id/suspend` · `/reactivate` · `GET /admin/assets` · `GET /admin/assets/:id` ·
`POST /admin/assets/:id/hide` · `/restore` · `GET /admin/marketplace/listings` ·
`POST /admin/marketplace/listings/:id/approve` · `/reject` · `GET /admin/transactions` ·
`GET /admin/system/status`. Plus `User.suspendedAt`, suspension enforcement in auth, and the
OAuth `state=admin` redirect.

See `todo.md` for phase-by-phase status.
