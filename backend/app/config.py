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
    # Development-safe default. Production must explicitly provide the backend
    # host allowlist; wildcard hosts are intentionally not accepted.
    allowed_hosts: str = "localhost,127.0.0.1"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    @field_validator("frontend_origins")
    @classmethod
    def validate_frontend_origins(cls, value: str) -> str:
        origins = [item.strip() for item in value.split(",") if item.strip()]
        if not origins:
            raise ValueError("frontend_origins must contain at least one origin")
        return ",".join(origins)

    @field_validator("allowed_hosts")
    @classmethod
    def validate_allowed_hosts(cls, value: str) -> str:
        hosts = [item.strip() for item in value.split(",") if item.strip()]
        if not hosts:
            raise ValueError("allowed_hosts must contain at least one host")
        if "*" in hosts:
            raise ValueError("allowed_hosts must not contain wildcard '*'")
        return ",".join(hosts)

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.frontend_origins.split(",") if origin.strip()]

    @property
    def host_allowlist(self) -> list[str]:
        return [host.strip() for host in self.allowed_hosts.split(",") if host.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
