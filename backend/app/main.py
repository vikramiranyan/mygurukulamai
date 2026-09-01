from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from sqlalchemy import text

from .config import get_settings
from .database import Base, engine
from .routes import router

settings = get_settings()
app = FastAPI(title="Gurukulam AI API", version="0.3.0", docs_url=None if settings.secure_headers else "/docs", redoc_url=None if settings.secure_headers else "/redoc")

if settings.host_allowlist != ["*"]:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.host_allowlist)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        if settings.secure_headers:
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.headers["X-Frame-Options"] = "DENY"
            response.headers["Referrer-Policy"] = "no-referrer"
            response.headers["Permissions-Policy"] = "microphone=(self), camera=(), geolocation=()"
            response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
            if request.url.scheme == "https":
                response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


app.add_middleware(SecurityHeadersMiddleware)

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
