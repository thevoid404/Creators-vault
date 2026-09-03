import type { ModuleStatusDto } from './dto/admin.dto';

/**
 * The backend's own account of which modules are fully live vs. intentionally
 * stubbed. It lives here — next to `api.md` and `todo.md` — rather than being
 * hardcoded in the admin panel, so the admin panel's System Status page stays
 * accurate as the backend evolves: update this list when a module's status
 * changes and the panel follows.
 *
 * Cross-reference: `../../todo.md` (final module table) and `../../api.md`.
 */
export const SYSTEM_MODULES: ModuleStatusDto[] = [
  {
    key: 'health',
    name: 'Health',
    status: 'live',
    endpoints: 1,
    note: 'Liveness plus database and pgvector dependency checks.',
  },
  {
    key: 'auth',
    name: 'Auth',
    status: 'live',
    endpoints: 8,
    note: 'Google OAuth (mandatory) + GitHub (optional). Rotating refresh tokens, global guards.',
  },
  {
    key: 'users',
    name: 'Users',
    status: 'live',
    endpoints: 5,
    note: 'Profiles, admin role/plan management, and admin account suspension.',
  },
  {
    key: 'assets',
    name: 'Assets',
    status: 'live',
    endpoints: 10,
    note: 'CRUD and all four ingestion routes. Soft delete only — assets are never hard-deleted.',
  },
  {
    key: 'projects',
    name: 'Projects',
    status: 'live',
    endpoints: 10,
    note: 'CRUD, archive/unarchive, soft delete/restore, derived sections.',
  },
  {
    key: 'tags',
    name: 'Tags',
    status: 'live',
    endpoints: 6,
    note: 'Per-user tags, idempotent create, auto-suggest. Hard-deleted (detach only).',
  },
  {
    key: 'relationships',
    name: 'Relationships',
    status: 'live',
    endpoints: 6,
    note: 'Directed asset/project edge graph with free-text reasons. Direct neighbours only.',
  },
  {
    key: 'search',
    name: 'Search & Similarity',
    status: 'live',
    endpoints: 5,
    note: 'Keyword + semantic search + "more like this". Local embedding driver by default; degrades to keyword, never fails.',
  },
  {
    key: 'extension',
    name: 'Browser-extension capture',
    status: 'backend-only',
    endpoints: 5,
    note: 'The API a browser extension would call is built and live. The extension itself is not part of this project.',
  },
  {
    key: 'marketplace',
    name: 'Marketplace',
    status: 'stub',
    endpoints: 6,
    note: 'Deliberate stub. Read endpoints return two sample listings (isStub: true); write endpoints return 501. Schema, routes and DTOs are final.',
  },
  {
    key: 'payments',
    name: 'Payments',
    status: 'stub',
    endpoints: 6,
    note: 'Deliberate stub. MockPaymentProvider is the only implementation — transactions are real rows but isLive: false and no money moves. An amount ending in .99 declines.',
  },
  {
    key: 'admin',
    name: 'Admin',
    status: 'live',
    endpoints: 12,
    note: 'This panel’s backend: platform stats, user/asset oversight, moderation, marketplace & transaction views, and this status list.',
  },
];
