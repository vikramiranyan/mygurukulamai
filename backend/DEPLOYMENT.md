# Gurukulam AI backend deployment

## Required runtime variables

- `DATABASE_URL` — PostgreSQL connection URI
- `GOOGLE_CLIENT_ID` — Google OAuth client ID used by the frontend
- `JWT_SECRET` — long random secret for API sessions
- `FRONTEND_ORIGINS` — comma-separated allowed browser origins
- `AUTO_CREATE_SCHEMA=false` in production
- `GITHUB_TOKEN` — server-only fine-grained GitHub token with **Contents: Read and write** access to the Gurukulam repository
- `GITHUB_REPOSITORY` — repository containing the registry (default: `vikramiranyan/mygurukulamai`)
- `GITHUB_DRIVE_REGISTRY_PATH` — registry path (default: `data/drive-access-users.json`)
- `GITHUB_BRANCH` — registry branch (default: `main`)
- `DRIVE_REGISTRY_HMAC_SECRET` — long random server-only secret used to derive a non-reversible user key from the verified Google email

The GitHub token and HMAC secret are **backend-only**. Never expose either through `VITE_*` variables or browser code.

The repository is currently public. Therefore the registry intentionally does **not** store raw Gmail addresses. It stores a stable HMAC user key plus `drive_access: true/false`. The backend can match the verified Google email to the same key, while the public repository cannot reveal the email address.

## Drive access behavior

1. Google Sign-In establishes the user identity.
2. Gurukulam requests the minimum Drive scope already defined by the frontend (`drive.file`).
3. A successful authenticated Drive probe is the authoritative indication that Drive is currently usable.
4. On successful Drive access, the backend registry is updated to `true`.
5. If the user denies authorization, or Google reports an authorization failure (401/403), the registry is updated to `false`.
6. A transient Drive/network failure does not automatically mean access was revoked.
7. When the user enters **Parents Access** or **Child Dashboard**, Gurukulam re-probes the existing Drive token. If it is stale/revoked, the stale token is discarded and the existing Google grant is silently requested again.
8. Registry failures never block Google Drive itself; the registry is auxiliary state.

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
