# Deployment

## Docker Compose

```bash
docker compose up --build
```

Services: `web`, `api`, `worker`, `postgres`, `redis`.

## CI

GitHub Actions (`.github/workflows/ci.yml`):

Install → Build packages → Prisma generate → Typecheck → Unit tests → Migrate/Seed → E2E → Build → Docker build

## Environment

Copy `.env.example` and set secrets for production (`JWT_*`, `DATABASE_URL`, `REDIS_*`, payment keys).
