import json
import sqlite3

from .db import get_connection, init_database


def _json(data: object) -> str:
    return json.dumps(data, separators=(",", ":"))


def seed_database(connection: sqlite3.Connection | None = None) -> None:
    owns_connection = connection is None
    conn = connection or get_connection()

    try:
        conn.execute(
            "INSERT OR IGNORE INTO workspaces (id, name) VALUES (?, ?)",
            (1, "Personal Workspace"),
        )

        collection_rows = [
            (1, 1, None, "JSONPlaceholder", "folder", "/1/", 1),
            (2, 1, 1, "List posts", "request", "/1/2/", 1),
            (3, 1, 1, "Create post", "request", "/1/3/", 2),
            (4, 1, None, "httpbin", "folder", "/4/", 2),
            (5, 1, 4, "Echo headers", "request", "/4/5/", 1),
        ]
        conn.executemany(
            """
            INSERT OR IGNORE INTO collections
                (id, workspace_id, parent_id, name, type, path, position)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            collection_rows,
        )

        request_rows = [
            (
                1,
                2,
                "GET",
                "https://jsonplaceholder.typicode.com/posts",
                _json([{"id": "limit", "key": "_limit", "value": "5", "enabled": True}]),
                _json([{"id": "accept", "key": "Accept", "value": "application/json", "enabled": True}]),
                "none",
                _json({}),
                _json({"type": "none"}),
            ),
            (
                2,
                3,
                "POST",
                "https://jsonplaceholder.typicode.com/posts",
                _json([]),
                _json([
                    {"id": "content-type", "key": "Content-Type", "value": "application/json", "enabled": True}
                ]),
                "raw",
                _json({"raw": '{\n  "title": "Scaler assignment",\n  "body": "Postman clone",\n  "userId": 1\n}'}),
                _json({"type": "none"}),
            ),
            (
                3,
                5,
                "GET",
                "https://httpbin.org/headers",
                _json([]),
                _json([{"id": "demo", "key": "X-Demo-Token", "value": "{{token}}", "enabled": True}]),
                "none",
                _json({}),
                _json({"type": "bearer", "token": "{{token}}"}),
            ),
        ]
        conn.executemany(
            """
            INSERT OR IGNORE INTO requests
                (id, collection_id, method, url, query_params_json, headers_json, body_mode, body_json, auth_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            request_rows,
        )

        environment_rows = [
            (1, 1, "Public APIs", 1),
            (2, 1, "Local Dev", 0),
        ]
        conn.executemany(
            "INSERT OR IGNORE INTO environments (id, workspace_id, name, is_active) VALUES (?, ?, ?, ?)",
            environment_rows,
        )

        variable_rows = [
            (1, 1, "baseUrl", "https://jsonplaceholder.typicode.com", 1),
            (2, 1, "token", "demo-token", 1),
            (3, 2, "baseUrl", "http://127.0.0.1:8000", 1),
        ]
        conn.executemany(
            """
            INSERT OR IGNORE INTO variables
                (id, environment_id, key, value, is_enabled)
            VALUES (?, ?, ?, ?, ?)
            """,
            variable_rows,
        )

        history_rows = [
            (
                1,
                1,
                _json({"name": "List posts", "method": "GET", "url": "https://jsonplaceholder.typicode.com/posts?_limit=5"}),
                _json({"status": 200, "timeMs": 182, "sizeBytes": 1427}),
            ),
            (
                2,
                1,
                _json({"name": "Echo headers", "method": "GET", "url": "https://httpbin.org/headers"}),
                _json({"status": 200, "timeMs": 244, "sizeBytes": 512}),
            ),
        ]
        conn.executemany(
            """
            INSERT OR IGNORE INTO history
                (id, workspace_id, request_snapshot_json, response_metadata_json)
            VALUES (?, ?, ?, ?)
            """,
            history_rows,
        )

        conn.commit()
    finally:
        if owns_connection:
            conn.close()


if __name__ == "__main__":
    init_database()
    seed_database()
    print("Seeded Postman clone database.")

