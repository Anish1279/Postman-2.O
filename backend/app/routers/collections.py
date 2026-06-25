"""
Collections CRUD router.

Endpoints for managing the collection tree (folders + saved requests).
Hierarchy is modelled via the materialized‑path column ``collections.path``.
"""

import json
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..db import get_connection

router = APIRouter(prefix="/api/collections", tags=["collections"])


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class CreateFolderPayload(BaseModel):
    workspace_id: int = 1
    parent_id: int | None = None
    name: str


class CreateRequestPayload(BaseModel):
    workspace_id: int = 1
    parent_id: int | None = None
    name: str = "Untitled Request"
    method: str = "GET"
    url: str = ""
    queryParams: list[dict] = Field(default_factory=list)
    headers: list[dict] = Field(default_factory=list)
    bodyMode: str = "none"
    body: dict = Field(default_factory=dict)
    auth: dict = Field(default_factory=lambda: {"type": "none"})
    scripts: dict = Field(default_factory=lambda: {"preRequest": "", "test": ""})


class RenamePayload(BaseModel):
    name: str


class UpdateRequestPayload(BaseModel):
    name: str | None = None
    method: str | None = None
    url: str | None = None
    queryParams: list[dict] | None = None
    headers: list[dict] | None = None
    bodyMode: str | None = None
    body: dict | None = None
    auth: dict | None = None
    scripts: dict | None = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _json(data: object) -> str:
    """Compact JSON serialisation."""
    return json.dumps(data, separators=(",", ":"))


def _decode_json(value: str | None, fallback: Any) -> Any:
    if not value:
        return fallback
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return fallback


def _next_position(conn, workspace_id: int, parent_id: int | None) -> int:
    """Return the next ``position`` value for a new sibling."""
    if parent_id is None:
        row = conn.execute(
            "SELECT COALESCE(MAX(position), 0) + 1 AS pos FROM collections WHERE workspace_id = ? AND parent_id IS NULL",
            (workspace_id,),
        ).fetchone()
    else:
        row = conn.execute(
            "SELECT COALESCE(MAX(position), 0) + 1 AS pos FROM collections WHERE workspace_id = ? AND parent_id = ?",
            (workspace_id, parent_id),
        ).fetchone()
    return row["pos"]


def _build_path(conn, collection_id: int) -> str:
    """Build a materialized path like /1/5/ by walking parent pointers."""
    parts: list[str] = []
    current_id: int | None = collection_id
    while current_id is not None:
        parts.append(str(current_id))
        row = conn.execute("SELECT parent_id FROM collections WHERE id = ?", (current_id,)).fetchone()
        current_id = row["parent_id"] if row else None
    parts.reverse()
    return "/" + "/".join(parts) + "/"


def _build_tree(conn, workspace_id: int) -> list[dict[str, Any]]:
    """Build the full collection tree with nested request data."""
    collection_rows = conn.execute(
        """
        SELECT id, parent_id, name, type, path, position
        FROM collections
        WHERE workspace_id = ?
        ORDER BY path, position, id
        """,
        (workspace_id,),
    ).fetchall()

    request_rows = conn.execute(
        """
        SELECT collection_id, id, method, url, query_params_json, headers_json, body_mode, body_json, auth_json, scripts_json
        FROM requests
        WHERE collection_id IN (SELECT id FROM collections WHERE workspace_id = ?)
        """,
        (workspace_id,),
    ).fetchall()
    requests_by_collection = {row["collection_id"]: row for row in request_rows}

    nodes: dict[int, dict[str, Any]] = {}
    roots: list[dict[str, Any]] = []

    for row in collection_rows:
        node: dict[str, Any] = {
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
                "scripts": _decode_json(request["scripts_json"], {"preRequest": "", "test": ""}),
            }

        nodes[row["id"]] = node

    for node in nodes.values():
        parent_id = node["parentId"]
        if parent_id is not None and parent_id in nodes:
            nodes[parent_id]["children"].append(node)
        else:
            roots.append(node)

    return roots


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("")
def list_collections(workspace_id: int = 1) -> list[dict[str, Any]]:
    """Return the full collection tree for a workspace."""
    with get_connection() as conn:
        return _build_tree(conn, workspace_id)


@router.post("/folder")
def create_folder(payload: CreateFolderPayload) -> dict[str, Any]:
    """Create a new folder in the collection tree."""
    with get_connection() as conn:
        # Validate parent exists if provided
        if payload.parent_id is not None:
            parent = conn.execute("SELECT id, type FROM collections WHERE id = ?", (payload.parent_id,)).fetchone()
            if parent is None:
                raise HTTPException(status_code=404, detail="Parent collection not found.")
            if parent["type"] != "folder":
                raise HTTPException(status_code=400, detail="Parent must be a folder.")

        position = _next_position(conn, payload.workspace_id, payload.parent_id)

        # Insert with a temporary path — we need the auto-generated id first
        cursor = conn.execute(
            """
            INSERT INTO collections (workspace_id, parent_id, name, type, path, position)
            VALUES (?, ?, ?, 'folder', '/', ?)
            """,
            (payload.workspace_id, payload.parent_id, payload.name, position),
        )
        collection_id = cursor.lastrowid

        # Now build and update the real materialized path
        path = _build_path(conn, collection_id)
        conn.execute("UPDATE collections SET path = ? WHERE id = ?", (path, collection_id))
        conn.commit()

        return {
            "id": collection_id,
            "parentId": payload.parent_id,
            "name": payload.name,
            "type": "folder",
            "path": path,
            "children": [],
        }


@router.post("/request")
def create_request(payload: CreateRequestPayload) -> dict[str, Any]:
    """Create a new saved request (with its collection node)."""
    with get_connection() as conn:
        # Validate parent exists if provided
        if payload.parent_id is not None:
            parent = conn.execute("SELECT id, type FROM collections WHERE id = ?", (payload.parent_id,)).fetchone()
            if parent is None:
                raise HTTPException(status_code=404, detail="Parent collection not found.")
            if parent["type"] != "folder":
                raise HTTPException(status_code=400, detail="Parent must be a folder.")

        position = _next_position(conn, payload.workspace_id, payload.parent_id)

        # Create the collection node
        cursor = conn.execute(
            """
            INSERT INTO collections (workspace_id, parent_id, name, type, path, position)
            VALUES (?, ?, ?, 'request', '/', ?)
            """,
            (payload.workspace_id, payload.parent_id, payload.name, position),
        )
        collection_id = cursor.lastrowid
        path = _build_path(conn, collection_id)
        conn.execute("UPDATE collections SET path = ? WHERE id = ?", (path, collection_id))

        # Create the request row
        cursor = conn.execute(
            """
            INSERT INTO requests (collection_id, method, url, query_params_json, headers_json, body_mode, body_json, auth_json, scripts_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                collection_id,
                payload.method,
                payload.url,
                _json(payload.queryParams),
                _json(payload.headers),
                payload.bodyMode,
                _json(payload.body),
                _json(payload.auth),
                _json(payload.scripts),
            ),
        )
        request_id = cursor.lastrowid
        conn.commit()

        return {
            "id": collection_id,
            "parentId": payload.parent_id,
            "name": payload.name,
            "type": "request",
            "path": path,
            "children": [],
            "request": {
                "id": request_id,
                "method": payload.method,
                "url": payload.url,
                "queryParams": payload.queryParams,
                "headers": payload.headers,
                "bodyMode": payload.bodyMode,
                "body": payload.body,
                "auth": payload.auth,
            },
        }


@router.put("/{collection_id}")
def rename_collection(collection_id: int, payload: RenamePayload) -> dict[str, str]:
    """Rename a collection folder or request node."""
    with get_connection() as conn:
        row = conn.execute("SELECT id FROM collections WHERE id = ?", (collection_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Collection not found.")

        conn.execute(
            "UPDATE collections SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (payload.name, collection_id),
        )
        conn.commit()

    return {"status": "ok", "name": payload.name}


@router.put("/{collection_id}/request")
def update_request(collection_id: int, payload: UpdateRequestPayload) -> dict[str, Any]:
    """Update a saved request's draft state (method, URL, headers, body, etc.)."""
    with get_connection() as conn:
        collection_row = conn.execute(
            "SELECT id, type FROM collections WHERE id = ?", (collection_id,)
        ).fetchone()
        if collection_row is None:
            raise HTTPException(status_code=404, detail="Collection not found.")
        if collection_row["type"] != "request":
            raise HTTPException(status_code=400, detail="This collection node is not a request.")

        request_row = conn.execute(
            "SELECT id, method, url, query_params_json, headers_json, body_mode, body_json, auth_json FROM requests WHERE collection_id = ?",
            (collection_id,),
        ).fetchone()
        if request_row is None:
            raise HTTPException(status_code=404, detail="Request data not found for this collection node.")

        # Merge provided fields
        method = payload.method if payload.method is not None else request_row["method"]
        url = payload.url if payload.url is not None else request_row["url"]
        query_params = _json(payload.queryParams) if payload.queryParams is not None else request_row["query_params_json"]
        headers = _json(payload.headers) if payload.headers is not None else request_row["headers_json"]
        body_mode = payload.bodyMode if payload.bodyMode is not None else request_row["body_mode"]
        body = _json(payload.body) if payload.body is not None else request_row["body_json"]
        auth = _json(payload.auth) if payload.auth is not None else request_row["auth_json"]
        scripts = _json(payload.scripts) if payload.scripts is not None else request_row.get("scripts_json", "{}")

        conn.execute(
            """
            UPDATE requests
            SET method = ?, url = ?, query_params_json = ?, headers_json = ?, body_mode = ?, body_json = ?, auth_json = ?, scripts_json = ?, updated_at = CURRENT_TIMESTAMP
            WHERE collection_id = ?
            """,
            (method, url, query_params, headers, body_mode, body, auth, scripts, collection_id),
        )

        # Also rename the collection node if a new name was provided
        if payload.name is not None:
            conn.execute(
                "UPDATE collections SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (payload.name, collection_id),
            )

        conn.commit()

        return {
            "status": "ok",
            "request": {
                "id": request_row["id"],
                "method": method,
                "url": url,
                "queryParams": _decode_json(query_params if isinstance(query_params, str) else _json(query_params), []),
                "headers": _decode_json(headers if isinstance(headers, str) else _json(headers), []),
                "bodyMode": body_mode,
                "body": _decode_json(body if isinstance(body, str) else _json(body), {}),
                "auth": _decode_json(auth if isinstance(auth, str) else _json(auth), {"type": "none"}),
            },
        }


@router.delete("/{collection_id}")
def delete_collection(collection_id: int) -> dict[str, str]:
    """
    Delete a collection node and all its descendants.

    Uses the materialized path to find descendants: any row whose path
    starts with ``/<collection_id>/`` or equals the node's own path prefix.
    SQLite ``ON DELETE CASCADE`` handles the requests table.
    """
    with get_connection() as conn:
        row = conn.execute("SELECT id, path FROM collections WHERE id = ?", (collection_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Collection not found.")

        # Delete all descendants whose path starts with this node's path
        node_path = row["path"]
        conn.execute(
            "DELETE FROM collections WHERE path LIKE ? OR id = ?",
            (f"{node_path}%", collection_id),
        )
        conn.commit()

    return {"status": "ok"}
