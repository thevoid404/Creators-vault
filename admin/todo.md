# Creators' Vault Admin Panel — Progress

Phase plan: [`mission.md`](./mission.md). API contract: [`../backend/api.md`](../backend/api.md)
(there is no `api.md` here — always read the backend's).

**Current position: 🎉 All 7 phases complete. Build, lint and dev-serve clean.**

- Next.js 16 + TS + Tailwind v4 on `:3100`, tokens shared with the frontend.
- 8 screens, admin-role-gated. 15 new `/api/v1/admin/*` backend endpoints, all documented in
  `../backend/api.md` and `../backend/todo.md`.
- `npm run build` ✓ · `npx eslint src` ✓ (0 errors; the 7 warnings are the same deliberate
  `react-hooks/*` patterns the main frontend also downgrades to warn) · `npm run dev` serves
  `/login` and redirects `/` correctly.

---

## ✅ Phase 0 — Setup

- Scaffold: `package.json` (`dev` on port 3100), `tsconfig.json`, `next.config.ts`,
  `postcss.config.mjs`, `eslint.config.mjs`, `.gitignore`, `.env.local` / `.env.example`
  (`NEXT_PUBLIC_API_BASE_URL`).
- `src/app/globals.css` — palette, tokens and typography (Plus Jakarta Sans + JetBrains Mono,
  violet `#7C5CFF`, slate neutrals, emerald/amber/red) **copied verbatim** from
  `../frontend/src/app/globals.css`. Added a `.nums` tabular-numeral utility and a louder
  focus ring; dropped the frontend's consumer-only bits.
- Design search: ran UI/UX Pro Max on dashboard / data-table / admin-back-office UX. Confirmed
  the direction — persistent sidebar + top bar, dense tables with **sticky headers**, an
  `overflow-x-auto` wrapper on every table, URL-driven filter/sort/page state (deep linking),
  bulk visibility, static status badges (never colour alone), explicit confirms for
  destructive actions, visible focus. Palette/type stays the frontend's per the brief.
- `src/lib/api.ts` — typed client from `api.md` (+ the new `/admin/*` section), 401 →
  one refresh rotation → retry, then `cv-admin:auth-expired`.
- `src/lib/types.ts` — request/response shapes, incl. `PlatformStats`, `AdminUserDetail`,
  `SystemStatus`, `ModuleStatus`, and `User.suspendedAt`.
- Providers: theme (own `cv-admin-theme` key), toast (CSS only, no motion), auth.
- UI primitives: `button`, `badge`, `card`, `input`/`select`/`search`, `dialog` + `ConfirmDialog`,
  `pagination`, `empty-state` + `ErrorState`, `skeleton` + `TableSkeleton`, `stat-card`,
  `page-header`, `menu`, `notice` (`StubNotice`), and the core `data-table` (sortable sticky
  header, horizontal scroll, loading/empty/error states, pagination footer).
- `README.md` with the **first-admin DB-seeding** instructions
  (`../backend/scripts/promote-admin.ts`), the migration note, and the access-control flow.

## ✅ Phase 1 — Auth & Access Control

- `/login` → `GET {API}/auth/google?state=admin` (GitHub shown only if the server doesn't 503).
- `/auth/callback` stores tokens in **distinct** cookies (`cv_admin_at` / `cv_admin_rt` — a dev
  machine shares a cookie jar across ports), loads `/auth/me`, and **checks `role === 'admin'`**.
- `AdminShell` renders a full-screen `<AccessDenied />` for an authenticated non-admin — the
  panel UI is never partially rendered. `src/proxy.ts` does the optimistic cookie gate.
- Sign-out + sign-out-everywhere in the top-bar menu. `cv-admin:auth-expired` → `/login`.
- Backend: OAuth `state=admin` round-trips through the provider; `completeOAuth` redirects to
  `ADMIN_URL` for it. `ADMIN_URL` config + CORS entry added.

## ✅ Phase 2 — Overview Dashboard

- `/overview` — `GET /admin/stats`: users (with admin/suspended split), assets (with hidden
  count), projects, total storage, active listings, transaction count, each in a `StatCard`.
- Recent-activity feed (signups + uploads, newest first).
- `StubNotice` spells out that the listing and transaction figures are stub/mock.

## ✅ Phase 3 — User Management

- `/users` — `DataTable` over `GET /admin/users`. Search (name/email), filters (role, plan,
  active|suspended), sortable columns (storage, joined), pagination — all in the URL.
- `/users/[id]` — `GET /admin/users/:id`: identity, badges, asset/project/tag/transaction
  counts, recent assets (linking into `/assets?ownerId=`).
- Actions, each behind `ConfirmDialog` + toast + refetch: **Make admin / Demote**
  (`PATCH /users/:id`), **Suspend / Reactivate** (`POST /admin/users/:id/suspend|reactivate`).

## ✅ Phase 4 — Asset Oversight

- `/assets` — `DataTable` over `GET /admin/assets` (any owner). Search, filters (type, source,
  owner chip from URL), Show hidden / Show live toggle, sortable columns, pagination.
- `/assets/[id]` — `GET /admin/assets/:id`: preview, full metadata table, tags, source URL,
  purchase info, owner link.
- Moderation: **Hide / Restore** (`POST /admin/assets/:id/hide|restore`) — soft-delete matching
  the backend pattern (owner storage total adjusted), behind `ConfirmDialog`.

## ✅ Phase 5 — Marketplace & Transactions Oversight

- `/marketplace` — `GET /admin/marketplace/listings` (the two stub samples), "pending review
  only" toggle, status badges. **Approve / Reject** buttons call
  `POST /admin/marketplace/listings/:id/approve|reject`; the backend returns an honest `501`
  (marketplace is a stub), and the UI surfaces that as an info toast rather than faking
  success. `StubNotice` explains why.
- `/transactions` — `DataTable` over `GET /admin/transactions` (platform-wide). Status filter,
  sortable columns, `Mock`/`Live` column, failure reasons inline. `StubNotice` names
  `MockPaymentProvider` and the `.99` decline rule.

## ✅ Phase 6 — System / Module Status

- `/system` — `GET /admin/system/status`. Module table (live / stub / backend-only, endpoint
  counts, notes) driven by the backend's `src/admin/system-modules.ts` so it stays accurate.
  Plus database + payments cards from the bundled `/health` and `/payments/status` payloads.

## ✅ Phase 7 — Polish Pass

- Visual language checked against the frontend — same tokens, same badge/card/button idiom,
  denser spacing.
- Table usability: sticky headers, `overflow-x-auto`, sensible default sort (`createdAt desc`),
  `TableSkeleton` on first load, `EmptyState` per filter context, `ErrorState` with retry.
- Every state-changing action (suspend, reactivate, role change, hide/restore asset,
  approve/reject listing) routes through `ConfirmDialog`.
- Responsive: sidebar collapses to a drawer below `lg`; tables scroll horizontally; pages cap
  at `max-w-[1400px]`. Mobile-first was explicitly not a priority.
- `not-found.tsx`, `(panel)/error.tsx`.

---

## Backend endpoints added this session

New `admin` module in `../backend/src/admin/` — 15 routes, `@Roles(admin)` on the controller,
composing platform-wide views over the existing module services. Full detail in
`../backend/todo.md` and `../backend/api.md`. Summary:

`GET /admin/stats` · `GET /admin/users` · `GET /admin/users/:id` ·
`POST /admin/users/:id/suspend` · `/reactivate` · `GET /admin/assets` · `GET /admin/assets/:id` ·
`POST /admin/assets/:id/hide` · `/restore` · `GET /admin/marketplace/listings` ·
`POST /admin/marketplace/listings/:id/approve` · `/reject` (501, stub-consistent) ·
`GET /admin/transactions` · `GET /admin/system/status`.

Plus: `User.suspendedAt` column + `@@index`; suspension enforced in `JwtStrategy`,
`AuthService.refresh`, `UsersService.findOrCreateFromOAuth`; `UserResponseDto.suspendedAt`;
OAuth `state=admin` redirect; `ADMIN_URL` config + CORS.
Backend `npm run build` / `eslint` clean, 59 tests still pass, all 15 routes map.

## Deferred / notes

- **Not exercised against a live database.** No Postgres is reachable on this machine (same
  constraint the backend records for every one of its phases). The full request path — OAuth,
  the admin role check, every `/admin/*` query — is code-complete and compiles; a run-through
  needs a database plus `npx prisma migrate dev --name add_user_suspension` in `../backend`
  and one `promote-admin.ts` run. The Postman collection in the backend makes that a click.
- **Browser screenshot skipped** — the Claude browser extension isn't connected in this
  environment. `npm run dev` was verified to serve `/login` (200) and redirect `/` (307).
- Marketplace approve/reject are intentionally `501` — the backend marketplace holds no
  listing rows and a fake success would be worse than an honest not-implemented (matching the
  existing listing-write behaviour). The review UI is ready for when the real marketplace ships.
- Suspension relies on the per-request user re-read rather than proactively revoking refresh
  tokens. Instant session kill would be a one-line `revokeAllForUser` call on suspend.
- No bulk actions (multi-select + action bar). The spec calls for "bulk visibility" (scan many
  rows at once), which the dense tables give; bulk *mutations* were not requested and each
  destructive action wants its own confirm anyway.
- `next dev` regenerates `AGENTS.md` / `CLAUDE.md` in this folder (the "not the Next.js you
  know" block) — committed alongside the work to keep the tree clean, same as the frontend.
