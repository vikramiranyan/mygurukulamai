from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    google_client_id: str
    jwt_secret: str
    frontend_origins: str = "http://localhost:5173"
    jwt_expire_minutes: int = 60
    auto_create_schema: bool = False

    # Server-side GitHub registry configuration. Never expose these to the frontend.
    github_token: str = ""
    github_repository: str = "vikramiranyan/mygurukulamai"
    github_drive_registry_path: str = "data/drive-access-users.json"
    github_branch: str = "main"
    drive_registry_hmac_secret: str = ""
    # Base64url-encoded 32-byte AES-256-GCM key. Keep only in the backend secret store.
    drive_registry_encryption_key: str = ""

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.frontend_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
