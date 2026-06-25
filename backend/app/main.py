from contextlib import asynccontextmanager
from collections.abc import AsyncIterator
import sqlite3

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .db import init_database
from .routers import bootstrap, collections, environments, health, history, runner, import_export, cookies
from .seed import seed_database


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    init_database()
    seed_database()
    
    # Run migrations
    try:
        conn = sqlite3.connect("data/app.db")
        conn.execute("ALTER TABLE requests ADD COLUMN scripts_json TEXT NOT NULL DEFAULT '{}'")
    except Exception:
        pass
    
    try:
        conn.execute('''
        CREATE TABLE IF NOT EXISTS cookies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL,
            domain TEXT NOT NULL,
            name TEXT NOT NULL,
            value TEXT NOT NULL,
            path TEXT NOT NULL DEFAULT '/',
            secure INTEGER NOT NULL DEFAULT 0,
            http_only INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
        )
        ''')
        conn.close()
    except Exception:
        pass
        
    yield


settings = get_settings()
app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(health.router)
app.include_router(bootstrap.router)
app.include_router(collections.router)
app.include_router(environments.router)
app.include_router(history.router)
app.include_router(runner.router)
app.include_router(cookies.router)
app.include_router(import_export.router, prefix="/api", tags=["import-export"])


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Postman Clone API"}
