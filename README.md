# Creators' Vault

An intelligent digital asset management workspace for creators, designers and developers.
Collect, organize, connect and search every digital asset you work with — uploads, pasted
URLs, marketplace purchases, code snippets, fonts — in one place, with relationship tracking
("used in the AudioLux dashboard") and search by meaning, not just filename.

## Repository layout

| Folder | What it is | Stack | Port |
|---|---|---|---|
| [`backend/`](./backend) | REST API — the source of truth. 80 endpoints, 12 modules. Marketplace + payments are deliberate, frozen stubs. | NestJS · Prisma · PostgreSQL + pgvector | 4000 |
| [`frontend/`](./frontend) | The main app regular users interact with. Calm, progressive-disclosure UX. | Next.js 16 · Tailwind v4 | 3000 |
| [`admin/`](./admin) | Operators-only console — platform stats, user/asset oversight, moderation. Separate app, admin-role-gated. | Next.js 16 · Tailwind v4 | 3100 |

Both frontends are typed clients over the same backend, built from `backend/api.md` (the
authoritative API contract). Auth is Google OAuth; the admin app starts it with `?state=admin`
so its callback returns to `ADMIN_URL`.

## Running it

```bash
# 1. backend
cd backend && npm install
cp .env.example .env                 # set DATABASE_URL + Google OAuth creds
npx prisma migrate dev               # needs a running Postgres with pgvector
npm run start:dev                    # http://localhost:4000  (docs at /api/docs)

# 2. frontend        # 3. admin
cd frontend          cd admin
npm install          npm install
cp .env.example .env.local           (same)
npm run dev          npm run dev
# :3000              # :3100
```

The **first admin** is set directly in the database (no public "become admin" flow):
sign in once, then `cd backend && npx ts-node scripts/promote-admin.ts you@example.com`.
After that, admins promote others from inside the admin panel.

## Status

Backend: all phases complete. Frontend + admin: all phases complete, build/lint clean.
Marketplace and payments are intentionally stubbed (final schema/routes/DTOs, no real
processing) and every UI surfacing them says so. Per-project detail lives in each folder's
`todo.md` / `mission.md`.
