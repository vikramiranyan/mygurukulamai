from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


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


class ChildCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    date_of_birth: date | None = None
    gender: str | None = Field(default=None, max_length=50)
    grade: str | None = Field(default=None, max_length=50)
    section: str | None = Field(default=None, max_length=50)
    school_name: str | None = Field(default=None, max_length=255)
    school_board: str | None = Field(default=None, max_length=100)


class ChildUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    date_of_birth: date | None = None
    gender: str | None = Field(default=None, max_length=200)
    grade: str | None = Field(default=None, max_length=50)
    section: str | None = Field(default=None, max_length=50)
    school_name: str | None = Field(default=None, max_length=255)
    school_board: str | None = Field(default=None, max_length=100)


class ChildRead(ChildCreate):
    model_config = ConfigDict(from_attributes=True)

    child_id: str
    created_at: datetime
    updated_at: datetime
