# Gurukulam AI backend deployment

## Required runtime variables

- `DATABASE_URL` — PostgreSQL connection URI
- `GOOGLE_CLIENT_ID` — Google OAuth client ID used by the frontend
- `JWT_SECRET` — long random secret for API sessions
- `FRONTEND_ORIGINS` — comma-separated allowed browser origins
- `AUTO_CREATE_SCHEMA=false` in production

## Container

The backend is packaged by `backend/Dockerfile` and starts with:

`uvicorn app.main:app --host 0.0.0.0 --port $PORT`

The platform must expose HTTPS and forward requests to the container port.

## Readiness

Use `GET /health` for process health and `GET /ready` for database readiness.

## Database

Apply the versioned SQL files under `backend/app/migrations/` before enabling the live frontend API. Do not enable automatic schema creation in production.

## Zero-cost constraint

The deployment target must have a genuinely free, non-expiring compute option and must not require a paid subscription. Database persistence must also be non-expiring under the selected free plan. If a provider's free database expires or requires payment, do not use it for Gurukulam production.
