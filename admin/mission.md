# Creators' Vault — Admin Panel Mission

**Master plan. Written once at project start. Does not change.**
Progress is tracked in `todo.md`. The API contract is the backend's `../backend/api.md`
(this app has no `api.md` of its own — always read the backend's). Any admin endpoint added
to the backend is documented there and in `../backend/todo.md`, not just here.

---

## Product

A **separate** internal web app for Creators' Vault platform operators only. Regular users
never see or reach it. It observes and manages what the backend and the main frontend already
produce — it is not a second product and adds no consumer-facing features.

Sibling layout:

```
/creators-vault/Creators-vault
  /backend    ← already built (NestJS, documented in api.md)
  /frontend   ← already built (main user-facing app, :3000)
  /admin      ← this app (:3100)
```

Separate app, not a route in the main frontend: cleaner security boundary — separate deploy,
separate access control, no admin code/bundles shipping to regular users.

---

## Tech stack

| Concern     | Choice                                                             |
|-------------|-------------------------------------------------------------------|
| Framework   | Next.js 16 (App Router, TypeScript, `src/`) — same as the frontend |
| Styling     | Tailwind CSS v4 (`@theme` tokens in `globals.css`)                 |
| Animation   | Minimal to none — speed and clarity over motion                    |
| Icons       | `lucide-react` (SVG, never emoji)                                  |
| API layer   | Single typed client `src/lib/api.ts`, built from `backend/api.md`  |
| Auth        | Backend Google OAuth → callback with tokens → **verify `role === 'admin'`** |
| Route guard | `src/proxy.ts` (Next 16 proxy) reads the refresh-token cookie      |

## Design system (reused from the frontend's locked Phase 0 — same product)

- **Palette / tokens / typography copied verbatim from `../frontend/src/app/globals.css`:**
  violet brand `#7C5CFF`, slate neutrals, emerald/amber/red semantics, Plus Jakarta Sans (UI)
  + JetBrains Mono (IDs/numbers). Full light + dark sets.
- **Different information architecture from the frontend.** The frontend optimizes for calm
  progressive disclosure for casual users. This panel is for power users who want density,
  fast scanning and quick action:
  - **Data tables are the primary UI element** — sortable columns, filters, search-within-table,
    pagination, sticky headers. Data is not hidden behind extra clicks.
  - **Bulk visibility over storytelling** — scan 50 rows at once.
  - **Every destructive / state-changing action has an explicit confirmation step** — suspend,
    reactivate, change role, hide asset, approve/reject listing. No accidental irreversible clicks.
  - **Honest labelling of stub data** — marketplace listings and transactions are backed by the
    backend's stub/mock providers; the UI says so plainly.
  - Same visual language, tuned for scanning and control rather than delight. Lightweight —
    an internal tool, not a marketing surface.

---

## Phases (execute strictly in order; finish one before starting the next)

### Phase 0 — Setup
Next.js + TS + Tailwind scaffold on `:3100`. Copy the frontend's design tokens into
`globals.css`. Run the UI/UX Pro Max search on dashboard / data-table / admin-back-office
patterns to set layout direction (persistent sidebar nav + top bar). Build `src/lib/api.ts`
typed client from `backend/api.md` (every endpoint the panel needs, incl. the new `/admin/*`
routes). `.env.local` / `.env.example` with `NEXT_PUBLIC_API_BASE_URL`. Base UI primitives,
providers (theme, toast, auth), `README.md` with the **first-admin DB-seeding** instructions.
*Delivers:* installable, buildable project; typed API client; design system; README.

### Phase 1 — Auth & Access Control
"Sign in with Google" → `GET {API}/auth/google?state=admin` (backend redirects the admin
`state` back to `ADMIN_URL/auth/callback`). Callback stores tokens, loads `/auth/me`, and
**checks `role === 'admin'`**. Non-admins get a full-screen "You don't have access to this
panel" screen and nothing else renders. Session handling, refresh-token rotation on 401,
sign-out, sign-out-everywhere. `proxy.ts` presence gate.
*Delivers:* an admin-only login you can drive from a browser.

### Phase 2 — Overview Dashboard
Platform-wide stats at a glance from `GET /admin/stats`: total users, total assets, total
projects, total storage used, active marketplace listings, transaction count (labelled as
stub/mock honestly). Plus a recent-activity feed: recent signups, recent asset uploads,
recent listings.
*Delivers:* the operational overview screen.

### Phase 3 — User Management
Searchable / filterable / paginated user table (name, email, plan, role, join date, storage
used) from `GET /users` (+ `GET /admin/users` for suspension state). User detail view
(`GET /admin/users/:id`) showing their assets/projects at a glance. Actions with confirmation:
change role (promote/demote admin, `PATCH /users/:id`), suspend / reactivate account
(`POST /admin/users/:id/suspend` · `/reactivate`).
*Delivers:* full user oversight and control.

### Phase 4 — Asset Oversight
Platform-wide asset table (`GET /admin/assets`) — filter by type, source, owner, date; search.
Asset detail view (`GET /admin/assets/:id`). Moderation action to hide/remove an asset
(`POST /admin/assets/:id/hide` — soft-delete, matching the backend's existing soft-delete
pattern) and un-hide (`/restore`), each with a confirmation step.
*Delivers:* platform-wide asset visibility and moderation.

### Phase 5 — Marketplace & Transactions Oversight
Table of marketplace listings with status (`GET /admin/marketplace/listings` — stub data,
labelled). Approve / reject action (`POST /admin/marketplace/listings/:id/approve` · `/reject`)
— the backend marketplace is a stub, so these follow its convention (honest "not implemented
in this build" response); the UI shows the action and surfaces that response. Table of
transactions (`GET /admin/transactions`) clearly labelled as mock/stub data (the backend's
`MockPaymentProvider` state), for visibility into the eventual real-payments flow.
*Delivers:* honest oversight of the frozen stub contract.

### Phase 6 — System / Module Status Page
A page listing which backend modules are fully live vs. intentionally stubbed (marketplace,
payments, extension capture, etc.), served by `GET /admin/system/status` — the status list
lives in the **backend** (alongside `todo.md`/`api.md`) so it stays accurate as the backend
evolves, rather than being hardcoded in this app. Also surfaces `GET /health` and
`GET /payments/status`.
*Delivers:* project status at a glance without opening the backend repo.

### Phase 7 — Polish Pass
Consistency check against the frontend's visual language. Table usability: sticky headers,
sensible default sorts, empty states, loading skeletons. Confirm every destructive action has
a confirmation. Responsive check to at least tablet width (mobile is not a priority for an
admin panel). Final `todo.md` sync.
*Delivers:* a shippable internal tool.

---

## Backend endpoints this session adds (RolesGuard `@Roles(admin)`, versioned `/api/v1/admin/*`)

All added to `../backend/src/admin/*`, following the established DTO + RolesGuard + paginated
envelope patterns, and documented in `../backend/api.md` + `../backend/todo.md`.

- `GET /admin/stats` — platform counts + recent-activity feed
- `GET /admin/users` — user list incl. `suspendedAt` + asset/project counts
- `GET /admin/users/:id` — user detail: profile, counts, recent assets/projects
- `POST /admin/users/:id/suspend` · `POST /admin/users/:id/reactivate`
- `GET /admin/assets` — platform-wide asset list (any owner)
- `GET /admin/assets/:id` — asset detail (any owner)
- `POST /admin/assets/:id/hide` · `POST /admin/assets/:id/restore` — admin soft-delete / restore
- `GET /admin/marketplace/listings` — admin listing view (stub data)
- `POST /admin/marketplace/listings/:id/approve` · `/reject` — stub-consistent
- `GET /admin/transactions` — platform-wide transactions (real rows, stub provider)
- `GET /admin/system/status` — backend module live/stub status

Plus: `User.suspendedAt` column (schema + migration note); suspension enforced in
`JwtStrategy`, `AuthService.refresh` and OAuth login; OAuth `state=admin` redirect support;
`ADMIN_URL` config + CORS.

---

## Not in scope this session
- Any new consumer-facing feature — this app only manages/observes.
- Real payment gateway integration — Phase 5 shows existing stub/mock data honestly.
- Analytics/BI reporting (charts, exports, cohort analysis) — simple counts and tables only.
- Email / notification system for admin alerts.
- Any endpoint not in `../backend/api.md` after this session's additions — flag as blocked in
  `todo.md`, never build against a guessed shape.
