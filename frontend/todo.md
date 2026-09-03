# Creators' Vault Frontend — Progress

Read this and `mission.md` at the start of every session. Resume from the first unfinished
phase. Do not redo finished work.

---

## Phase 0 — Setup — DONE

- Next.js 16.3 scaffold (App Router, TS, Tailwind v4, `src/`, `@/*` alias). `next build` green.
- Installed `motion`, `lucide-react`, `clsx`, `tailwind-merge`.
- UI/UX Pro Max skill installed locally + `--design-system` search run. Direction locked:
  Flat Design / Plus Jakarta Sans + JetBrains Mono / violet `#7C5CFF` brand + slate neutrals
  / emerald success / amber attention / red destructive / 150–220ms motion.
- `.env.local` + `.env.example` — `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1`.
- `globals.css` — full light + dark token set, reduced-motion, focus rings, scrollbars.
- `src/lib/types.ts` — every API object + query/input type from api.md.
- `src/lib/api.ts` — typed client for the whole surface the user app needs (health, auth,
  users/me, assets, projects, tags, relationships, search, extension tokens, marketplace,
  payments). Auto bearer, one refresh-rotation retry on 401, `ApiError` with status helpers.
  Admin-only `GET /users` / `PATCH /users/:id` intentionally omitted (admin panel scope).
- `src/lib/utils.ts` (formatters, enum labels), `src/lib/hooks.ts` (`useQuery`,
  `useMutation`, `useDebouncedValue`, `useQueryParams`).
- Providers: theme (class-based, no-flash inline script), toast (motion), auth.
- UI primitives: button, card, badge, skeleton/spinner, field (Input/Textarea/Select),
  empty-state/error-state, tabs, dialog/confirm-dialog, menu, pagination, stat-card, section.

## Phase 1 — Auth — DONE

- `/login` — Google + GitHub OAuth start (browser redirect to `{API}/auth/{provider}`),
  GitHub button hidden when server probe returns 503, `?expired` / `?error` messaging,
  `?next` stashed in sessionStorage for post-login redirect. Brand split-panel layout.
- `/auth/callback` — reads `accessToken` + `refreshToken` from query, `completeLogin`,
  redirects to stashed `next` or `/dashboard`; error UI when tokens missing.
- `src/lib/auth.tsx` — `AuthProvider` (bootstrap `GET /auth/me`, react to `cv:auth-expired`),
  `completeLogin`, `logout` (`/auth/logout`), `logoutEverywhere` (`/auth/logout-all`).
- `src/lib/auth-tokens.ts` — cookie storage (`cv_at`, `cv_rt`), SameSite=Lax.
- `src/proxy.ts` — optimistic route gate on the refresh cookie; `/` → `/login` or
  `/dashboard`; unauth → `/login?next=…`.
- App shell (`(app)/layout.tsx` → `AppShell`) — client guard + redirect, sidebar + topbar.
- Topbar user menu: Settings, Browser extension, Sign out, Sign out everywhere. Theme toggle.

## Phase 2 — Dashboard — DONE

- `/dashboard` — time-based greeting, prominent natural-language search bar (→ `/search?q=`).
- Quick stats: Total assets (`/assets` meta.total), Organized % (Σ project.assetCount ÷ total),
  Active projects (`/projects` meta.total), Needs attention (recent assets missing
  project/tags/description or `embeddingStatus: failed`).
- Sections: Recently added, Needs attention, Projects, Recently used — each scannable, with
  empty states and skeletons.

## Phase 3 — Assets: Ingestion — DONE

- `/assets/new` with tabs (URL param `mode`): Upload · From URL · Marketplace link · Note.
- `UploadForm` — drag-and-drop + browse, multi-file list with per-file size, remove, clear;
  `expandZip` toggle shown when a `.zip` is present; validates against `GET /assets/limits`
  (per-file size, count) and remaining quota before allowing submit; single-file → redirect
  to detail, multi → `IngestResult` summary. Builds `multipart/form-data`.
- `UrlImportForm` → `POST /assets/from-url`, `fetchMetadata` toggle, http(s) validation.
- `MarketplaceImportForm` → `POST /assets/from-marketplace-link` with hand-entered purchase
  record (platform, price, currency, date, order ref).
- `NoteForm` → `POST /assets` (title required).
- Shared `AssetMetaFields` (title, description, project+section, tags, and a collapsible
  Type/Category/License block). `TagInput` with live `/tags/suggest` chips (reason + "new"
  hints). `ProjectSelect`.

## Phase 4 — Assets: Browse & Detail — DONE

- `/assets` — URL-param-driven filters: q (debounced), type, source, license, project, tags,
  sort/order, grid|list view, trash (`deleted=1`). `AssetResults` (shared) with skeletons,
  error + empty states, pagination. `AssetCard` follows progressive disclosure (preview,
  title, type, source, one relationship = its project, "View Details").
- `/assets/[id]` — header (preview, title, badges, project chip, actions menu: edit / open
  file / open source / copy link / trash / restore) + trash banner. Tabs (URL param `tab`):
  Overview, Files, Relationships, Projects, Source, License, Versions, Activity.
  - Overview: description, tags, connections preview, at-a-glance facts, Similar assets.
  - Relationships: `GET /assets/:id/relationships`, add via `AddRelationshipDialog`
    (asset or project target, relation type, one-line reason), remove, expandable reasons.
  - Projects: move project/section (`PATCH /assets/:id`), sections from
    `GET /projects/:id/sections`, project-target edges.
  - License: inline editor; "documents are never parsed" note.
  - Versions: current `version` number + `version_of` edges (no history endpoint exists).
  - Activity: created/updated, `embeddingStatus` explained, trashed timestamp.
- `AssetEditDialog` reuses `AssetMetaFields` (tags sent as full replacement set).

## Phase 5 — Projects — DONE

- `/projects` — grid, "Show archived" toggle, sort, deleted view, create via
  `ProjectFormDialog` (name, description, hex colour swatches, cover URL).
- `/projects/[id]` — cover/colour header, stats, actions (edit / archive-unarchive /
  delete-restore) + archived & deleted banners. Assets grouped by `section` (collapsible,
  "Ungrouped" last), fetched `limit:100` with a "see all in Assets" fallback when truncated.
  `AddToProjectDialog` moves an existing asset in via `AssetPicker`.

## Phase 6 — Search & Similarity — DONE

- `/search` — prominent natural-language input, example chips. Keyword `/search` by default;
  "By meaning" toggle appears only when `GET /search/status` says `available`. Semantic view
  calls `POST /search/semantic`, shows score badges on cards, min-similarity slider, and
  surfaces `strategy: "keyword"` fallback + `fallbackReason`.
- `SimilarAssets` panel on the asset Overview tab (`GET /assets/:id/similar`, score labels,
  shows `reason` when empty).
- Relationship "why connected" reason text is one line, expandable (`RelationshipItem`).

## Phase 7 — Tags & Organization — DONE

- `/tags` — grid with colour dot + usage count, filter (debounced), "in use only", sort.
  Create/edit via `TagFormDialog` (rename-changes-slug warning, 409 handling). Delete with a
  confirm that names the detached-asset count. Each tag links to `/assets?tags=<slug>`.
- Auto-suggested tags surface subtly in `TagInput` during create/edit (Phase 3).

## Phase 8 — Marketplace & Payments (UI over stubs) — DONE

- `/marketplace` — `StubBanner` (honest "preview / no money moves", pulls
  `GET /payments/status`), sample listings grid with q / status / price-sort filters.
- `/marketplace/[id]` — listing detail, included items, `PurchasePanel`:
  `POST /marketplace/listings/:id/purchase` → mock session; "Open mock checkout page" +
  clearly-labelled "Simulate success/failure" test helpers (`POST /payments/webhook`,
  nudging `.99` for the decline path); links to transactions.
- `/settings/billing` — payments-status notice, transactions list (`GET /payments/transactions`),
  refund on `succeeded` (`POST /payments/transactions/:id/refund`), failure reasons shown.
- `/settings/extension` — extension token list / create (name + expiry) / one-time reveal /
  revoke.
- `/settings` — profile edit (`PATCH /users/me`), account facts, storage meter, "sign out
  everywhere".

## Phase 9 — Polish Pass — DONE

- Re-ran UI/UX Pro Max (`review` + pro-rules). Verified against its checklist: SVG icons
  only, cursor-pointer on clickables, 150–220ms hover transitions, visible focus rings,
  `prefers-reduced-motion` (CSS + `<MotionConfig reducedMotion="user">`), dark-mode tokens
  defined independently, responsive grids (sm/lg/xl), no horizontal body scroll.
- Added `app/not-found.tsx`, `(app)/error.tsx`, `(app)/loading.tsx`.
- Empty / loading / error states audited across every list and detail view.
- `next build` green (18 routes); `npm run lint` — 0 errors (13 warnings, see note below).
- README written.

---

## Blocked on backend (needs an endpoint not in api.md)
- **Asset version history** — only a `version` integer is exposed, no revision list. The
  Versions tab shows the number + `version_of` relationships instead.
- **"Unassigned assets" filter** — no `GET /assets` filter for "has no project". Dashboard
  "% organized" is approximated as Σ(project.assetCount) ÷ total; "Needs attention" scans the
  most recent 60 assets client-side.
- **Marketplace "my purchases" / owned listings** — no endpoint; not built.

## Deviations from plan
- Added a 4th ingestion mode, **Note** (`POST /assets`), alongside the three in the plan —
  it's a documented creation route and useful for references/placeholders.
- Marketplace purchase includes labelled **"simulate success/failure"** helpers (calling the
  public `POST /payments/webhook`) so the success and failure UIs are demonstrable. Framed as
  testing tools, not a real checkout, per the "mock success flow, not a fake checkout" rule.
- Extension-token management lives in **Settings** (in scope per mission: "the extension
  itself is not"); no extension is built.
- Newer `eslint-config-next` 16 React-Compiler lint rules (`set-state-in-effect`, `refs`,
  `purity`) downgraded to warnings — they flag deliberate, correct patterns (latest-ref,
  mount-time sync from URL/theme, fetch-in-effect). Documented in `eslint.config.mjs`.
