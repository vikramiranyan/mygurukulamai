from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import get_settings
from .database import get_db
from .models import Parent

bearer = HTTPBearer(auto_error=False)


def _credentials_error() -> HTTPException:
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials")


def verify_google_credential(credential: str) -> dict:
    settings = get_settings()
    try:
        claims = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            settings.google_client_id,
        )
    except Exception as exc:
        raise _credentials_error() from exc

    if claims.get("iss") not in {"accounts.google.com", "https://accounts.google.com"}:
        raise _credentials_error()
    if not claims.get("sub") or not claims.get("email"):
        raise _credentials_error()
    return claims


def issue_access_token(parent: Parent) -> tuple[str, datetime]:
    settings = get_settings()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": str(parent.id), "exp": expires_at, "type": "parent"}
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256"), expires_at


def get_current_parent(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> Parent:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise _credentials_error()
    try:
        payload = jwt.decode(credentials.credentials, get_settings().jwt_secret, algorithms=["HS256"])
        if payload.get("type") != "parent":
            raise _credentials_error()
        parent_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, TypeError, ValueError) as exc:
        raise _credentials_error() from exc

    parent = db.scalar(select(Parent).where(Parent.id == parent_id))
    if parent is None:
        raise _credentials_error()
    return parent
