import json
from typing import Any

from fastapi import APIRouter, HTTPException

from ..db import get_connection

router = APIRouter(prefix="/api", tags=["bootstrap"])


def _decode_json(value: str | None, fallback: Any) -> Any:
    if not value:
        return fallback
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return fallback


@router.get("/bootstrap")
def get_bootstrap() -> dict[str, Any]:
    with get_connection() as connection:
        workspace = connection.execute(
            "SELECT id, name FROM workspaces ORDER BY id LIMIT 1"
        ).fetchone()
        if workspace is None:
            raise HTTPException(status_code=404, detail="Workspace has not been seeded.")

        collection_rows = connection.execute(
            """
            SELECT id, parent_id, name, type, path, position
            FROM collections
            WHERE workspace_id = ?
            ORDER BY path, position, id
            """,
            (workspace["id"],),
        ).fetchall()

        request_rows = connection.execute(
            """
            SELECT collection_id, id, method, url, query_params_json, headers_json, body_mode, body_json, auth_json
            FROM requests
            WHERE collection_id IN (SELECT id FROM collections WHERE workspace_id = ?)
            """,
            (workspace["id"],),
        ).fetchall()
        requests_by_collection = {row["collection_id"]: row for row in request_rows}

        nodes: dict[int, dict[str, Any]] = {}
        roots: list[dict[str, Any]] = []

        for row in collection_rows:
            node = {
                "id": row["id"],
                "parentId": row["parent_id"],
                "name": row["name"],
                "type": row["type"],
                "path": row["path"],
                "children": [],
            }

            request = requests_by_collection.get(row["id"])
            if request is not None:
                node["request"] = {
                    "id": request["id"],
                    "method": request["method"],
                    "url": request["url"],
                    "queryParams": _decode_json(request["query_params_json"], []),
                    "headers": _decode_json(request["headers_json"], []),
                    "bodyMode": request["body_mode"],
                    "body": _decode_json(request["body_json"], {}),
                    "auth": _decode_json(request["auth_json"], {"type": "none"}),
                }

            nodes[row["id"]] = node

        for node in nodes.values():
            parent_id = node["parentId"]
            if parent_id is not None and parent_id in nodes:
                nodes[parent_id]["children"].append(node)
            else:
                roots.append(node)

        environment_rows = connection.execute(
            """
            SELECT id, name, is_active
            FROM environments
            WHERE workspace_id = ?
            ORDER BY is_active DESC, name
            """,
            (workspace["id"],),
        ).fetchall()

        environments = []
        for environment in environment_rows:
            variable_rows = connection.execute(
                """
                SELECT id, key, value, is_enabled
                FROM variables
                WHERE environment_id = ?
                ORDER BY key
                """,
                (environment["id"],),
            ).fetchall()
            environments.append(
                {
                    "id": environment["id"],
                    "name": environment["name"],
                    "isActive": bool(environment["is_active"]),
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
            )

        history_rows = connection.execute(
            """
            SELECT id, request_snapshot_json, response_metadata_json, executed_at
            FROM history
            WHERE workspace_id = ?
            ORDER BY executed_at DESC, id DESC
            LIMIT 25
            """,
            (workspace["id"],),
        ).fetchall()
        history = [
            {
                "id": row["id"],
                "request": _decode_json(row["request_snapshot_json"], {}),
                "response": _decode_json(row["response_metadata_json"], {}),
                "executedAt": row["executed_at"],
            }
            for row in history_rows
        ]

        return {
            "workspace": {"id": workspace["id"], "name": workspace["name"]},
            "collections": roots,
            "environments": environments,
            "history": history,
        }

