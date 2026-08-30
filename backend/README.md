# Gurukulam API

Free/self-hostable backend foundation for Parent → Child data.

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

## Local run

```bash
python -m venv .venv
.venv/bin/pip install -r requirements.txt
uvicorn app.main:app --reload
```

On Windows PowerShell, activate `.venv\\Scripts\\Activate.ps1` first.

The API is intentionally independent of the GitHub Pages frontend so the frontend can later point to any self-hosted FastAPI instance without changing the data model.
