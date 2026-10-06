# Payments

Provider-agnostic interface (`PAYMENT_PROVIDER`).

Providers:

- `mock` — local/CI default
- `zarinpal` — real gateway (`ZARINPAL_MERCHANT_ID`, `ZARINPAL_SANDBOX`)

Flow:

```text
Appointment → Payment Intent → Gateway → Callback/Webhook → Verify → Confirm Appointment
```

Idempotency via `idempotency_key` and immutable `payment_transactions`. Duplicate webhooks do not create duplicate charges.

Refunds and invoices are available under admin payments/refunds UI (`POST /payments/:id/refund`, `POST /payments/invoices`).

See also [Integrations](./integrations.md).
