# Product Requirements Document — **Proteger-Collect**

**A Field Service daily-checklist app (mobile) + monitoring portal (web)**

| | |
|---|---|
| **Product** | Proteger-Collect |
| **Owner** | Geogo Techsolutions (Proteger product line) |
| **Doc version** | v1.0 (draft for build) |
| **Status** | Ready for engineering / Claude Code build |
| **Intended consumer of this doc** | Claude Code (full-stack build agent) |

> **How to use this doc:** This PRD is written to be directly actionable by a build agent. Functional requirements carry IDs (`FR-x`), the data model and API contract are explicit, and a complete seed dataset is provided so the system ships pre-populated with a real checklist. Open assumptions are listed in §13 — confirm or override before/at build time.

---

## 1. Overview & Purpose

Field supervisors today record a daily **preventive-maintenance checklist** on paper / Excel, writing the time each task was completed against a grid of dates (source artefact: a 38-row daily PM sheet for a residential property). This is hard to audit, easy to fudge, and gives the back office no real-time visibility.

**Proteger-Collect** replaces that paper sheet with:

1. A **mobile app** for supervisors to log each daily check quickly (tap status, auto-timestamp, optional remark/photo) — usable on-site, including low/no-connectivity areas (basements, genset rooms).
2. A **web admin portal** for managers to monitor every submitted sheet in near real-time, track completion and flagged issues, and **add/edit/remove checks** without a code change.

Both are gated by **username/password authentication** with role-based access (Supervisor vs Admin).

---

## 2. Goals & Success Metrics

| Goal | Metric |
|---|---|
| Replace paper checklist | 100% of daily PM checks captured digitally |
| Fast field entry | A full daily sheet (~35 items) completable in < 5 min |
| Real-time oversight | Admin sees a submission within 60s of supervisor submit (online) |
| Accountability | Every entry carries supervisor ID + server timestamp (non-editable audit trail) |
| Self-service config | Admin can add/remove a check with zero developer involvement |
| Reliability in the field | Entries captured offline and synced on reconnect with zero data loss |

---

## 3. Personas & Roles

| Role | Who | Primary surface | Capabilities |
|---|---|---|---|
| **Supervisor** | On-site facility/maintenance staff (e.g. the named responsible person on the source sheet) | Mobile app | Log in; view today's checklist; mark each item (Done / Issue / N/A); add remark + photo; submit the day's sheet; view own history |
| **Admin** | Facility manager / back office | Web portal | Log in; dashboard of all submissions; drill into any sheet; manage checklist items & categories (add/edit/remove/reorder, set frequency); manage supervisors & sites; view flagged issues; export reports |

> RBAC is enforced server-side on **every** endpoint, not just hidden in the UI.

---

## 4. Scope

### In scope (MVP)
- Username/password auth, JWT sessions, role-based access.
- Mobile: today's checklist, per-item status capture, remark, optional photo, offline capture + sync, submit, history.
- Admin: submissions dashboard, sheet detail view, checklist item/category CRUD, frequency config, user management, issue list, CSV/PDF export.
- Seed the database with the checklist in §10.

### Out of scope (MVP — note as roadmap)
- Vision-AI auto-verification of photos (future tie-in to the Proteger vision engine).
- Push notifications / escalation workflows.
- Multi-tenant / multiple customer organisations.
- Native offline maps, geofencing, biometric login.
- SSO / SAML.

---

## 5. System Architecture (high level)

```
┌──────────────────┐         HTTPS / REST + JWT        ┌─────────────────────┐
│  Mobile App       │  ───────────────────────────────▶ │  API / Backend       │
│  (Supervisor)     │  ◀─────────────────────────────── │  (Node + Express/    │
│  offline cache    │                                    │   NestJS)            │
└──────────────────┘                                    │                      │
                                                         │   ├─ Auth service    │
┌──────────────────┐                                    │   ├─ Checklist svc   │
│  Web Admin Portal │  ───────────────────────────────▶ │   ├─ Submission svc  │
│  (Admin, React)   │  ◀─────────────────────────────── │   └─ Reporting svc   │
└──────────────────┘                                    └─────────┬───────────┘
                                                                   │
                                                  ┌────────────────┴───────────┐
                                                  │  PostgreSQL   │  Object store │
                                                  │  (data)       │  (photos)     │
                                                  └───────────────────────────────┘
```

**Recommended stack** (see §12 for alternatives):
- **Mobile:** React Native + Expo (single codebase iOS/Android), local store via SQLite/AsyncStorage for offline.
- **Web portal:** React + Vite + a component library (e.g. shadcn/ui or MUI).
- **Backend:** Node.js (NestJS or Express), PostgreSQL, Prisma/TypeORM.
- **Photo storage:** S3-compatible object store (or local disk for MVP), signed URLs.
- **Auth:** JWT access + refresh tokens, password hashing with argon2/bcrypt.

---

## 6. Functional Requirements — Mobile App (Supervisor)

| ID | Requirement |
|---|---|
| **FR-M1** | Login screen: username + password. On success, store JWT; on failure, show error and rate-limit after repeated attempts. |
| **FR-M2** | "Today's Checklist" home screen: shows the active checklist for the current date, grouped by category, with a progress indicator (e.g. 18/35 done). |
| **FR-M3** | Each item shows: title, optional description, current status, and a quick-action control to set status: **Done**, **Issue Found**, **Not Applicable**. |
| **FR-M4** | On setting a status, the app captures a **server-authoritative completion timestamp** automatically (no manual time entry; replaces the old hand-written time). |
| **FR-M5** | Each item supports an optional **free-text remark** and an optional **photo** (camera or gallery). Items flagged `requires_photo=true` make the photo mandatory before the item can be marked Done. |
| **FR-M6** | If status = **Issue Found**, a remark is **mandatory**; the item is flagged for admin attention. |
| **FR-M7** | Only items whose `frequency` is due on the current date appear on that day's sheet (daily items every day; weekly/monthly per schedule). |
| **FR-M8** | **Submit** action finalises the day's sheet. Supervisor is warned if items are still pending and may submit anyway (pending items recorded as such). After submit, the sheet becomes read-only for the supervisor. |
| **FR-M9** | **Offline-first:** all capture works without connectivity; entries queue locally and sync automatically on reconnect. Sync is idempotent (no duplicates). Show clear sync status (synced / pending). |
| **FR-M10** | **History:** supervisor can view their previously submitted sheets (read-only) filtered by date range. |
| **FR-M11** | Logout clears local JWT. Auto-logout on token expiry with silent refresh where possible. |

---

## 7. Functional Requirements — Web Admin Portal

| ID | Requirement |
|---|---|
| **FR-A1** | Admin login (username + password), separate from supervisor accounts by role. |
| **FR-A2** | **Dashboard:** list of daily sheets with filters by date, site, supervisor, and status (draft / submitted). Each row shows completion %, # issues flagged, submit time. |
| **FR-A3** | **Sheet detail view:** every item with its status, completion timestamp, remark, and photo thumbnail (click to enlarge). Read-only — preserves audit integrity. |
| **FR-A4** | **Issues view:** cross-sheet list of all items marked "Issue Found", with filters, so recurring problems are visible. |
| **FR-A5** | **Checklist management:** CRUD on **categories** and **checklist items**. For each item: title, description, category, **frequency** (daily / weekly / monthly), `requires_photo`, sort order, active/inactive. |
| **FR-A6** | Adding/removing/editing a check affects **future** sheets only; historical sheets retain a snapshot of the items as they were on that date (see §8 — versioning note). Removing a check = soft delete (`is_active=false`), never a hard delete of historical data. |
| **FR-A7** | Reorder items within a category and reorder categories (drag-and-drop or order field). |
| **FR-A8** | **User management:** create/edit/deactivate supervisor and admin accounts; assign a supervisor to a site; trigger password reset. (Admin sets a temporary password; user changes on first login. Admin never sees plaintext passwords.) |
| **FR-A9** | **Sites/Properties management** (optional MVP toggle): create properties so the same install can serve more than one building. |
| **FR-A10** | **Export:** download submissions as CSV and PDF for a chosen date range / site. |
| **FR-A11** | **Audit log:** record who added/edited/removed checks and users, with timestamp. |

---

## 8. Data Model

> Snapshotting principle: a submitted **CheckEntry** stores the item title/category **as text at time of capture** (in addition to the `item_id` FK), so that later edits or removal of a checklist item never alter or break historical sheets.

```
User
  id            (uuid, pk)
  full_name     (text)
  username      (text, unique)
  email         (text, nullable, unique)
  password_hash (text)
  role          (enum: admin | supervisor)
  site_id       (uuid, fk -> Site, nullable)
  is_active     (bool, default true)
  must_reset_pw (bool, default false)
  created_at / updated_at

Site                       -- optional MVP
  id (uuid, pk)
  name (text)
  address (text, nullable)
  is_active (bool)
  created_at

ChecklistCategory
  id (uuid, pk)
  name (text)
  sort_order (int)
  is_active (bool, default true)
  created_at / updated_at

ChecklistItem
  id (uuid, pk)
  category_id   (uuid, fk -> ChecklistCategory)
  title         (text)
  description   (text, nullable)
  frequency     (enum: daily | weekly | monthly, default daily)
  weekday       (int 0-6, nullable)   -- for weekly items
  day_of_month  (int 1-28, nullable)  -- for monthly items
  requires_photo(bool, default false)
  sort_order    (int)
  is_active     (bool, default true)
  created_at / updated_at

DailySheet
  id            (uuid, pk)
  site_id       (uuid, fk -> Site, nullable)
  supervisor_id (uuid, fk -> User)
  sheet_date    (date)
  status        (enum: draft | submitted)
  submitted_at  (timestamptz, nullable)
  created_at / updated_at
  UNIQUE (site_id, supervisor_id, sheet_date)

CheckEntry
  id             (uuid, pk)
  sheet_id       (uuid, fk -> DailySheet, on delete cascade)
  item_id        (uuid, fk -> ChecklistItem)
  item_title     (text)      -- snapshot
  category_name  (text)      -- snapshot
  status         (enum: pending | done | issue | na, default pending)
  completed_at   (timestamptz, nullable)  -- set server-side when status moves off 'pending'
  remark         (text, nullable)
  photo_url      (text, nullable)
  created_at / updated_at

AuditLog
  id (uuid, pk)
  actor_id (uuid, fk -> User)
  action (text)        -- e.g. "item.create", "item.deactivate", "user.create"
  entity (text)        -- table name
  entity_id (uuid)
  metadata (jsonb)     -- before/after
  created_at
```

---

## 9. API Specification (REST, JSON, JWT-bearer)

### Auth
| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/auth/login` | public | `{username,password}` → access + refresh tokens |
| POST | `/auth/refresh` | public | refresh access token |
| POST | `/auth/logout` | any | invalidate refresh token |
| GET | `/auth/me` | any | current user profile |
| POST | `/auth/change-password` | any | first-login / self-service change |

### Supervisor (mobile)
| Method | Path | Purpose |
|---|---|---|
| GET | `/sheets/today` | get-or-create today's sheet for the logged-in supervisor, with items grouped by category (only items due today) |
| PATCH | `/sheets/{id}/entries/{entryId}` | update status / remark / photo_url of one entry |
| POST | `/uploads` | multipart photo upload → returns `photo_url` |
| POST | `/sheets/{id}/submit` | finalise sheet (status → submitted) |
| GET | `/sheets/mine?from=&to=` | own submission history (read-only) |
| POST | `/sync` | batch-apply queued offline entries (idempotent via client-supplied entry op IDs) |

### Admin (web)
| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/sheets?date=&site=&supervisor=&status=` | filtered submissions list |
| GET | `/admin/sheets/{id}` | full sheet detail |
| GET | `/admin/issues?from=&to=&site=` | all flagged issues |
| GET/POST/PATCH/DELETE | `/admin/categories[/{id}]` | category CRUD (DELETE = soft) |
| GET/POST/PATCH/DELETE | `/admin/items[/{id}]` | checklist item CRUD (DELETE = soft) |
| PATCH | `/admin/items/reorder` | bulk sort-order update |
| GET/POST/PATCH | `/admin/users[/{id}]` | user management |
| POST | `/admin/users/{id}/reset-password` | issue temp password |
| GET/POST/PATCH | `/admin/sites[/{id}]` | site management (optional) |
| GET | `/admin/dashboard/summary?date=` | KPI tiles (completion %, sheets submitted, open issues) |
| GET | `/admin/export?type=csv|pdf&from=&to=&site=` | report export |

**Conventions:** standard HTTP status codes; consistent error envelope `{ error: { code, message } }`; pagination via `?page=&limit=`; all timestamps ISO-8601 UTC; server is authoritative for `completed_at` and `submitted_at`.

---

## 10. Seed Data — Checklist (derived from the source PM sheet)

Load these on first migration. Duplicates in the source artefact (Door/Windows, Pigeons Net, Fire Extinguisher appeared twice) have been de-duplicated. Frequencies are suggested defaults — Admin can change any of them in-app.

### Category: Solar & Rooftop
| Title | Frequency |
|---|---|
| Solar Panels Clean / Tanks Leakage – Check | daily |
| Solar Lights Daily ON – Check | daily |
| Rain Sheets Leakage & Damage – Check | daily |
| Rain Water Filter Clean / Working | weekly |

### Category: Building & Common Areas
| Title | Frequency |
|---|---|
| Chair / Table / Lighting – Check | daily |
| After-Party Cleaning Complete | daily |
| Door / Windows – Smooth Open/Close | daily |
| Floors, Stairs & Roof Cleaning – All Floors | daily |
| Walls / Pillars Damage – Check | weekly |
| Painting Touch-up – Check | monthly |
| Parking Lot / Roof – Cleaning | daily |
| Garbage Pickup / On-time Clearance | daily |

### Category: Gym & Amenities
| Title | Frequency |
|---|---|
| All Gym Equipment – Working | daily |
| Gym Equipment & Floor Cleaning | daily |
| Child Play Area Equipment – Check | daily |
| Plant Watering / Water Storage – Check | daily |

### Category: Security & Surveillance
| Title | Frequency |
|---|---|
| CCTV DVR Working – All Lights ON | daily |
| Internet Connection to CCTV | daily |
| Lift CCTV Working / Damages – Check | daily |
| Internal & Front Gate Parking – No Issues | daily |
| Security Guard Fire-Equipment Training | weekly |

### Category: Electrical & Power
| Title | Frequency |
|---|---|
| Power Backup ON | daily |
| All Switches Working | daily |
| No Loose Wires | daily |
| All Floors – LED Bulbs Working | daily |
| Electrical Panels – Check | daily |
| Genset Diesel / Working / Damages – Check | daily |
| BESCOM Power Supply | daily |

### Category: Plumbing & Water
| Title | Frequency |
|---|---|
| Wall Pipe Connections Leakage – Check | daily |
| Water Tanks / Sump Cleaning – Check | weekly |
| Water Softener – SALT / Service / TDS – Check | daily |
| Borewell & Sump Motor Working | daily |
| Drainage Pipes Leak – Check | daily |

### Category: Safety
| Title | Frequency | Requires photo |
|---|---|---|
| Fire Extinguisher Physical / Liquid – Check | daily | true |

### Category: Pest Control
| Title | Frequency |
|---|---|
| Pigeons Net Gaps – Check | daily |

> **Seed users:** create one `admin` and one `supervisor` account with temporary passwords and `must_reset_pw=true`. Do **not** hard-code credentials in source; read from environment/migration config.

---

## 11. Non-Functional Requirements

| Area | Requirement |
|---|---|
| **Security** | Passwords hashed (argon2/bcrypt, never plaintext); JWT with short-lived access + refresh; RBAC enforced server-side; HTTPS only; login rate-limiting / lockout; input validation on all endpoints. |
| **Privacy** | Photos and personal data access restricted by role; signed, expiring photo URLs. |
| **Offline/Sync** | Mobile fully functional offline; idempotent sync; no data loss on reconnect. |
| **Performance** | `/sheets/today` returns < 1s; dashboard list paginated; photos compressed client-side before upload. |
| **Reliability** | Server timestamps authoritative; submitted sheets immutable. |
| **Auditability** | All config/user changes written to AuditLog. |
| **Usability** | Mobile UI optimised for one-handed, on-site use; large tap targets; works on mid-range Android. |
| **Localisation** | Default English; structure strings for future i18n. |
| **Accessibility** | Sufficient contrast; scalable text. |

---

## 12. Tech Stack — Recommendation & Alternatives

| Layer | Recommended | Acceptable alternatives |
|---|---|---|
| Mobile | React Native + Expo | Flutter; PWA (if app-store distribution not needed) |
| Web portal | React + Vite | Next.js |
| Backend | Node.js (NestJS) | Express; or Supabase (Postgres + Auth + Storage) to accelerate MVP |
| DB | PostgreSQL | — |
| Auth | JWT (custom) | Supabase Auth / Auth0 |
| Photo store | S3-compatible | Local disk (MVP only) |
| Hosting | Containerised (Docker) | Managed PaaS |

*If speed-to-MVP is the priority, Supabase covers auth, Postgres, storage, and row-level security out of the box and pairs cleanly with both React Native and React.*

---

## 13. Open Assumptions (confirm or override)

1. **Single property** to start; data model supports multiple sites but multi-site UI is optional for MVP.
2. **Status set** = Done / Issue Found / Not Applicable / (Pending). Confirm if a numeric reading or pass/fail is also needed for any check.
3. **Photos** are optional except where `requires_photo=true` (defaulted on Fire Extinguisher). Confirm which checks should mandate photos.
4. **One sheet per supervisor per day.** If multiple supervisors share one property's sheet, the model needs a tweak.
5. **Frequencies** above are inferred defaults — Admin can change them; confirm the real weekly/monthly cadence.
6. **The original "time of completion"** is replaced by an automatic server timestamp (more trustworthy). Manual time entry is intentionally dropped.
7. Distribution: internal install (sideload / MDM / TestFlight) assumed; public app-store listing not required for MVP.

---

## 14. Build Phases / Milestones

| Phase | Deliverable |
|---|---|
| **P0 — Foundation** | Repo, DB schema + migrations, seed data (§10), auth (login, JWT, RBAC), seed admin+supervisor. |
| **P1 — Mobile core** | Login, today's checklist, status capture + auto-timestamp, remark, submit, history (online only). |
| **P2 — Admin core** | Login, submissions dashboard, sheet detail, checklist item/category CRUD + reorder, user management. |
| **P3 — Field-readiness** | Offline capture + sync, photo capture/upload, issues view, CSV/PDF export, audit log. |
| **P4 — Polish** | Dashboard KPIs, validation hardening, error states, empty/loading states, responsive web. |

---

## 15. Acceptance Criteria (MVP "done")

- A supervisor can log in, complete and submit a full daily checklist offline, and the data appears in the admin portal after reconnecting.
- Server timestamps and supervisor identity are attached to every entry and cannot be edited after submission.
- An admin can add a new check and remove an existing one from the portal; the change appears on the **next** day's mobile checklist while historical sheets remain intact.
- An admin can view any submitted sheet with statuses, timestamps, remarks, and photos, and can filter issues across sheets.
- All endpoints enforce role-based access; passwords are stored hashed; no plaintext secrets in source.
