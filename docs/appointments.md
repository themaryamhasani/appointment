# Appointments

## State machine

```text
PENDING → CONFIRMED → CHECKED_IN → IN_PROGRESS → COMPLETED
```

Side transitions: cancel, no-show, reject, expire.

Invalid transitions are rejected by `AppointmentStateMachine`.

Status history is persisted on every change.

## Concurrency

Booking uses:

1. Application availability check
2. Redis temporary reservation (optional)
3. Serializable / unique-constraint DB transaction

Automated test: `apps/api/test/concurrency.e2e-spec.ts`
