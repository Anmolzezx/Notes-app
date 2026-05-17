# Notes App

A multi-user notes service: REST API + React frontend. JWT auth, sharing, pinning + custom reordering, full-text-style search, pagination, and full **version history** (every edit is snapshotted, any past version can be restored).

**Backend:** TypeScript · Express 5 · PostgreSQL · Prisma ORM · zod · bcrypt · jsonwebtoken
**Frontend:** React 18 · Vite · TypeScript (served as static files by the same Express server in production)
**Deploy:** Docker · Render.com (blueprint via [render.yaml](render.yaml))

---

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | — | Health check |
| GET | `/about` | — | Author + chosen feature info |
| GET | `/openapi.json` | — | This API's OpenAPI 3.0 document |
| POST | `/register` | — | Register a new user |
| POST | `/login` | — | Authenticate, returns JWT |
| GET | `/notes` | JWT | List notes the user owns or has been shared. Supports `?limit=&offset=`. Returns `X-Total-Count` header. |
| POST | `/notes` | JWT | Create a note |
| GET | `/notes/:id` | JWT | Fetch a note (owner or shared user) |
| PUT | `/notes/:id` | JWT | Update a note (owner only) |
| DELETE | `/notes/:id` | JWT | Delete a note (owner only) |
| POST | `/notes/:id/share` | JWT | Share a note with another user (owner only, idempotent) |
| PUT | `/notes/:id/pin` | JWT | Pin or unpin a note (owner only) |
| PUT | `/notes/reorder` | JWT | Reorder by `note_ids` array (non-owned IDs are silently skipped) |
| GET | `/notes/:id/versions` | JWT | List version history (owner or shared user) |
| GET | `/notes/:id/versions/:vid` | JWT | Fetch a specific past version |
| POST | `/notes/:id/versions/:vid/restore` | JWT | Restore content from a past version (owner only). Creates a new version. |
| GET | `/search?q=...` | JWT | Case-insensitive search across accessible notes. Supports pagination. |

Full spec at `GET /openapi.json`.

---

## Project layout

```
notes-app/
├── src/                # Express + Prisma backend
├── prisma/             # schema + migrations
├── web/                # React + Vite frontend
├── tests/smoke.ts      # node-native end-to-end smoke test (78 assertions)
├── openapi.json        # OpenAPI 3.0 spec, served at GET /openapi.json
├── Dockerfile          # 2-stage build: deps + tsc + Vite build → runtime
└── render.yaml         # Render blueprint: web service + free Postgres
```

---

## Running the project

**Prerequisites:** Node.js ≥ 20, PostgreSQL ≥ 16 (only if you want a local backend).

### One-time setup

```bash
git clone <repo-url>
cd notes-app

# Backend deps
npm install

# Frontend deps
npm --prefix web install

# Backend env
cp .env.example .env
# Edit .env:
#   DATABASE_URL=postgres://<user>@localhost:5432/notes_app
#   JWT_SECRET=<run: openssl rand -hex 32>
#   PORT=3000

# Local Postgres + initial schema (skip if you only want to run the frontend against Render)
createdb notes_app
npx prisma migrate dev --name init
```

There are three useful run modes:

### Mode A — Frontend only, talking to Render (fastest UI iteration)

```bash
cd web
# web/.env.local already points VITE_API_PROXY_TARGET at https://notes-app-2280.onrender.com
npm run dev
# open the URL Vite prints (e.g. http://localhost:5173/)
```
No local backend. No local Postgres. Every API call is proxied through Vite to your Render deploy. HMR on UI changes.

### Mode B — Backend + frontend separately (when changing both)

```bash
# Terminal 1
npm run dev                                     # API on :3000

# Terminal 2
# Comment out VITE_API_PROXY_TARGET in web/.env.local so proxy falls back to localhost:3000
cd web && npm run dev                           # Vite on :5173
```

### Mode C — Production-like, single port (sanity check before deploying)

```bash
npm --prefix web run build                      # builds web/dist/
npm run dev                                     # Express serves API and web/dist/
# open http://localhost:3000/
```

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Backend in tsx watch mode |
| `npm run build` | `prisma generate && tsc` → outputs `dist/` |
| `npm start` | `prisma migrate deploy && node dist/index.js` (production) |
| `npm run test:smoke` | Run end-to-end smoke test against `BASE_URL` (defaults to localhost:3000) |
| `npm run prisma:migrate` | Create/apply a new local migration |
| `npm run prisma:studio` | Open Prisma Studio at `localhost:5555` |
| `npm --prefix web run dev` | Vite dev server with HMR + API proxy |
| `npm --prefix web run build` | TS check + Vite build → `web/dist/` |

---

## Environment variables

### Backend (`.env`)

| Var | Required | Default | Purpose |
|---|---|---|---|
| `DATABASE_URL` | yes | — | PostgreSQL connection string |
| `JWT_SECRET` | yes | — | HS256 signing key, ≥ 16 chars. Generate with `openssl rand -hex 32`. |
| `PORT` | no | `3000` | HTTP listener port |
| `NODE_ENV` | no | `development` | When `production`, error responses hide stack details |

### Frontend (`web/.env.local`, optional)

| Var | Default | Purpose |
|---|---|---|
| `VITE_API_PROXY_TARGET` | `http://localhost:3000` | Where the Vite dev server proxies API calls. Set to a Render URL to develop the frontend without a local backend. |

---

## Deploying to Render

1. Push this repo to GitHub.
2. In Render: **New → Blueprint → connect repo**. Render reads [render.yaml](render.yaml) and provisions:
   - `notes-app-db` (free Postgres)
   - `notes-app` (web service, Docker runtime, `/health` probe)
3. `JWT_SECRET` is generated automatically; `DATABASE_URL` is wired in from the database.
4. The Docker build:
   - Installs backend deps, runs `prisma generate`, compiles TypeScript → `dist/`
   - Installs frontend deps, runs Vite build → `web/dist/`
   - In the runtime image, Express serves the React app from `web/dist/` and the API on the same port — single service, no CORS to configure.
5. On first deploy the container runs `prisma migrate deploy` before starting the server, so the schema is created automatically.

Health check after deploy: `curl https://<your-app>.onrender.com/health` → `{"status":"ok"}`.

> **Free-tier caveat:** the web service sleeps after 15 min idle (first hit takes ~30 s to wake), and the free Postgres expires ~30 days after creation.

---

## End-to-end smoke test

78-assertion script that hits every endpoint against a running server. Useful right after a deploy.

```bash
# Local
npm run test:smoke

# Against production
BASE_URL=https://<your-app>.onrender.com npm run test:smoke
```

The script registers two users, exercises CRUD, sharing, pinning, reordering, search, pagination, and the full version history flow (create → multi-edit → list → fetch → restore → cascade-on-delete), then cleans up.

---

## curl examples

```bash
# Register + login
curl -X POST http://localhost:3000/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","password":"hunter2hunter"}'

TOKEN=$(curl -s -X POST http://localhost:3000/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","password":"hunter2hunter"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')

# Create a note
curl -X POST http://localhost:3000/notes \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Groceries","content":"milk, eggs, bread"}'

# List notes (paginated)
curl -i "http://localhost:3000/notes?limit=10&offset=0" \
  -H "Authorization: Bearer $TOKEN"

# Share
curl -X POST http://localhost:3000/notes/<NOTE_ID>/share \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"share_with_email":"bob@example.com"}'

# Pin
curl -X PUT http://localhost:3000/notes/<NOTE_ID>/pin \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"pinned":true}'

# Reorder
curl -X PUT http://localhost:3000/notes/reorder \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"note_ids":["<NOTE_ID_1>","<NOTE_ID_2>"]}'

# Search
curl "http://localhost:3000/search?q=milk" \
  -H "Authorization: Bearer $TOKEN"

# List version history
curl http://localhost:3000/notes/<NOTE_ID>/versions \
  -H "Authorization: Bearer $TOKEN"

# Restore a specific version
curl -X POST http://localhost:3000/notes/<NOTE_ID>/versions/<VERSION_ID>/restore \
  -H "Authorization: Bearer $TOKEN"
```

---

## Featured: Note version history

Every change to a note (create, update, or restore) is snapshotted into a separate `note_versions` table with a monotonically increasing `version_no`. Users can browse the timeline, view any past snapshot, and restore — and restore itself creates a new version, so the historical record is never destroyed.

- Snapshots happen inside the same DB transaction as the note update, so the version log is always consistent with the live note.
- `version_no` is computed as `MAX(version_no) + 1` inside the transaction (`@@unique([noteId, versionNo])` guards against stray duplicates).
- Read access follows the same owner-or-shared rules as the note. Only the owner can restore.
- Versions cascade away when the parent note is deleted.

## Design notes

- **Ownership privacy:** non-accessible notes return `404`, not `403`, so users can't enumerate IDs they don't own.
- **Auth enumeration:** `/login` returns the same `401 "Invalid email or password"` for unknown emails and wrong passwords.
- **Email case:** normalized to lowercase at the validation layer; lookups work whether the user types `alice@…` or `ALICE@…`.
- **Sharing is read-only:** shared users can `GET` (note + version history), but only the owner can `PUT`/`DELETE`/`SHARE`/`PIN`/`restore`.
- **Reorder partial success:** unknown or non-owned UUIDs in the `note_ids` array are silently skipped — the response `count` tells you how many actually updated.
- **Pagination:** body stays a plain array per spec; total via `X-Total-Count` response header.
- **`is_owner` flag:** every note response includes a boolean `is_owner` (`true` if the viewer owns it, `false` if it was shared with them). Used by the frontend to hide actions a shared user can't perform.
- **Frontend served by the API:** in production the Docker image bundles both. Express has a static-files handler for `web/dist/` plus an SPA fallback for unknown non-API paths. No CORS to configure, no second deploy.
