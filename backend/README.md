# Gurukulam API

Optional, self-hostable FastAPI backend for deployments that need a server-side API. It is **not used by the hosted GitHub Pages application**, whose authoritative user-learning persistence is Google Drive.

## Stack

- FastAPI
- PostgreSQL
- SQLAlchemy
- Google ID-token verification
- JWT application sessions

## Environment

Copy `.env.example` to `.env` and set the values before running.

Required:

- `DATABASE_URL`
- `GOOGLE_CLIENT_ID`
- `JWT_SECRET`
- `ALLOWED_HOSTS` in production (do not use `*`)

The root `/.env.example` belongs to the browser/Vite application. This `/backend/.env.example` belongs only to the FastAPI process and may contain server secrets.

## Local run

```bash
python -m venv .venv
.venv/bin/pip install -r requirements.txt
uvicorn app.main:app --reload
```

On Windows PowerShell, activate `.venv\\Scripts\\Activate.ps1` first.

## Data ownership

This backend stores its own server-side records in PostgreSQL when deployed. It does not write user-access state into the Git repository. The hosted GitHub Pages application does not depend on this backend and continues to use the authenticated parent's Google Drive as its primary persistence layer.
