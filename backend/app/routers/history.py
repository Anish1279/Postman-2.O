"""
History router.

Logs executions of requests and responses to the history table.
"""

import json
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from ..db import get_connection

router = APIRouter(prefix="/api/history", tags=["history"])


class CreateHistoryPayload(BaseModel):
    workspace_id: int = 1
    request_snapshot: dict[str, Any]
    response_metadata: dict[str, Any]


@router.post("")
def create_history_entry(payload: CreateHistoryPayload) -> dict[str, Any]:
    """Log a request execution to history."""
    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO history (workspace_id, request_snapshot_json, response_metadata_json)
            VALUES (?, ?, ?)
            """,
            (
                payload.workspace_id,
                json.dumps(payload.request_snapshot),
                json.dumps(payload.response_metadata),
            ),
        )
        history_id = cursor.lastrowid

        row = conn.execute(
            "SELECT executed_at FROM history WHERE id = ?",
            (history_id,),
        ).fetchone()

        conn.commit()

        return {
            "id": history_id,
            "request": payload.request_snapshot,
            "response": payload.response_metadata,
            "executedAt": row["executed_at"],
        }
