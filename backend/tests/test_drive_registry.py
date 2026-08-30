import os

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///./ci.db")
os.environ.setdefault("GOOGLE_CLIENT_ID", "ci-test-client")
os.environ.setdefault("JWT_SECRET", "ci-test-secret-for-validation-only")
os.environ.setdefault("DRIVE_REGISTRY_HMAC_SECRET", "ci-registry-secret")

from app.drive_registry import _user_key


def test_user_key_is_stable_and_does_not_expose_email():
    first = _user_key("Parent.Example@gmail.com")
    second = _user_key("parent.example@gmail.com")
    assert first == second
    assert "@" not in first
    assert "gmail" not in first.lower()
    assert len(first) == 64
