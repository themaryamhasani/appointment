# Database

Prisma ORM on PostgreSQL.

## Tenancy

All clinic-scoped tables include `clinic_id` (directly or via branch). Services call `assertClinicAccess` before reads/writes.

## Critical constraint

```text
UNIQUE (doctor_id, branch_id, appointment_date, start_time)
```

This is the final protection against double booking.

## Time storage

- All timestamps stored in UTC
- `clinic.timezone` used for presentation and availability windows
- Slot times stored as `HH:mm` local to clinic schedule definition

See `apps/api/prisma/schema.prisma` for the full model.
