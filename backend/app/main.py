from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from .config import get_settings
from .database import Base, engine
from .routes import router

settings = get_settings()
app = FastAPI(title="Gurukulam AI API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Local/dev bootstrap only. Production schema changes must use the versioned
# SQL migration files under app/migrations rather than startup DDL.
if settings.auto_create_schema:
    Base.metadata.create_all(bind=engine)

app.include_router(router, prefix="/api")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "gurukulam-api"}


@app.get("/ready")
def readiness() -> dict[str, str]:
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    return {"status": "ready", "service": "gurukulam-api"}
