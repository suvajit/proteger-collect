# Proteger-Collect — Facility Maintenance Checklist & Issue Tracking System

**Open-source preventive maintenance and daily inspection management for housing societies, residential complexes, hotels, serviced apartments, and small office buildings.**

Proteger-Collect replaces paper-based daily maintenance logbooks and Excel sheets with a mobile-first digital system. Field supervisors complete SOP-driven preventive maintenance checklists on their phone — even offline — while facility managers and property administrators get real-time visibility through a web dashboard.

---

## Why Proteger-Collect?

Most facility management software is built for large enterprises. Housing societies, boutique hotels, serviced apartments, and small commercial buildings need something simpler: a structured way to make sure daily preventive maintenance checks actually happen, issues get reported with proof, and nothing slips through the cracks.

Proteger-Collect is purpose-built for this:

- 🏢 **Housing societies & residential complexes** — track daily PM checks across common areas, lifts, generators, water systems, CCTV, and security equipment
- 🏨 **Hotels & serviced apartments** — assign routine inspection checklists to maintenance staff, capture issues with photos, and monitor resolution from the front desk
- 🏬 **Small office buildings** — enforce SOPs for electrical panels, plumbing, fire safety, and cleaning without paper logbooks
- 🏭 **Facilities managed by contract teams** — give your outsourced maintenance supervisor a structured daily checklist and a simple way to report issues with timestamps and photos

---

## Key Features

### 📱 Mobile App (Supervisor)
- Login and access today's checklist grouped by category (electrical, plumbing, safety, HVAC, etc.)
- Tap to mark each item: **Done**, **Issue Found**, or **Not Applicable**
- Server-authoritative timestamps — no manual time entry, no fudging
- Mandatory photo capture for critical items (e.g. fire extinguisher checks)
- Add remarks; **Issue Found** requires a written remark
- Works **offline** — captures entries locally and syncs on reconnect
- Mark issues as **Resolved** with a resolution remark and photo proof

### 🖥️ Web Admin Portal (Facility Manager)
- **Real-time dashboard** with daily completion %, open issue count, and submission status
- **Submissions view** — filter by date, supervisor, or status; drill into any sheet
- **Issue tracker** — cross-sheet view of all flagged issues with resolution status, time-to-resolve, and expandable detail
- **Pareto chart** — which categories generate the most issues (identify systemic problems)
- **Issue age distribution** — how long open issues have been sitting unresolved
- **MTTR (Mean Time To Resolve)** and **MTBF (Mean Time Between Failures)** KPIs
- **Checklist management** — add, edit, reorder, or deactivate checks without a developer; changes apply to future sheets only, historical records stay intact
- **Unlock for resubmission** — admin can reopen a submitted sheet if a supervisor needs to correct an entry
- **User management** — create supervisor accounts, reset passwords, activate/deactivate

### 🔐 Audit & Accountability
- Every entry carries the supervisor's identity and a server-set timestamp — cannot be backdated
- Submitted sheets are immutable (audit trail preserved)
- Soft-delete for checklist items — historical sheets always show the checks as they were on that date
- Full resolution trail: issue reported → timestamp → resolved by supervisor → resolution remark + photo → resolved timestamp

---

## Tech Stack


| Layer | Stack |
|---|---|
| **API** | Node.js 20, NestJS, Prisma ORM, PostgreSQL 14+ |
| **Web portal** | React 18, Vite, TanStack Query, Recharts |
| **Mobile app** | Expo 51 (React Native), expo-router |
| **Auth** | JWT access (15 min) + refresh (7 days), argon2 hashing |
| **Photo storage** | Local disk (MVP) — swap to S3 via `StorageService` |

---

## Repository layout

```
proteger-collect/
├── backend/          NestJS API
│   ├── prisma/       Schema, migrations, seed
│   └── src/
│       ├── auth/     Login, refresh, JWT, RBAC
│       ├── sheets/   Supervisor checklist endpoints
│       ├── admin/    Admin endpoints (sheets, categories, items, users)
│       └── uploads/  Photo upload + static serving
├── web/              React + Vite admin portal
├── mobile/           Expo supervisor app
├── docs/             PRD
├── docker-compose.yml
└── .env.example
```

---

## Environment variables

Copy `.env.example` to `.env` and fill in every value before running anything.

```bash
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | ✅ | Secret for signing access tokens — use a long random string |
| `JWT_REFRESH_SECRET` | ✅ | Secret for signing refresh tokens — different from access secret |
| `JWT_ACCESS_EXPIRES_IN` | ✅ | e.g. `15m` |
| `JWT_REFRESH_EXPIRES_IN` | ✅ | e.g. `7d` |
| `SEED_ADMIN_USERNAME` | ✅ | Initial admin account username |
| `SEED_ADMIN_PASSWORD` | ✅ | Initial admin password (user must change on first login) |
| `SEED_SUPERVISOR_USERNAME` | ✅ | Initial supervisor account username |
| `SEED_SUPERVISOR_PASSWORD` | ✅ | Initial supervisor password |
| `UPLOAD_DIR` | ✅ | Absolute path where photos are stored, e.g. `/var/data/uploads` |
| `PHOTO_URL_BASE` | ✅ | Public URL prefix for photos, e.g. `https://api.example.com/photos` |
| `PORT` | optional | API port (default `3000`) |
| `NODE_ENV` | optional | `production` in prod |

Generate secure secrets:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## Production deployment

### Prerequisites on the server

```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# pnpm
curl -fsSL https://get.pnpm.io/install.sh | sh -
source ~/.bashrc

# PostgreSQL 14+
sudo apt-get install -y postgresql postgresql-contrib

# PM2 (process manager)
npm install -g pm2

# Nginx
sudo apt-get install -y nginx
```

---

### 1. Clone and install

```bash
git clone https://github.com/suvajit/proteger-collect.git
cd proteger-collect
cp .env.example .env
# Fill in .env with production values

# Install all workspace dependencies
pnpm install --config.node-linker=hoisted
pnpm approve-builds --all
```

> **Note:** `--config.node-linker=hoisted` is required once to hoist packages to the root `node_modules`. Subsequent `pnpm install` runs will use the `.npmrc` setting automatically.

---

### 2. Database setup

```bash
# Create DB user and database (run as postgres system user)
sudo -u postgres psql <<SQL
CREATE USER proteger WITH PASSWORD 'your_strong_password' CREATEDB;
CREATE DATABASE proteger_collect OWNER proteger;
SQL
```

Update `DATABASE_URL` in `.env`:
```
DATABASE_URL=postgresql://proteger:your_strong_password@localhost:5432/proteger_collect
```

---

### 3. Run migrations and seed

```bash
cd backend
set -a && source ../.env && set +a

# Apply schema migrations
./node_modules/.bin/prisma migrate deploy

# Seed initial checklist and admin/supervisor accounts
./node_modules/.bin/ts-node -r tsconfig-paths/register prisma/seed.ts
```

> `migrate deploy` (not `migrate dev`) is correct for production — it applies existing migrations without creating new ones.

---

### 4. Build the API

```bash
# from backend/
set -a && source ../.env && set +a
./node_modules/.bin/nest build
```

Output goes to `backend/dist/`.

---

### 5. Build the web portal

```bash
cd web
pnpm build
```

Output goes to `web/dist/`. Serve this as a static site.

**Before building for production**, set the API URL. Create `web/.env.production`:
```
VITE_API_URL=https://api.yourdomain.com
```

Then update `web/src/api/client.ts` to use:
```ts
const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
```

---

### 6. Run the API with PM2

```bash
cd /path/to/proteger-collect

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'proteger-api',
    script: 'backend/dist/main.js',
    cwd: '/path/to/proteger-collect',
    env_file: '.env',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
  }]
}
EOF

pm2 start ecosystem.config.js
pm2 save
pm2 startup   # follow the printed command to enable on boot
```

Check it's running:
```bash
pm2 status
pm2 logs proteger-api
```

---

### 7. Create the uploads directory

```bash
# Match the UPLOAD_DIR value in your .env
sudo mkdir -p /var/data/uploads
sudo chown -R $USER:$USER /var/data/uploads
```

---

### 8. Configure Nginx

Replace `api.yourdomain.com` and `admin.yourdomain.com` with your actual domains.

```nginx
# /etc/nginx/sites-available/proteger

# API
server {
    listen 80;
    server_name api.yourdomain.com;

    # Redirect HTTP → HTTPS (after certbot setup)
    # return 301 https://$host$request_uri;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 15M;   # allow photo uploads up to 15 MB
    }
}

# Web admin portal
server {
    listen 80;
    server_name admin.yourdomain.com;

    root /path/to/proteger-collect/web/dist;
    index index.html;

    # SPA fallback — all routes served by index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|svg|ico|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable and reload:
```bash
sudo ln -s /etc/nginx/sites-available/proteger /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

### 9. HTTPS with Let's Encrypt

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com -d admin.yourdomain.com
```

Certbot auto-edits the Nginx config to add HTTPS and sets up auto-renewal.

---

### 10. Update CORS for production

In `backend/src/main.ts`, change:
```ts
app.enableCors();
```
to:
```ts
app.enableCors({
  origin: ['https://admin.yourdomain.com'],
  credentials: true,
});
```

Rebuild after this change: `cd backend && nest build && pm2 restart proteger-api`

---

## Updating (deploy new version)

```bash
git pull origin main

# Reinstall if packages changed
pnpm install

# Run any new migrations
cd backend
set -a && source ../.env && set +a
./node_modules/.bin/prisma migrate deploy

# Rebuild API and restart
./node_modules/.bin/nest build
pm2 restart proteger-api

# Rebuild web portal
cd ../web
pnpm build
# Nginx serves web/dist directly — no restart needed
```

---

## Mobile app (Expo)

The mobile app is distributed via **Expo Go** (testing) or built as a standalone APK/IPA.

Before building, set the API URL in `mobile/src/api/client.ts`:
```ts
const BASE_URL = 'https://api.yourdomain.com';
```

**Development:**
```bash
cd mobile
pnpm start --localhost   # iOS Simulator
# or: pnpm android       # Android emulator
```

**Production build (EAS):**
```bash
npm install -g eas-cli
eas build --platform android   # or ios
```

---

## Seed accounts

Both accounts are created with `mustResetPw: true` — users must change password on first login. Credentials are set via `.env` (never hardcoded).

| Role | Variable | Default (change before deploy) |
|---|---|---|
| Admin | `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` | `admin` / `Admin@123!` |
| Supervisor | `SEED_SUPERVISOR_USERNAME` / `SEED_SUPERVISOR_PASSWORD` | `supervisor` / `Super@123!` |

---

## Local development

```bash
# Start PostgreSQL (Docker)
docker compose up -d

# Or on macOS: open Postgres.app

# Install dependencies
pnpm install --config.node-linker=hoisted
pnpm approve-builds --all

# Backend
cd backend
set -a && source ../.env && set +a
./node_modules/.bin/prisma migrate dev
./node_modules/.bin/ts-node -r tsconfig-paths/register prisma/seed.ts
pnpm dev          # http://localhost:3000

# Web portal (new terminal)
cd web
pnpm dev          # http://localhost:5173

# Mobile (new terminal)
cd mobile
pnpm start --localhost   # press i for iOS Simulator
```

---

## Health check

```bash
curl https://api.yourdomain.com/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your_seed_password"}'
```

Expected: `200 OK` with `accessToken` in the response body.
