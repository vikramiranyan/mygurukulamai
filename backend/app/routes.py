from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import get_settings
from .database import get_db
from .drive_registry import get_drive_access, upsert_drive_access
from .models import Parent
from .schemas import (
    DriveAccessStatus,
    DriveAccessUpdate,
    GoogleDriveAccessUpdate,
    GoogleSignInRequest,
    ParentSession,
)
from .security import get_current_parent, issue_access_token, verify_google_credential

router = APIRouter()


def _sync_registry(email: str, drive_access: bool) -> None:
    """Registry persistence is auxiliary; a GitHub outage must not block login/Drive."""
    settings = get_settings()
    if not settings.github_token or not settings.drive_registry_hmac_secret:
        return
    try:
        upsert_drive_access(email, drive_access)
    except Exception:
        # Registry persistence is auxiliary and must never block login/Drive access.
        return


@router.post("/auth/google", response_model=ParentSession)
def google_sign_in(payload: GoogleSignInRequest, db: Session = Depends(get_db)):
    claims = verify_google_credential(payload.credential)
    parent = db.scalar(select(Parent).where(Parent.google_sub == claims["sub"]))
    if parent is None:
        parent = Parent(
            google_sub=claims["sub"],
            email=claims["email"],
            display_name=(claims.get("name") or claims["email"].split("@")[0]).strip(),
        )
        db.add(parent)
    else:
        parent.email = claims["email"]
        parent.display_name = (claims.get("name") or parent.display_name).strip()
    db.commit()
    db.refresh(parent)

    try:
        if get_drive_access(parent.email) is None:
            _sync_registry(parent.email, False)
    except Exception:
        pass

    access_token, expires_at = issue_access_token(parent)
    try:
        registry = get_drive_access(parent.email)
        drive_access = registry.drive_access if registry else False
    except Exception:
        drive_access = None
    return ParentSession(access_token=access_token, expires_at=expires_at, drive_access=drive_access)


@router.post("/auth/drive-access/google", response_model=DriveAccessStatus)
def update_drive_access_with_google_credential(payload: GoogleDriveAccessUpdate):
    """Update the registry using a freshly issued Google ID token.

    This endpoint deliberately accepts only a Google ID token, verifies it against
    the configured OAuth client, and derives the registry identity from Google's
    verified email. The raw credential is never stored.
    """
    claims = verify_google_credential(payload.credential)
    settings = get_settings()
    if not settings.github_token or not settings.drive_registry_hmac_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Drive access registry is not configured",
        )
    try:
        record = upsert_drive_access(claims["email"], payload.drive_access)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Drive access registry could not be updated",
        ) from exc
    return DriveAccessStatus(drive_access=record.drive_access, registry_configured=True)


@router.get("/auth/drive-access", response_model=DriveAccessStatus)
def drive_access_status(parent: Parent = Depends(get_current_parent)):
    settings = get_settings()
    if not settings.github_token or not settings.drive_registry_hmac_secret:
        return DriveAccessStatus(drive_access=None, registry_configured=False)
    try:
        record = get_drive_access(parent.email)
        return DriveAccessStatus(
            drive_access=record.drive_access if record else False,
            registry_configured=True,
        )
    except Exception:
        return DriveAccessStatus(drive_access=None, registry_configured=True)


@router.post("/auth/drive-access", response_model=DriveAccessStatus)
def update_drive_access(
    payload: DriveAccessUpdate,
    parent: Parent = Depends(get_current_parent),
):
    settings = get_settings()
    if not settings.github_token or not settings.drive_registry_hmac_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Drive access registry is not configured",
        )
    try:
        record = upsert_drive_access(parent.email, payload.drive_access)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Drive access registry could not be updated",
        ) from exc
    return DriveAccessStatus(drive_access=record.drive_access, registry_configured=True)
