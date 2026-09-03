# Creators' Vault — Frontend Mission

**Master plan. Written once at project start. Does not change.**
Progress is tracked in `todo.md`. The API contract is the backend's `../backend/api.md`
(the frontend has no `api.md` of its own — always read the backend's).

---

## Product

The primary user-facing web app for **Creators' Vault** — an intelligent digital asset
management workspace for creators, designers, developers and freelancers. Users collect,
organize, connect and search digital assets (Figma files, icons, fonts, code snippets,
purchased marketplace assets, etc.).

**This session builds ONLY the main web app that regular users interact with.**
No admin panel (separate future prompt). No browser extension UI. No real payment gateway
flow. No cloud-drive import.

---

## Tech stack

| Concern     | Choice                                                          |
|-------------|----------------------------------------------------------------|
| Framework   | Next.js 16 (App Router, TypeScript, `src/`)                     |
| Styling     | Tailwind CSS v4 (`@theme` tokens in `globals.css`)              |
| Animation   | `motion` (modern Framer Motion) — purposeful use only          |
| Icons       | `lucide-react` (SVG, never emoji)                               |
| API layer   | Single typed client `src/lib/api.ts` — all calls go through it  |
| Auth        | Backend Google/GitHub OAuth → redirect back with tokens in query|
| Route guard | `src/proxy.ts` (Next 16 middleware) reads refresh-token cookie  |

## Design system (locked in Phase 0 via UI/UX Pro Max `--design-system`)

- **Style:** Flat Design — clean, minimal, low shadow, typography-first, SaaS dashboard.
- **Typography:** Plus Jakarta Sans (UI), JetBrains Mono (code snippets / IDs).
- **Palette:** Violet brand primary `#7C5CFF` (matches backend default project/tag color),
  slate neutrals, emerald = success/accent, amber = "needs attention", red = destructive.
  Full light + dark token sets in `globals.css`.
- **Motion:** 150–220ms ease transitions; animate only page transitions, hover/tap feedback,
  expanding detail panels, and drag-and-drop upload feedback. `prefers-reduced-motion` honored.
- **Core UX principle — Progressive Disclosure:** card/list views show only essentials
  (title, type, source, one key relationship, preview + "View Details"); detail views reveal
  everything progressively via tabs. "Why connected?" = one plain-text line, expandable.

---

## Phases (execute strictly in order)

### Phase 0 — Setup
Next.js + TS + Tailwind scaffold. Install `motion`. Run UI/UX Pro Max `--design-system` and
lock the visual direction. Build `src/lib/api.ts` typed client from `backend/api.md` covering
every endpoint. `.env.local` / `.env.example` with `NEXT_PUBLIC_API_BASE_URL`. Design tokens,
base UI primitives, providers (theme, toast, auth).
*Delivers:* installable, buildable project; typed API client; design system.

### Phase 1 — Auth
"Sign in with Google" (and GitHub when available) → `GET {API}/auth/google` redirect.
`/auth/callback` reads `accessToken` + `refreshToken` from query, stores them (cookies so the
proxy can read them + in-memory context), loads `/auth/me`. Refresh-token rotation on 401
in the API client (retry once). `proxy.ts` protected-route wrapper. Sign-out (`/auth/logout`)
and "sign out everywhere" (`/auth/logout-all`). 503 handling when a provider is not configured.
*Delivers:* working login you can drive from a browser.

### Phase 2 — Dashboard / Home
Calm overview: greeting + quick stats (total assets, % organized, active projects, new
updates), prominent global search bar, and scannable sections — Recently Added, Projects,
Needs Attention (e.g. untagged / no project / failed embedding), Recently Used.
*Delivers:* the home screen per the progressive-disclosure spec.

### Phase 3 — Assets: Ingestion
`/assets/new` with three modes: drag-and-drop upload (files / folder-as-zip via `expandZip`,
multi-file, respects `GET /assets/limits`), "Import from URL" (`/assets/from-url`), "Import
from Marketplace Link" (`/assets/from-marketplace-link` with manual purchase fields). Clear
loading / success / error states. Auto-suggested tags via `/tags/suggest` shown subtly.
*Delivers:* every ingestion route wired with proper feedback.

### Phase 4 — Assets: Browse & Detail
Asset grid/list (card pattern: preview, title, type, source, one relationship, "View
Details"). Filter (type, sourceType, licenseType, category, tags, project, section) + sort +
search + trash view. Detail page with tabbed progressive disclosure: Overview, Files,
Relationships, Projects, Source, License, Versions, Activity. Edit, soft-delete, restore.
*Delivers:* full asset browsing and detail.

### Phase 5 — Projects
Project list (grid, archived toggle, trash). Create / edit / archive / delete / restore.
Project detail: cover/color header, stats, sections (`GET /projects/:id/sections`) each
listing its assets (`GET /projects/:id/assets?section=`), move assets between sections.
*Delivers:* the organization layer over assets.

### Phase 6 — Search & Similarity
Prominent global search (natural-language styled). Keyword `/search` default; semantic
`/search/semantic` tab shown only when `/search/status` says available, with `strategy` /
`fallbackReason` surfaced. Results view with filters. "Similar Assets" panel
(`/assets/:id/similar`) with similarity score. Relationships with short expandable
"why connected" reason text.
*Delivers:* search + similarity + relationship reasons.

### Phase 7 — Tags & Organization
Tag management (list, create, rename/recolor, delete with detached-count confirmation).
Tag-based filtering across assets. Auto-suggested tags surfaced subtly during asset
create/edit (`/tags/suggest`, showing `reason` / `exists`).
*Delivers:* the tag layer.

### Phase 8 — Marketplace & Payments (UI for existing stubs only)
Browse listings (`/marketplace/listings` — sample data, honestly labelled "Preview /
coming soon"). Listing detail. Placeholder purchase flow calling
`/marketplace/listings/:id/purchase` → mock checkout; webhook-simulated completion is
out of scope for UI, but show transaction status. Payments status banner
(`/payments/status`). Transactions list (`/payments/transactions`) + refund on the mock.
Nothing that looks like a real checkout.
*Delivers:* honest UI over the frozen stub contract.

### Phase 9 — Polish Pass
Re-run UI/UX Pro Max (`review` / relevant domains). Fill in meaningful motion. Audit empty
states, loading skeletons, error states, responsive behaviour (375/768/1024/1440), and
accessibility basics (contrast, focus rings, keyboard nav, aria labels, reduced motion).
Final `todo.md` sync.
*Delivers:* a shippable primary web app.

---

## Not in scope this session
- Admin panel
- Browser extension UI (extension-token management UI lives in Settings — that is in scope;
  the extension itself is not)
- Real payment gateway checkout
- Google Drive / Dropbox import
- Any endpoint not documented in `../backend/api.md` — flag as blocked in `todo.md`, never
  build against a guessed shape.
