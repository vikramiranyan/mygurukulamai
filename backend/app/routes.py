from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import get_db
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


@router.post("/auth/google", response_model=ParentSession)
def google_sign_in(payload: GoogleSignInRequest, db: Session = Depends(get_db)):
    claims = verify_google_credential(payload.credential)
    parent = db.scalar(select(Parent).where(Parent.google_sub == claims["sub"]))
    if parent is None:
        parent = Parent(
            google_sub=claims["sub"],
            email=claims["email"],
            display_name=(claims.get("name") or claims["email"].split("@")[0]).strip(),
            drive_access=False,
        )
        db.add(parent)
    else:
        parent.email = claims["email"]
        parent.display_name = (claims.get("name") or parent.display_name).strip()
    db.commit()
    db.refresh(parent)

    access_token, expires_at = issue_access_token(parent)
    return ParentSession(
        access_token=access_token,
        expires_at=expires_at,
        drive_access=parent.drive_access,
    )


@router.post("/auth/drive-access/google", response_model=DriveAccessStatus)
def update_drive_access_with_google_credential(
    payload: GoogleDriveAccessUpdate,
    db: Session = Depends(get_db),
):
    """Update Drive authorization state for a verified Google account.

    The credential is verified and used only to locate the parent row. No Google
    credential or user registry is persisted by this endpoint.
    """
    claims = verify_google_credential(payload.credential)
    parent = db.scalar(select(Parent).where(Parent.google_sub == claims["sub"]))
    if parent is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent account not found")
    parent.drive_access = payload.drive_access
    db.commit()
    db.refresh(parent)
    return DriveAccessStatus(drive_access=parent.drive_access, registry_configured=True)


@router.get("/auth/drive-access", response_model=DriveAccessStatus)
def drive_access_status(parent: Parent = Depends(get_current_parent)):
    return DriveAccessStatus(drive_access=parent.drive_access, registry_configured=True)


@router.post("/auth/drive-access", response_model=DriveAccessStatus)
def update_drive_access(
    payload: DriveAccessUpdate,
    parent: Parent = Depends(get_current_parent),
    db: Session = Depends(get_db),
):
    parent.drive_access = payload.drive_access
    db.commit()
    db.refresh(parent)
    return DriveAccessStatus(drive_access=parent.drive_access, registry_configured=True)
