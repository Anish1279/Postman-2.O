from dataclasses import dataclass
from functools import lru_cache
import os
from pathlib import Path


def _split_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    app_name: str
    db_path: Path
    cors_origins: list[str]
    request_timeout_seconds: float


@lru_cache
def get_settings() -> Settings:
    backend_dir = Path(__file__).resolve().parents[1]
    db_path = Path(os.getenv("POSTMAN_CLONE_DB_PATH", backend_dir / "postman_clone.db"))
    cors_origins = _split_csv(
        os.getenv(
            "POSTMAN_CLONE_CORS_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000",
        )
    )
    request_timeout_seconds = float(os.getenv("POSTMAN_CLONE_REQUEST_TIMEOUT_SECONDS", "30"))

    return Settings(
        app_name="Postman Clone API",
        db_path=db_path,
        cors_origins=cors_origins,
        request_timeout_seconds=request_timeout_seconds,
    )

