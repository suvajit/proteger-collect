# CLAUDE.md — Proteger-Collect

> This file is read automatically by Claude Code at repo root. It is the build brief.
> The full product spec lives in `docs/PRD.md` — treat it as the source of truth for behaviour.

## What we are building
**Proteger-Collect**: a field-service daily-checklist system.
- **Mobile app** (supervisor) — log in, fill the day's preventive-maintenance checklist, submit. Must work **offline** and sync.
- **Web portal** (admin) — monitor every submitted sheet, manage checks (add/edit/remove), manage users, export reports.
- **Backend API** — auth, RBAC, persistence, sync, reporting.

Read `docs/PRD.md` in full before writing code. Requirements are ID'd (`FR-M*` mobile, `FR-A*` admin); §10 contains seed data to load on first migration.

## Stack (decided — do not substitute without asking)
- **Monorepo**, pnpm workspaces: `/backend`, `/web`, `/mobile`, `/docs`.
- **Backend:** Node + **NestJS** + **Prisma** + **PostgreSQL**. JWT access+refresh. Password hashing with **argon2**. Validation via class-validator DTOs. RBAC via Nest guards.
- **Web:** **React + Vite + TypeScript**, TanStack Query for data, shadcn/ui (or MUI) for components, React Router.
- **Mobile:** **Expo (React Native) + TypeScript**. Offline queue in **expo-sqlite**; photos via expo-camera / expo-image-picker.
- **Photo storage:** local disk behind a `StorageService` interface for MVP, so an S3 driver can drop in later. Serve via signed/expiring URLs.
- **Tooling:** TypeScript everywhere, ESLint + Prettier, `.env` for all config, Docker Compose for Postgres.

## Non-negotiable rules (from the PRD)
1. **No secrets in source.** All config (DB URL, JWT secret, seed admin password) via `.env` / env vars. Provide `.env.example`.
2. **Server-authoritative timestamps.** `completed_at` and `submitted_at` are set by the server, never trusted from the client. No manual time entry.
3. **Submitted sheets are immutable** for supervisors and read-only in the admin view (audit integrity).
4. **Soft delete checks** (`is_active=false`) — never hard-delete historical data. Edits/removals affect **future** sheets only.
5. **Snapshot on capture.** A `CheckEntry` stores `item_title` and `category_name` as text at capture time, so later template edits never alter past sheets.
6. **Idempotent sync.** Offline entries carry a client op-id; replaying must not create duplicates.
7. **RBAC enforced server-side** on every endpoint, not just hidden in the UI.

## Build order (each phase = working, testable increment)
- **P0 Foundation:** monorepo + Docker Postgres, Prisma schema per PRD §8, migrations + seed (§10 checklist, one admin + one supervisor with `must_reset_pw=true`), auth module (login/refresh/me/change-password), RBAC guards.
- **P1 Mobile core (online):** login, `GET /sheets/today`, per-item status capture + auto-timestamp, remark, submit, own history.
- **P2 Admin core:** login, submissions dashboard with filters, sheet detail (read-only), category + item CRUD with reorder & frequency, user management.
- **P3 Field-readiness:** offline capture + idempotent sync, photo capture/upload, issues view, CSV/PDF export, audit log.
- **P4 Polish:** dashboard KPIs, validation hardening, loading/empty/error states, responsive web.

## Definition of done (MVP)
See PRD §15. Headline: a supervisor completes & submits a full checklist **offline**, it appears in the admin portal after reconnect, timestamps + identity are attached and uneditable, and an admin can add/remove a check that affects only future sheets while history stays intact.

## Conventions for you (Claude Code)
- Work phase by phase; after each phase, run the app, show me how to start it, and summarise what changed.
- Write a short `README.md` with setup/run steps as you go.
- Prefer small, reviewable commits per feature.
- If a PRD assumption (§13) blocks you, state the assumption you're making and proceed; flag it for confirmation rather than stalling.
