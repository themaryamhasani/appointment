# MediClinic — Healthcare Appointment Platform

Multi-tenant healthcare appointment and clinic management platform (modular monolith).

## Overview

Patients can search doctors, view availability, book appointments, pay online, and manage visits/prescriptions.

Clinic staff can manage clinics, branches, doctors, schedules, appointments, visits, payments, reports, staff, and audit logs.

## Architecture

```text
apps/web     → Next.js (App Router) + next-intl (fa/en, RTL/LTR)
apps/api     → NestJS REST API + Prisma + BullMQ
packages/*   → Shared types, validation, config
```

**Tenancy:** Shared database / shared schema / `clinic_id` isolation enforced in services.

## Tech Stack

| Layer | Stack |
|-------|--------|
| Frontend | Next.js 15, TypeScript, Tailwind, TanStack Query, Zustand, RHF + Zod, next-intl |
| Backend | NestJS, Prisma, PostgreSQL, Redis, BullMQ |
| Auth | JWT + refresh rotation, HTTP-only cookies |
| Docs | Swagger at `/docs` |

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for Postgres + Redis)

### 1. Install

```bash
pnpm install
cp .env.example .env
cp .env apps/api/.env
```

### 2. Infrastructure

```bash
docker compose up -d postgres redis
```

### 3. Database

```bash
pnpm --filter @healthcare/types build
pnpm --filter @healthcare/validation build
pnpm --filter @healthcare/config build
pnpm --filter @healthcare/api prisma:generate
pnpm --filter @healthcare/api exec prisma migrate dev --name init
pnpm db:seed
```

### 4. Run

```bash
pnpm dev:api    # http://localhost:4000  Swagger: /docs
pnpm dev:web    # http://localhost:3000
```

Or full stack:

```bash
docker compose up --build
```

## Demo Users

Password for all: `Demo@123456`

| Email | Role |
|-------|------|
| superadmin@example.com | Super Admin |
| clinicadmin@example.com | Clinic Admin |
| doctor@example.com | Doctor |
| secretary@example.com | Secretary |
| patient@example.com | Patient |

## Tests

```bash
pnpm --filter @healthcare/api test
pnpm --filter @healthcare/api test:e2e   # includes double-booking concurrency test
```

## Project Structure

```text
healthcare-platform/
  apps/web/
  apps/api/
  packages/types|validation|config|ui/
  docker/
  docs/
  infrastructure/
```

## Documentation

- [Architecture](docs/architecture.md)
- [Database](docs/database.md)
- [Authentication](docs/authentication.md)
- [Authorization](docs/authorization.md)
- [Scheduling](docs/scheduling.md)
- [Appointments](docs/appointments.md)
- [Payments](docs/payments.md)
- [Integrations (Zarinpal / Kavenegar / Redis)](docs/integrations.md)
- [Deployment](docs/deployment.md)

## Advanced modules

Services, lab requests, waiting list, doctor reviews, insurance, telehealth meeting links, file uploads, refunds & invoices — all clinic-scoped via `clinic_id`.

Admin UI: `/admin/services`, `/admin/waiting-list`, `/admin/lab-requests`, `/admin/insurance`, `/admin/refunds`.

Patient: `/waiting-list`, `/profile/insurance`, `/doctors/[slug]/review`.

## License

Private / portfolio project.
"# appointment" 
