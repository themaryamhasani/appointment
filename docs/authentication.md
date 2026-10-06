# Authentication

- Email or phone + password
- Access JWT (short-lived) + refresh token (rotated)
- Refresh tokens stored hashed; family-based rotation
- HTTP-only cookies for access/refresh
- Logout / logout-all (revoke sessions)
- bcrypt password hashing (cost 12)
- Rate limiting via Nest Throttler

## Endpoints

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/logout-all`
- `GET /auth/me`
