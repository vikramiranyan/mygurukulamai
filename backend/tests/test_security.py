import os

import jwt
import pytest

os.environ.setdefault("DATABASE_URL", "sqlite:///./test-gurukulam.db")
os.environ.setdefault("GOOGLE_CLIENT_ID", "test-client-id.apps.googleusercontent.com")
os.environ.setdefault("JWT_SECRET", "test-secret-that-is-long-enough-for-hs256")
os.environ.setdefault("FRONTEND_ORIGINS", "http://localhost:5173")
os.environ.setdefault("SECURE_HEADERS", "true")
os.environ.setdefault("ALLOWED_HOSTS", "localhost")

from app.config import get_settings
from app.models import Parent
from app.security import issue_access_token, verify_google_credential


def test_jwt_contains_required_security_claims():
    get_settings.cache_clear()
    parent = Parent(id=42, google_sub="google-sub", email="parent@example.com", display_name="Parent")
    token, expires_at = issue_access_token(parent)
    settings = get_settings()
    payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"], issuer=settings.jwt_issuer, audience=settings.jwt_audience)
    assert payload["sub"] == "42"
    assert payload["type"] == "parent"
    assert payload["jti"]
    assert expires_at.timestamp() == pytest.approx(payload["exp"], abs=1)


def test_google_credential_requires_verified_identity(monkeypatch):
    get_settings.cache_clear()
    monkeypatch.setattr("app.security.id_token.verify_oauth2_token", lambda *args, **kwargs: {
        "sub": "google-sub",
        "email": "parent@example.com",
        "email_verified": False,
        "iss": "https://accounts.google.com",
    })
    with pytest.raises(Exception):
        verify_google_credential("credential")
