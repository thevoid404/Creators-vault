# Creators' Vault

> An intelligent digital asset management (DAM) workspace built for creators, designers, and developers.

Collect, organize, connect, and search every creative file and inspiration you work with — uploads, pasted URLs, fonts, design files, code snippets, notes, and purchases — in one unified place, with relationship tracking and semantic vector search.

---

## 🌟 Why Creators' Vault?

Traditional cloud folders and drives treat your files like isolated items in a filing cabinet. You forget where you downloaded a font from, what license a sound effect has, or which project actually used an illustration.

**Creators' Vault changes that:**
* **Relationships over Folders:** Link any asset to another asset or project with a human explanation (e.g., *"used in the AudioLux dashboard hero"* or *"derivative variation of logo v1"*).
* **Search by Meaning (Semantic AI):** Search using everyday natural language (e.g., *"retro futuristic poster background"*). Powered by `pgvector` and Gemini embeddings, it matches context, not just file names.
* **Flexible Ingestion:** Drag-and-drop single files, unpack multi-file `.zip` archives into individual assets, import external URLs with automated OpenGraph metadata extraction, or log quick markdown notes.
* **Smart Projects & Auto-Tags:** Group your work into custom projects with visual covers and color swatches, with automatic tag suggestions based on keyword extraction and asset co-occurrence.

---

## 🏗️ System Architecture & Workspace Layout

```
creators-vault/
├── backend/    # NestJS REST API · Prisma · PostgreSQL + pgvector (Port 4000)
├── frontend/   # Next.js 16 Web App · Tailwind v4 · Lucide (Port 3000)
└── admin/      # Operators-only moderation console (Port 3100)
```

| Component | Stack | Purpose |
|---|---|---|
| **`backend/`** | **NestJS 11**, Prisma ORM, PostgreSQL (`pgvector`), Passport JWT/OAuth | Core REST API (80 endpoints) providing auth, asset CRUD, similarity ranking, relationships, and file storage. |
| **`frontend/`** | **Next.js 16** (App Router), Tailwind CSS v4, Motion | The main web application for end users with progressive disclosure UX, dark/light mode, and real-time feedback. |
| **`admin/`** | **Next.js 16**, Tailwind CSS v4 | Role-gated moderation and analytics portal for operators. |

---

## 🚀 Quick Start (Local Development)

### Prerequisites
* **Node.js**: v20 or v22+
* **PostgreSQL**: with the `pgvector` extension installed (or use a free [Neon](https://neon.tech) cloud database)
* **Google OAuth Credentials**: from [Google Cloud Console](https://console.cloud.google.com/)

---

### 1. Backend Setup

```bash
cd backend
npm install

# Create and configure environment variables
cp .env.example .env
```

Open `.env` and fill in:
* `DATABASE_URL`: PostgreSQL connection string with `pgvector` enabled.
* `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: OAuth credentials.
* `GOOGLE_CALLBACK_URL`: `http://localhost:4000/api/v1/auth/google/callback`
* `FRONTEND_URL`: `http://localhost:3000`

Push database schema and start the dev server:
```bash
npx prisma db push
npm run start:dev
```
* API is live at `http://localhost:4000`
* Interactive Swagger Docs available at `http://localhost:4000/api/docs`

---

### 2. Frontend Setup

```bash
cd frontend
npm install

# Create environment configuration
cp .env.example .env.local
```

Ensure `frontend/.env.local` points to your backend:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
```

Start the frontend app:
```bash
npm run dev
```
* Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔐 Google OAuth Configuration Guide

When creating your **OAuth 2.0 Client ID** in Google Cloud Console:

1. **Authorized JavaScript Origins:**
   * Local: `http://localhost:3000`, `http://localhost:4000`
   * Production: `https://creators-vault-storage.vercel.app`, `https://creators-vault.onrender.com`

2. **Authorized Redirect URIs:**
   * Local: `http://localhost:4000/api/v1/auth/google/callback`
   * Production: `https://creators-vault.onrender.com/api/v1/auth/google/callback`

> **Note:** The redirect URI points directly to the **backend** callback, which validates the credentials and redirects to your frontend with secure session tokens.

---

## ☁️ Live Cloud Deployment Reference

* **Frontend (Vercel):** `https://creators-vault-storage.vercel.app`
* **Backend (Render):** `https://creators-vault.onrender.com`
* **Database:** Neon Serverless PostgreSQL with `pgvector`

### Important Production Settings

* **On Render (Backend):**
  * **Root Directory:** `backend`
  * **Build Command:** `npm install --include=dev && npx prisma generate && npm run build`
  * **Start Command:** `node dist/main.js` (or `npm run start:prod`)
* **On Vercel (Frontend):**
  * Set `NEXT_PUBLIC_API_BASE_URL` to `https://creators-vault.onrender.com/api/v1`

---

## 🧩 Architectural Highlights

* **Plug-and-Play Providers:** Abstracted interfaces for `StorageProvider` (local disk vs. S3), `EmbeddingProvider` (deterministic local hashing vs. Google Gemini `text-embedding-004`), and `PaymentProvider` (mock vs. Stripe).
* **Non-destructive Soft Deletes:** Assets and projects are soft-deleted with instant restore capability and storage quota auto-recalculation.
* **Safe External Scrapes:** URL imports run through an SSRF-protected metadata fetcher that filters out loopback, private IP ranges, and internal metadata endpoints.
* **Token Rotation:** Silent refresh token rotation over `SameSite=Lax` cookies with automatic re-auth dispatch on expiry.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
