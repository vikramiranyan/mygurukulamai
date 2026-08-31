from datetime import datetime

from pydantic import BaseModel, Field


class ParentSession(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: datetime
    drive_access: bool | None = None


class GoogleSignInRequest(BaseModel):
    credential: str = Field(min_length=20)


class DriveAccessUpdate(BaseModel):
    drive_access: bool


class GoogleDriveAccessUpdate(BaseModel):
    credential: str = Field(min_length=20)
    drive_access: bool


class DriveAccessStatus(BaseModel):
    drive_access: bool | None = None
    registry_configured: bool
