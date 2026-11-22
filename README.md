# Creators' Vault

**A workspace for creators, designers, and developers to collect, connect, and search every file and reference they work with.**

[Live App](https://creators-vault-storage.vercel.app)

---

## Why Creators' Vault

Regular cloud folders treat files like isolated items in a drawer. After a few weeks, you forget where a font came from, what license a sound clip has, or which project actually used an illustration.

Creators' Vault fixes that by keeping your uploads, URLs, fonts, design files, code snippets, notes, and purchases in one place—with context attached:

- **Link assets with context:** Connect any file to another asset or project with a plain note (e.g., *"used in the dashboard hero"* or *"v2 variation of the main logo"*).
- **Search by meaning, not just filenames:** Find assets using everyday descriptions like *"retro poster background"*, powered by PostgreSQL `pgvector` and embeddings.
- **Drop anything in:** Upload single files, unpack multi-file `.zip` archives into separate assets, save external URLs with automatic OpenGraph previews, or write quick Markdown notes.
- **Projects & auto-tagging:** Organize work into projects with custom covers and color swatches, backed by automatic tag suggestions.

---

## Project Structure

```text
creators-vault/
├── backend/    NestJS 11 REST API · Prisma · PostgreSQL (pgvector)
├── frontend/   Next.js 16 Web App · Tailwind CSS v4 · Motion
└── admin/      Role-gated moderation & analytics console
```

| App | Stack | Role |
| :--- | :--- | :--- |
| **`backend/`** | NestJS 11, Prisma ORM, PostgreSQL (`pgvector`), Passport JWT & Google OAuth | REST API covering auth, asset CRUD, similarity ranking, asset relationships, and storage. |
| **`frontend/`** | Next.js 16 (App Router), Tailwind CSS v4, Motion, Lucide | Main user workspace with light/dark mode and fast search/filtering. |
| **`admin/`** | Next.js 16, Tailwind CSS v4 | Internal moderation and analytics console for operators. |

---

## Engineering Highlights

- **Swappable providers:** Storage (local disk / S3), embeddings (local deterministic hashing / Gemini embeddings), and payments (mock / Stripe) sit behind clean provider interfaces.
- **Safe URL imports:** External link scraping runs through an SSRF-safe metadata fetcher that blocks loopback, private IP ranges, and internal metadata endpoints.
- **Soft deletes with quota sync:** Deleting an asset or project is non-destructive—items can be restored anytime, and storage quotas recalculate automatically.
- **Silent token rotation:** Refresh tokens rotate over `SameSite=Lax` cookies with automatic re-auth handling on expiry.

---

## Running Locally

**Prerequisites:** Node.js 20+, PostgreSQL with `pgvector` (or a free [Neon](https://neon.tech) database), and Google OAuth credentials.

```bash
# 1. Backend
cd backend
cp .env.example .env       # Fill in DATABASE_URL and OAuth keys
npm install
npx prisma db push
npm run start:dev

# 2. Frontend
cd ../frontend
cp .env.example .env.local # Point NEXT_PUBLIC_API_BASE_URL to your local API
npm install
npm run dev
```

Once running, API docs are available locally at `/api/docs`.

---

## License

MIT — see [LICENSE](./LICENSE) for details.
