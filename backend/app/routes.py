from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import get_settings
from .database import get_db
from .drive_registry import get_drive_access, upsert_drive_access
from .models import Child, Parent
from .schemas import (
    ChildCreate,
    ChildRead,
    ChildUpdate,
    DriveAccessStatus,
    DriveAccessUpdate,
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
        # Do not log the email or any registry contents.
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

    # A newly seen Google account starts as Drive=No until the actual Drive probe succeeds.
    # Existing users are left unchanged here; the real Drive probe is authoritative.
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


@router.get("/children", response_model=list[ChildRead])
def list_children(parent: Parent = Depends(get_current_parent), db: Session = Depends(get_db)):
    return list(db.scalars(select(Child).where(Child.parent_id == parent.id).order_by(Child.created_at)).all())


@router.post("/children", response_model=ChildRead, status_code=status.HTTP_201_CREATED)
def create_child(payload: ChildCreate, parent: Parent = Depends(get_current_parent), db: Session = Depends(get_db)):
    child = Child(parent_id=parent.id, **payload.model_dump())
    db.add(child)
    db.commit()
    db.refresh(child)
    return child


def _owned_child(child_id: str, parent: Parent, db: Session) -> Child:
    child = db.scalar(select(Child).where(Child.child_id == child_id, Child.parent_id == parent.id))
    if child is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Child not found")
    return child


@router.get("/children/{child_id}", response_model=ChildRead)
def get_child(child_id: str, parent: Parent = Depends(get_current_parent), db: Session = Depends(get_db)):
    return _owned_child(child_id, parent, db)


@router.patch("/children/{child_id}", response_model=ChildRead)
def update_child(child_id: str, payload: ChildUpdate, parent: Parent = Depends(get_current_parent), db: Session = Depends(get_db)):
    child = _owned_child(child_id, parent, db)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(child, key, value)
    db.commit()
    db.refresh(child)
    return child


@router.delete("/children/{child_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_child(child_id: str, parent: Parent = Depends(get_current_parent), db: Session = Depends(get_db)):
    child = _owned_child(child_id, parent, db)
    db.delete(child)
    db.commit()
