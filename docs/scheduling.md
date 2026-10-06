# Scheduling Engine

Availability is **computed**, not pre-materialized into millions of rows.

```text
weekly schedule
+ exceptions (leave / block / override / emergency)
+ clinic holidays
+ existing appointments
+ Redis temporary holds
= available slots
```

Slot generation supports duration, break, and buffer minutes.

Redis key for holds:

```text
booking_lock:{doctorId}:{branchId}:{date}:{time}
```

TTL default: 5 minutes. Expired Redis locks never permanently block DB slots.
