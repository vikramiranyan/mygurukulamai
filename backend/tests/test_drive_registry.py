import os

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///./ci.db")
os.environ.setdefault("GOOGLE_CLIENT_ID", "ci-test-client")
os.environ.setdefault("JWT_SECRET", "ci-test-secret-for-validation-only")
os.environ.setdefault("DRIVE_REGISTRY_HMAC_SECRET", "ci-registry-secret")
os.environ.setdefault("DRIVE_REGISTRY_ENCRYPTION_KEY", "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")

from app.drive_registry import _decrypt_registry, _encrypt_registry, _user_key


def test_user_key_is_stable_and_does_not_expose_email():
    first = _user_key("Parent.Example@gmail.com")
    second = _user_key("parent.example@gmail.com")
    assert first == second
    assert "@" not in first
    assert "gmail" not in first.lower()
    assert len(first) == 64


def test_registry_is_encrypted_and_round_trips():
    users = [{"user_key": _user_key("parent.example@gmail.com"), "drive_access": True}]
    encrypted = _encrypt_registry(users)
    assert "parent.example@gmail.com" not in encrypted
    assert "drive_access" not in encrypted
    assert '"users"' not in encrypted
    assert _decrypt_registry(encrypted) == users


def test_encrypted_registry_rejects_tampering():
    encrypted = _encrypt_registry([])
    tampered = encrypted.replace("ciphertext", "ciphertextX", 1)
    try:
        _decrypt_registry(tampered)
    except RuntimeError:
        pass
    else:
        raise AssertionError("Tampered registry must not decrypt successfully")
