# Payments & SMS integrations

## Payments

| Variable | Description | Default |
|----------|-------------|---------|
| `PAYMENT_PROVIDER` | `mock` or `zarinpal` | `mock` |
| `PAYMENT_CALLBACK_URL` | Browser return URL handled by API | `http://localhost:4000/api/v1/payments/callback` |
| `PAYMENT_WEBHOOK_SECRET` | Optional webhook HMAC secret | — |
| `ZARINPAL_MERCHANT_ID` | Merchant ID (required for live/sandbox API calls) | empty → demo redirect |
| `ZARINPAL_SANDBOX` | `true` uses sandbox endpoints | `true` |

Flow: create intent → redirect to gateway → callback verifies → appointment confirmed (idempotent).

CI and local default to `PAYMENT_PROVIDER=mock`.

## SMS / OTP

| Variable | Description | Default |
|----------|-------------|---------|
| `SMS_PROVIDER` | `mock` or `kavenegar` | `mock` |
| `KAVENEGAR_API_KEY` | Kavenegar API key | — |
| `KAVENEGAR_SENDER` | Sender line | — |

OTP codes are stored in Redis with TTL and per-phone rate limits. When `SMS_PROVIDER=mock`, codes are logged instead of sent.

## Redis & reminders

| Variable | Description |
|----------|-------------|
| `REDIS_HOST` / `REDIS_PORT` | BullMQ + OTP store |
| `REDIS_FALLBACK` | Set to `memory` only for local without Redis |

Appointment create/confirm schedules 24h and 2h reminder jobs when Redis/BullMQ is available.

## Email

SMTP vars (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`) drive the notification email channel.
