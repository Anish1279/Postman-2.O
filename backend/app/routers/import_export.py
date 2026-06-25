from fastapi import APIRouter, HTTPException
import sqlite3
from ..db import get_connection

router = APIRouter()

@router.get("/export")
def export_workspace(workspace_id: int = 1):
    """
    Export the entire workspace (collections, folders, requests, environments) 
    as a flat JSON structure.
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Get Collections
    cursor.execute("SELECT * FROM collections WHERE workspace_id = ?", (workspace_id,))
    collections = [dict(row) for row in cursor.fetchall()]

    # Get Requests
    cursor.execute("""
        SELECT r.* FROM requests r
        JOIN collections c ON r.collection_id = c.id
        WHERE c.workspace_id = ?
    """, (workspace_id,))
    requests = [dict(row) for row in cursor.fetchall()]

    # Get Environments
    cursor.execute("SELECT * FROM environments WHERE workspace_id = ?", (workspace_id,))
    environments = [dict(row) for row in cursor.fetchall()]

    # Get Variables
    cursor.execute("""
        SELECT v.* FROM variables v
        JOIN environments e ON v.environment_id = e.id
        WHERE e.workspace_id = ?
    """, (workspace_id,))
    variables = [dict(row) for row in cursor.fetchall()]

    conn.close()

    return {
        "version": "1.0",
        "collections": collections,
        "requests": requests,
        "environments": environments,
        "variables": variables
    }

@router.post("/import")
def import_workspace(data: dict, workspace_id: int = 1):
    """
    Import a workspace JSON, wiping existing collections and environments 
    for this workspace ID, and inserting the new ones.
    """
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Wipe existing data for workspace
        cursor.execute("DELETE FROM collections WHERE workspace_id = ?", (workspace_id,))
        cursor.execute("DELETE FROM environments WHERE workspace_id = ?", (workspace_id,))
        
        # We need a mapping from old IDs to new IDs
        collection_id_map = {}
        env_id_map = {}

        sorted_cols = sorted(data.get("collections", []), key=lambda c: 0 if c["parent_id"] is None else 1)
        
        for col in sorted_cols:
            old_id = col["id"]
            new_parent_id = collection_id_map.get(col["parent_id"]) if col["parent_id"] else None
            
            cursor.execute("""
                INSERT INTO collections (workspace_id, parent_id, name, type, path, position, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                workspace_id,
                new_parent_id,
                col["name"],
                col["type"],
                col["path"],
                col["position"],
                col.get("created_at"),
                col.get("updated_at")
            ))
            collection_id_map[old_id] = cursor.lastrowid

        for req in data.get("requests", []):
            new_collection_id = collection_id_map.get(req["collection_id"])
            if not new_collection_id:
                continue

            scripts_json = req.get("scripts_json", "{}")

            cursor.execute("""
                INSERT INTO requests (collection_id, method, url, query_params_json, headers_json, body_mode, body_json, auth_json, scripts_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                new_collection_id,
                req["method"],
                req["url"],
                req["query_params_json"],
                req["headers_json"],
                req["body_mode"],
                req["body_json"],
                req["auth_json"],
                scripts_json,
                req.get("created_at"),
                req.get("updated_at")
            ))

        for env in data.get("environments", []):
            old_id = env["id"]
            cursor.execute("""
                INSERT INTO environments (workspace_id, name, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
            """, (
                workspace_id,
                env["name"],
                env["is_active"],
                env.get("created_at"),
                env.get("updated_at")
            ))
            env_id_map[old_id] = cursor.lastrowid

        for var in data.get("variables", []):
            new_env_id = env_id_map.get(var["environment_id"])
            if not new_env_id:
                continue
                
            cursor.execute("""
                INSERT INTO variables (environment_id, key, value, is_enabled, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                new_env_id,
                var["key"],
                var["value"],
                var["is_enabled"],
                var.get("created_at"),
                var.get("updated_at")
            ))

        conn.commit()
        conn.close()
        return {"status": "success"}

    except Exception as e:
        conn.rollback()
        conn.close()
        raise HTTPException(status_code=500, detail=str(e))
