# Creators' Vault — Backend

Backend API for **Creators' Vault**, an intelligent digital asset management workspace for
creators, designers, developers and freelancers. Users collect, organize, connect and search
digital assets — Figma files, icons, illustrations, fonts, templates, code snippets, purchased
marketplace assets.

This repository is the **backend only**. A separate Next.js frontend and an admin panel will
consume it. Every route lives under `/api/v1`.

| Document | What it is |
|---|---|
| [`api.md`](./api.md) | **Start here if you are building the frontend.** All 65 endpoints, with request and response shapes. |
| [`mission.md`](./mission.md) | The master plan — the full phase breakdown, written once at the start. |
| [`todo.md`](./todo.md) | What each phase delivered, what was deferred, and why. |
| `docs/openapi.json` | OpenAPI 3.0 spec, generated from the running app. |
| `docs/creators-vault.postman_collection.json` | Postman collection, ready to import. |

---

## Stack

| Concern      | Choice                                                                  |
|--------------|-------------------------------------------------------------------------|
| Framework    | NestJS 10 (TypeScript)                                                  |
| Database     | PostgreSQL 16 + [`pgvector`](https://github.com/pgvector/pgvector)       |
| ORM          | Prisma 6                                                                |
| Auth         | Passport — Google OAuth 2.0 (required), GitHub OAuth (optional), JWT     |
| File storage | `StorageProvider` interface; local-disk implementation                   |
| Embeddings   | `EmbeddingProvider` interface; local + Gemini implementations            |
| Payments     | `PaymentProvider` interface; `MockPaymentProvider` only                  |
| Validation   | class-validator + class-transformer on every DTO                        |
| Docs         | `@nestjs/swagger` at `/api/docs`                                         |

---

## Running locally

### 1. Prerequisites

- Node.js 20+
- PostgreSQL 16 **with the `pgvector` extension available**

### 2. Database

The quickest route is the bundled compose file, which uses an image with pgvector already
compiled in:

```bash
docker compose up -d
```

That starts Postgres on `localhost:5432` with database `creators_vault`, user `vault`,
password `vault`, and creates the `vector` and `pg_trgm` extensions on first boot.

<details>
<summary>Without Docker</summary>

Install PostgreSQL 16 and pgvector, then:

```sql
CREATE DATABASE creators_vault;
CREATE USER vault WITH PASSWORD 'vault';
GRANT ALL PRIVILEGES ON DATABASE creators_vault TO vault;
\c creators_vault
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

On Windows, pgvector is easiest to get through the
[Stack Builder](https://www.postgresql.org/download/windows/) build, or by using the Docker
image above.
</details>

### 3. Environment

```bash
cp .env.example .env
```

Every variable the app reads is listed and commented in `.env.example`. Generate the two JWT
secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 4. Install, migrate, run

```bash
npm install
npx prisma migrate dev --name init   # first time only — creates prisma/migrations
npm run db:indexes                   # HNSW + trigram indexes Prisma cannot express
npm run start:dev
```

The API comes up on `http://localhost:4000`.

- **Interactive docs:** `http://localhost:4000/api/docs`
- **Is it healthy?** `GET /api/v1/health` reports whether the database and pgvector are reachable

> The server starts even when Postgres is unreachable — it logs the failure and `/health`
> reports `degraded`. That is deliberate: a health endpoint you cannot reach when the database is
> down would be useless.

### The environment variables that matter most

Full descriptions are in `.env.example`.

| Variable | Default | Notes |
|---|---|---|
| `DATABASE_URL` | — | **required** |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | — | **required**, and they must differ |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | — | required for login; see below |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | — | optional; blank disables GitHub only |
| `FRONTEND_URL` | `http://localhost:3000` | **set it blank to make OAuth return tokens as JSON** — that is how you test login without a frontend |
| `STORAGE_DRIVER` | `local` | only `local` is implemented |
| `EMBEDDING_DRIVER` | `local` | `local` or `gemini` |
| `GEMINI_API_KEY` | — | only read when `EMBEDDING_DRIVER=gemini` |
| `PAYMENT_DRIVER` | `mock` | only `mock` is implemented |
| `USER_STORAGE_QUOTA_MB` | `2048` | per-user storage quota |

---

## Google OAuth setup

Google login is the primary way into the product, so this has to work before anything else is
testable.

1. Open the [Google Cloud Console](https://console.cloud.google.com/) and create (or pick) a project.
2. **APIs & Services → OAuth consent screen** — choose *External*, fill in the app name and
   support email, and add your own Google account under *Test users*.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID → Web application**.
4. Under *Authorized redirect URIs* add exactly:
   `http://localhost:4000/api/v1/auth/google/callback`
5. Copy the client ID and secret into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`.

Then open `http://localhost:4000/api/v1/auth/google` in a browser.

> **To test without a frontend,** set `FRONTEND_URL=` (blank). The callback then returns the
> token JSON in the browser instead of redirecting, so you can copy the access token straight
> into Postman.

GitHub OAuth is optional and follows the same pattern
(**Settings → Developer settings → OAuth Apps**, callback
`http://localhost:4000/api/v1/auth/github/callback`). Leaving `GITHUB_CLIENT_ID` blank makes the
GitHub routes return 503 and **does not affect Google at all**.

### Becoming an admin

Every admin endpoint requires the admin role, so the first admin cannot be created through the
API. Sign in once with Google, then:

```bash
npx ts-node scripts/promote-admin.ts you@example.com
```

---

## Testing the API without a frontend

```bash
npm run postman:export   # writes docs/openapi.json + the Postman collection
```

Import `docs/creators-vault.postman_collection.json` into Postman. It has a folder per module, a
filled-in example body for every request, and every query filter pre-listed (disabled by
default). Set the collection variables:

| Variable | Value |
|---|---|
| `baseUrl` | `http://localhost:4000/api/v1` |
| `accessToken` | from the Google login |
| `extensionToken` | from `POST /extension/token` |

The collection is generated from the running application, so it cannot drift from the code.

---

## Module status

| Module        | Status | Notes |
|---------------|--------|-------|
| health        | ✅ Fully functional | reports DB + pgvector state |
| auth          | ✅ Fully functional | Google (required) + GitHub (optional), rotating refresh tokens |
| users         | ✅ Fully functional | profiles, roles, storage accounting |
| assets        | ✅ Fully functional | upload / URL / marketplace-link import, soft delete |
| projects      | ✅ Fully functional | CRUD, sections, archive, soft delete |
| tags          | ✅ Fully functional | CRUD + auto-suggest |
| relationships | ✅ Fully functional | the asset graph |
| search        | ✅ Fully functional | keyword, semantic, similarity |
| extension     | ✅ Fully functional | **backend only — the extension itself is not built** |
| marketplace   | ⚠️ **Stub by design** | schema + routes + DTOs final; reads return samples, writes return 501 |
| payments      | ⚠️ **Stub by design** | `MockPaymentProvider` only; transactions are real rows, no money moves |

`todo.md` records exactly what each phase delivered and what was deferred.

---

## Architecture notes

**Interface-first for anything that costs money or needs an external provider.** Business logic
depends on an interface, never on a concrete provider, so each of these is swapped by editing one
factory:

| Interface | Bound in | Implementations today |
|---|---|---|
| `StorageProvider` | `storage.module.ts` | `LocalDiskStorageProvider` |
| `EmbeddingProvider` | `embeddings.module.ts` | `LocalEmbeddingProvider`, `GeminiEmbeddingProvider` |
| `PaymentProvider` | `payments.module.ts` | `MockPaymentProvider` |

**One creation path for assets.** Upload, URL import, marketplace-link import and extension
capture all funnel through `AssetsService.createAsset()`, so tag resolution, ownership checks,
storage accounting and embedding indexing cannot drift between them.

**AI runs in the background at write time.** An asset is embedded once, when created. No search
request ever embeds a stored asset — `/search` embeds nothing, `/search/semantic` embeds only the
query, and `/assets/:id/similar` reuses the stored vector. Semantic search degrades to keyword
search rather than failing when a provider is unavailable.

**Guards are global.** `JwtAuthGuard` and `RolesGuard` are applied app-wide, so a new endpoint is
protected by default; opting out is explicit via `@Public()`.

**Assets and projects are soft-deleted, never destroyed.** Tags and relationships are hard-deleted
— they hold no content of their own.

### On the default embedding provider

`EMBEDDING_DRIVER=local` needs no API key and works offline. It uses feature hashing, which
measures **term overlap, not meaning** — excellent at near-duplicates and shared vocabulary, but
it does not know that "font" and "typeface" are related. Set `EMBEDDING_DRIVER=gemini` with a
free API key for true semantic matching. **The API contract is identical either way.**

---

## Scripts

| Command | What it does |
|---|---|
| `npm run start:dev` | run with hot reload |
| `npm run build` / `npm run start:prod` | compile / run compiled |
| `npm test` | unit tests |
| `npm run lint` | ESLint + Prettier, with `--fix` |
| `npx prisma migrate dev` | create and apply a migration |
| `npm run db:indexes` | apply the HNSW and trigram indexes |
| `npm run db:setup` | migrate + generate + indexes, for a fresh environment |
| `npm run postman:export` | regenerate `docs/openapi.json` and the Postman collection |
| `npx ts-node scripts/promote-admin.ts <email>` | grant the admin role |

---

## Deliberately not built

Real payment gateway integration · real marketplace transaction processing · the browser
extension itself (the backend capture endpoint **is** built) · Google Drive / Dropbox sync ·
license document parsing or AI interpretation · any frontend or admin UI.

The marketplace and payment **database schema, routes and DTOs are final**, so implementing them
later is additive rather than a rewrite. Adding Stripe means writing one provider class and
changing one line in `payments.module.ts`.
