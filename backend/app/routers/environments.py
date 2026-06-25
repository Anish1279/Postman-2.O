"""
Environments & Variables CRUD router.

Endpoints for creating, renaming, deleting environments and managing
the key-value variables within each environment.
"""

import json
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..db import get_connection

router = APIRouter(prefix="/api/environments", tags=["environments"])


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class CreateEnvironmentPayload(BaseModel):
    workspace_id: int = 1
    name: str
    is_active: bool = False


class RenameEnvironmentPayload(BaseModel):
    name: str


class SetActivePayload(BaseModel):
    workspace_id: int = 1


class VariablePayload(BaseModel):
    key: str
    value: str
    is_enabled: bool = True


class BulkVariablesPayload(BaseModel):
    variables: list[VariablePayload] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _environment_with_variables(conn, env_id: int) -> dict[str, Any] | None:
    """Load an environment row plus its variables as a single dict."""
    env_row = conn.execute(
        "SELECT id, workspace_id, name, is_active FROM environments WHERE id = ?",
        (env_id,),
    ).fetchone()
    if env_row is None:
        return None

    variable_rows = conn.execute(
        "SELECT id, key, value, is_enabled FROM variables WHERE environment_id = ? ORDER BY key",
        (env_id,),
    ).fetchall()

    return {
        "id": env_row["id"],
        "name": env_row["name"],
        "isActive": bool(env_row["is_active"]),
        "variables": [
            {
                "id": row["id"],
                "key": row["key"],
                "value": row["value"],
                "enabled": bool(row["is_enabled"]),
            }
            for row in variable_rows
        ],
    }


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("")
def list_environments(workspace_id: int = 1) -> list[dict[str, Any]]:
    """Return all environments with their variables for a workspace."""
    with get_connection() as conn:
        env_rows = conn.execute(
            "SELECT id FROM environments WHERE workspace_id = ? ORDER BY is_active DESC, name",
            (workspace_id,),
        ).fetchall()

        results = []
        for env_row in env_rows:
            env = _environment_with_variables(conn, env_row["id"])
            if env:
                results.append(env)
        return results


@router.post("")
def create_environment(payload: CreateEnvironmentPayload) -> dict[str, Any]:
    """Create a new environment."""
    with get_connection() as conn:
        cursor = conn.execute(
            "INSERT INTO environments (workspace_id, name, is_active) VALUES (?, ?, ?)",
            (payload.workspace_id, payload.name, int(payload.is_active)),
        )
        env_id = cursor.lastrowid
        conn.commit()
        return _environment_with_variables(conn, env_id)  # type: ignore[return-value]


@router.put("/{env_id}")
def rename_environment(env_id: int, payload: RenameEnvironmentPayload) -> dict[str, str]:
    """Rename an environment."""
    with get_connection() as conn:
        row = conn.execute("SELECT id FROM environments WHERE id = ?", (env_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Environment not found.")

        conn.execute(
            "UPDATE environments SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (payload.name, env_id),
        )
        conn.commit()

    return {"status": "ok", "name": payload.name}


@router.put("/{env_id}/activate")
def activate_environment(env_id: int, payload: SetActivePayload) -> dict[str, str]:
    """Set this environment as the active one for the workspace (deactivates others)."""
    with get_connection() as conn:
        row = conn.execute(
            "SELECT id, workspace_id FROM environments WHERE id = ?",
            (env_id,),
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Environment not found.")

        workspace_id = payload.workspace_id or row["workspace_id"]

        # Deactivate all in workspace, then activate the selected one
        conn.execute(
            "UPDATE environments SET is_active = 0 WHERE workspace_id = ?",
            (workspace_id,),
        )
        conn.execute(
            "UPDATE environments SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (env_id,),
        )
        conn.commit()

    return {"status": "ok"}


@router.delete("/{env_id}")
def delete_environment(env_id: int) -> dict[str, str]:
    """Delete an environment and cascade-delete its variables."""
    with get_connection() as conn:
        row = conn.execute("SELECT id FROM environments WHERE id = ?", (env_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Environment not found.")

        conn.execute("DELETE FROM environments WHERE id = ?", (env_id,))
        conn.commit()

    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Variables within an environment
# ---------------------------------------------------------------------------

@router.put("/{env_id}/variables")
def bulk_update_variables(env_id: int, payload: BulkVariablesPayload) -> dict[str, Any]:
    """
    Replace all variables for an environment with the supplied list.

    This is a full replacement approach: simpler than per-variable CRUD
    and matches how Postman's environment editor works (batch save).
    """
    with get_connection() as conn:
        row = conn.execute("SELECT id FROM environments WHERE id = ?", (env_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Environment not found.")

        # Delete all existing variables for this environment
        conn.execute("DELETE FROM variables WHERE environment_id = ?", (env_id,))

        # Insert the new set
        for var in payload.variables:
            conn.execute(
                "INSERT INTO variables (environment_id, key, value, is_enabled) VALUES (?, ?, ?, ?)",
                (env_id, var.key, var.value, int(var.is_enabled)),
            )

        conn.commit()

        return _environment_with_variables(conn, env_id)  # type: ignore[return-value]


@router.post("/{env_id}/variables")
def add_variable(env_id: int, payload: VariablePayload) -> dict[str, Any]:
    """Add a single variable to an environment."""
    with get_connection() as conn:
        row = conn.execute("SELECT id FROM environments WHERE id = ?", (env_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Environment not found.")

        try:
            cursor = conn.execute(
                "INSERT INTO variables (environment_id, key, value, is_enabled) VALUES (?, ?, ?, ?)",
                (env_id, payload.key, payload.value, int(payload.is_enabled)),
            )
        except Exception:
            raise HTTPException(
                status_code=409,
                detail=f"Variable '{payload.key}' already exists in this environment.",
            )

        conn.commit()

        return {
            "id": cursor.lastrowid,
            "key": payload.key,
            "value": payload.value,
            "enabled": payload.is_enabled,
        }


@router.delete("/{env_id}/variables/{var_id}")
def delete_variable(env_id: int, var_id: int) -> dict[str, str]:
    """Delete a single variable."""
    with get_connection() as conn:
        row = conn.execute(
            "SELECT id FROM variables WHERE id = ? AND environment_id = ?",
            (var_id, env_id),
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Variable not found.")

        conn.execute("DELETE FROM variables WHERE id = ?", (var_id,))
        conn.commit()

    return {"status": "ok"}
