from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..db import get_connection

router = APIRouter(prefix="/api/cookies", tags=["cookies"])

class CookiePayload(BaseModel):
    workspace_id: int = 1
    domain: str
    name: str
    value: str
    path: str = "/"
    secure: bool = False
    http_only: bool = False

@router.get("")
def list_cookies(workspace_id: int = 1) -> list[dict[str, Any]]:
    """List all cookies for the workspace."""
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, domain, name, value, path, secure, http_only, created_at, updated_at
            FROM cookies
            WHERE workspace_id = ?
            ORDER BY domain ASC, name ASC
            """,
            (workspace_id,)
        ).fetchall()
        
        return [
            {
                "id": row["id"],
                "domain": row["domain"],
                "name": row["name"],
                "value": row["value"],
                "path": row["path"],
                "secure": bool(row["secure"]),
                "http_only": bool(row["http_only"]),
                "created_at": row["created_at"],
                "updated_at": row["updated_at"],
            }
            for row in rows
        ]

@router.post("")
def create_cookie(payload: CookiePayload) -> dict[str, Any]:
    """Create a new cookie."""
    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO cookies (workspace_id, domain, name, value, path, secure, http_only)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (payload.workspace_id, payload.domain, payload.name, payload.value, payload.path, int(payload.secure), int(payload.http_only))
        )
        conn.commit()
        return {"id": cursor.lastrowid, "domain": payload.domain, "name": payload.name, "value": payload.value}

@router.put("/{cookie_id}")
def update_cookie(cookie_id: int, payload: CookiePayload) -> dict[str, Any]:
    """Update an existing cookie."""
    with get_connection() as conn:
        cursor = conn.execute(
            """
            UPDATE cookies
            SET domain = ?, name = ?, value = ?, path = ?, secure = ?, http_only = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND workspace_id = ?
            """,
            (payload.domain, payload.name, payload.value, payload.path, int(payload.secure), int(payload.http_only), cookie_id, payload.workspace_id)
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Cookie not found")
        conn.commit()
        return {"id": cookie_id, "domain": payload.domain, "name": payload.name, "value": payload.value}

@router.delete("/{cookie_id}")
def delete_cookie(cookie_id: int) -> dict[str, Any]:
    """Delete a cookie."""
    with get_connection() as conn:
        cursor = conn.execute("DELETE FROM cookies WHERE id = ?", (cookie_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Cookie not found")
        conn.commit()
        return {"status": "ok"}
