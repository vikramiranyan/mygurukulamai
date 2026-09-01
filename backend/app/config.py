from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    google_client_id: str
    jwt_secret: str = Field(min_length=32)
    frontend_origins: str = "http://localhost:5173"
    jwt_expire_minutes: int = Field(default=60, ge=5, le=1440)
    jwt_issuer: str = "gurukulam-ai"
    jwt_audience: str = "gurukulam-ai-parent"
    auto_create_schema: bool = False
    secure_headers: bool = True
    allowed_hosts: str = "*"

    # Server-side GitHub registry configuration. Never expose these to the frontend.
    github_token: str = ""
    github_repository: str = "vikramiranyan/mygurukulamai"
    github_drive_registry_path: str = "data/drive-access-users.json"
    github_branch: str = "main"
    drive_registry_hmac_secret: str = ""
    # Base64url-encoded 32-byte AES-256-GCM key. Keep only in the backend secret store.
    drive_registry_encryption_key: str = ""

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    @field_validator("frontend_origins")
    @classmethod
    def validate_frontend_origins(cls, value: str) -> str:
        origins = [item.strip() for item in value.split(",") if item.strip()]
        if not origins:
            raise ValueError("frontend_origins must contain at least one origin")
        return ",".join(origins)

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.frontend_origins.split(",") if origin.strip()]

    @property
    def host_allowlist(self) -> list[str]:
        return [host.strip() for host in self.allowed_hosts.split(",") if host.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
