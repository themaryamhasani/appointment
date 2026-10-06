# Architecture

Modular monolith with clear module boundaries for future extraction.

## Principles

- Shared PostgreSQL schema with `clinic_id` tenant isolation
- Domain modules own their controllers/services
- Cross-cutting: auth, audit, redis, queues
- API is source of truth; frontend never bypasses tenant/RBAC rules

## Module Map

| Module | Responsibility |
|--------|----------------|
| auth | Login, JWT, refresh rotation, sessions |
| clinics / branches | Tenant structure |
| doctors / specialties | Provider directory |
| schedules | Recurring hours + exceptions |
| appointments | Booking, state machine, concurrency |
| visits / prescriptions / medical-records | Clinical data |
| payments | Provider-agnostic intents + webhooks |
| notifications | Async SMS/email/push/in-app |
| reports | Tenant-scoped operational metrics |
| audit | Immutable action log |

## Request Flow

```text
Client → Nest guards (JWT + Permissions)
      → Service (tenant assert + business rules)
      → Prisma transaction
      → Queue jobs (notifications)
```
