# Gurukulam AI — Stage 2A self-hosted runbook

Stage 2A target: persistent Parent → Child data using FastAPI + PostgreSQL without a subscription.

## 1. Requirements

- A machine you control that can remain on when remote access is required.
- Docker Engine + Docker Compose.
- Git.

## 2. Configure the backend

Copy `backend/.env.example` to `backend/.env` and set:

- `POSTGRES_PASSWORD` to a strong local password.
- `GOOGLE_CLIENT_ID` to the existing Google web client ID.
- `JWT_SECRET` to a long random secret.
- `FRONTEND_ORIGINS` to the origins actually used by the frontend.
- Keep `AUTO_CREATE_SCHEMA=false`.

## 3. Start PostgreSQL + API

From the `backend` directory:

```bash
docker compose up -d --build
```

Apply the versioned SQL baseline before first production use:

```bash
docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < app/migrations/001_initial_schema.sql
docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < app/migrations/002_updated_at_trigger.sql
```

## 4. Verify

- `GET /health` must return `status=ok`.
- `GET /ready` must return `status=ready`.
- Authenticate with Google and exercise Child CRUD.

## 5. Stage 2A acceptance

1. Login with Google.
2. Open Child Dashboard.
3. Open Parents Access.
4. Add a child and record the generated Child ID.
5. Refresh the application; the child must remain available once the frontend is configured for the API.
6. Modify the child and verify the change persists.
7. Delete the child and verify it is removed.
8. Create two children and verify each has a different Child ID.
9. Verify the API rejects access to a Child ID belonging to another parent.
10. Verify timetable data remains scoped to the selected child.

## Important

The repository intentionally does not contain credentials. The GitHub Pages frontend remains safe until `VITE_API_BASE_URL` points to a reachable, configured API. Do not switch the production frontend to an unreachable endpoint.
