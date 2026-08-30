from __future__ import annotations

import base64
import hashlib
import hmac
import json
import urllib.error
import urllib.request
from dataclasses import dataclass

from .config import get_settings


@dataclass(frozen=True)
class DriveAccessRecord:
    user_key: str
    drive_access: bool


def _user_key(email: str) -> str:
    settings = get_settings()
    normalized = email.strip().lower().encode("utf-8")
    if not settings.drive_registry_hmac_secret:
        raise RuntimeError("Drive registry HMAC secret is not configured")
    return hmac.new(
        settings.drive_registry_hmac_secret.encode("utf-8"), normalized, hashlib.sha256
    ).hexdigest()


def _api_url() -> str:
    settings = get_settings()
    return (
        f"https://api.github.com/repos/{settings.github_repository}/contents/"
        f"{settings.github_drive_registry_path}"
    )


def _request(method: str, url: str, payload: bytes | None = None) -> dict:
    settings = get_settings()
    if not settings.github_token or not settings.github_repository:
        raise RuntimeError("GitHub Drive registry is not configured")

    request = urllib.request.Request(url, data=payload, method=method)
    request.add_header("Authorization", f"Bearer {settings.github_token}")
    request.add_header("Accept", "application/vnd.github+json")
    request.add_header("X-GitHub-Api-Version", "2022-11-28")
    request.add_header("User-Agent", "Gurukulam-AI-Drive-Registry")
    if payload is not None:
        request.add_header("Content-Type", "application/json")

    try:
        with urllib.request.urlopen(request, timeout=8) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"GitHub registry request failed ({exc.code}): {body[:300]}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"GitHub registry connection failed: {exc.reason}") from exc


def _read_registry() -> tuple[list[dict], str]:
    response = _request("GET", _api_url())
    content = base64.b64decode(response["content"].replace("\n", "")).decode("utf-8")
    data = json.loads(content or "{}")
    users = data.get("users", [])
    if not isinstance(users, list):
        raise RuntimeError("Drive registry has an invalid format")
    return users, response["sha"]


def _write_registry(users: list[dict], sha: str) -> None:
    settings = get_settings()
    document = json.dumps({"users": users}, indent=2, sort_keys=True) + "\n"
    payload = json.dumps(
        {
            "message": "Update Google Drive access registry",
            "content": base64.b64encode(document.encode("utf-8")).decode("ascii"),
            "sha": sha,
            "branch": settings.github_branch,
        }
    ).encode("utf-8")
    _request("PUT", _api_url(), payload)


def upsert_drive_access(email: str, drive_access: bool) -> DriveAccessRecord:
    """Store only a keyed user identifier and the current Drive access state.

    The repository is public, so the raw Gmail address is deliberately not written
    to GitHub. The keyed HMAC is stable for lookup but cannot be reversed without
    the server-side secret.
    """
    user_key = _user_key(email)

    for _ in range(3):
        users, sha = _read_registry()
        existing = next((item for item in users if item.get("user_key") == user_key), None)
        if existing is not None and bool(existing.get("drive_access")) == drive_access:
            return DriveAccessRecord(user_key=user_key, drive_access=drive_access)

        if existing is None:
            users.append({"user_key": user_key, "drive_access": drive_access})
        else:
            existing["drive_access"] = drive_access

        try:
            _write_registry(users, sha)
            return DriveAccessRecord(user_key=user_key, drive_access=drive_access)
        except RuntimeError as exc:
            if "(409)" not in str(exc):
                raise

    raise RuntimeError("Drive registry could not be updated because of concurrent changes")


def get_drive_access(email: str) -> DriveAccessRecord | None:
    user_key = _user_key(email)
    users, _ = _read_registry()
    existing = next((item for item in users if item.get("user_key") == user_key), None)
    if existing is None:
        return None
    return DriveAccessRecord(user_key=user_key, drive_access=bool(existing.get("drive_access")))
