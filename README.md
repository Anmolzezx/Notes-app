# Notes App

A multi-user notes REST API with JWT auth, sharing, pinning + custom reordering, full-text-style search, and pagination.

**Stack:** TypeScript · Express 5 · PostgreSQL · Prisma ORM · zod · bcrypt · jsonwebtoken

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
| GET | `/search?q=...` | JWT | Case-insensitive search across accessible notes. Supports pagination. |

Full spec at `GET /openapi.json`.

---

## Local setup

**Prerequisites:** Node.js ≥ 20, PostgreSQL ≥ 16.

```bash
git clone <repo-url>
cd notes-app
npm install

# Create a local Postgres database
createdb notes_app

# Configure environment
cp .env.example .env
# Edit .env:
#   DATABASE_URL=postgres://<user>@localhost:5432/notes_app
#   JWT_SECRET=<run: openssl rand -hex 32>
#   PORT=3000

# Apply database schema
npx prisma migrate dev --name init

# Run the dev server
npm run dev
```

The server listens on `http://localhost:3000`.

### Useful scripts

| Command | What it does |
|---|---|
| `npm run dev` | tsx watch mode — restarts on file change |
| `npm run build` | `prisma generate && tsc` → outputs `dist/` |
| `npm start` | `prisma migrate deploy && node dist/index.js` (production) |
| `npm run prisma:migrate` | Create/apply a new local migration |
| `npm run prisma:studio` | Open Prisma Studio at `localhost:5555` |

---

## Environment variables

| Var | Required | Default | Purpose |
|---|---|---|---|
| `DATABASE_URL` | yes | — | PostgreSQL connection string |
| `JWT_SECRET` | yes | — | HS256 signing key, ≥ 16 chars. Generate with `openssl rand -hex 32`. |
| `PORT` | no | `3000` | HTTP listener port |
| `NODE_ENV` | no | `development` | When `production`, error responses hide stack details |

---

## Deploying to Render

1. Push this repo to GitHub.
2. In Render: **New → Blueprint → connect repo**. Render reads [render.yaml](render.yaml) and provisions:
   - `notes-app-db` (free Postgres)
   - `notes-app` (web service, Docker runtime, `/health` probe)
3. `JWT_SECRET` is generated automatically; `DATABASE_URL` is wired in from the database.
4. On first deploy the container runs `prisma migrate deploy` before starting the server, so the schema is created automatically.

Health check after deploy: `curl https://<your-app>.onrender.com/health` → `{"status":"ok"}`.

---

## End-to-end smoke test

Hits every endpoint against a running server. Useful right after a deploy:

```bash
# Local
BASE_URL=http://localhost:3000 npx tsx tests/smoke.ts

# Against production
BASE_URL=https://<your-app>.onrender.com npx tsx tests/smoke.ts
```

The script registers two users, exercises CRUD, sharing, pinning, reordering, search, and pagination, then cleans up.

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
```

---

## Design notes

- **Ownership privacy:** non-accessible notes return `404`, not `403`, so users can't enumerate IDs they don't own.
- **Auth enumeration:** `/login` returns the same `401 "Invalid email or password"` for unknown emails and wrong passwords.
- **Email case:** normalized to lowercase at the validation layer; lookups work whether the user types `alice@…` or `ALICE@…`.
- **Sharing is read-only:** shared users can `GET`, but only the owner can `PUT`/`DELETE`/`SHARE`/`PIN`.
- **Reorder partial success:** unknown or non-owned UUIDs in the `note_ids` array are silently skipped — the response `count` tells you how many actually updated.
- **Pagination:** body stays a plain array per spec; total via `X-Total-Count` response header.
