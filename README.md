# Proteger-Collect

Field-service daily checklist system — mobile app (supervisor) + web admin portal + REST API.

## Prerequisites

- Node.js >= 20
- pnpm >= 9 (`curl -fsSL https://get.pnpm.io/install.sh | sh -`)
- PostgreSQL 14+ (Postgres.app on macOS, or Docker)

## Quick start

### 1. Environment

```bash
cp .env.example .env
# Edit .env if needed (DB credentials, JWT secrets, seed passwords)
```

### 2. Database

**With Postgres.app (macOS):** open the app and start the server, then:

```bash
psql -U $USER -c "CREATE USER proteger WITH PASSWORD 'proteger_dev' CREATEDB;"
psql -U $USER -c "CREATE DATABASE proteger_collect OWNER proteger;"
```

**With Docker:**

```bash
docker compose up -d
```

### 3. Backend setup

```bash
cd backend
pnpm install
pnpm approve-builds --all   # allow argon2, prisma native binaries to build
```

### 4. Migrate & seed

```bash
# from backend/
set -a && source ../.env && set +a
./node_modules/.bin/prisma migrate dev   # applies DB schema
./node_modules/.bin/ts-node -r tsconfig-paths/register prisma/seed.ts
```

### 5. Start API

```bash
# from backend/
set -a && source ../.env && set +a
pnpm dev         # watch mode (development)
# or: node dist/main.js  (after pnpm build)
```

API runs at **http://localhost:3000**

## Verify login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123!"}'
```

Expected: JSON with `accessToken`, `refreshToken`, and user info including `"mustResetPw": true`.

## Auth endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | public | Returns access + refresh tokens |
| POST | `/auth/refresh` | public | Exchange refresh token |
| POST | `/auth/logout` | bearer | Invalidate refresh token |
| GET  | `/auth/me` | bearer | Current user profile |
| POST | `/auth/change-password` | bearer | Change password (first login or self-service) |

## Seed accounts

Both accounts have `mustResetPw: true`. Credentials set via `.env`:

| Role | Default username | Default password |
|------|-----------------|-----------------|
| admin | `admin` | `Admin@123!` |
| supervisor | `supervisor` | `Super@123!` |

## Project structure

```
proteger-collect/
├── backend/         NestJS API (P0 complete)
│   ├── prisma/      Schema, migrations, seed
│   └── src/
│       ├── auth/    Login, refresh, me, change-password
│       ├── common/  Guards, decorators, filters
│       └── prisma/  PrismaService
├── web/             React + Vite admin portal (P2)
├── mobile/          Expo supervisor app (P1)
└── docs/            PRD
```

## Build phases

- **P0** ✅ Foundation: monorepo, schema, seed, auth
- **P1** Mobile core (online) — supervisor checklist flow
- **P2** Admin portal — dashboard, CRUD, user management
- **P3** Field-readiness — offline sync, photos, export
- **P4** Polish — KPIs, error states, responsive
