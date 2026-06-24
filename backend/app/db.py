import sqlite3
from pathlib import Path
from typing import Iterator

from .config import get_settings


def get_connection() -> sqlite3.Connection:
    settings = get_settings()
    settings.db_path.parent.mkdir(parents=True, exist_ok=True)

    connection = sqlite3.connect(settings.db_path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA journal_mode = WAL")
    return connection


def init_database() -> None:
    schema_path = Path(__file__).with_name("schema.sql")
    with get_connection() as connection:
        connection.executescript(schema_path.read_text(encoding="utf-8"))


def rows_to_dicts(rows: Iterator[sqlite3.Row]) -> list[dict]:
    return [dict(row) for row in rows]

