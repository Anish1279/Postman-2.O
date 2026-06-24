import ipaddress
import socket
from time import perf_counter
from typing import Literal
from urllib.parse import urlencode, urlsplit, urlunsplit

import httpx
from fastapi import APIRouter
from pydantic import BaseModel, Field

from ..config import get_settings

router = APIRouter(prefix="/api/runner", tags=["runner"])

HttpMethod = Literal["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]
BodyMode = Literal["none", "raw", "form-data", "x-www-form-urlencoded"]
AuthType = Literal["none", "bearer", "basic"]

BLOCKED_HOSTNAMES = {"localhost", "metadata.google.internal"}


class KeyValuePayload(BaseModel):
    id: str | None = None
    key: str = ""
    value: str = ""
    enabled: bool = True


class AuthPayload(BaseModel):
    type: AuthType = "none"
    token: str = ""
    username: str = ""
    password: str = ""


class RunnerRequest(BaseModel):
    name: str = "Untitled Request"
    method: HttpMethod
    url: str
    queryParams: list[KeyValuePayload] = Field(default_factory=list)
    headers: list[KeyValuePayload] = Field(default_factory=list)
    bodyMode: BodyMode = "none"
    rawBody: str = ""
    formData: list[KeyValuePayload] = Field(default_factory=list)
    urlEncodedBody: list[KeyValuePayload] = Field(default_factory=list)
    auth: AuthPayload = Field(default_factory=AuthPayload)


class RunnerInputError(ValueError):
    def __init__(self, error_type: str, message: str) -> None:
        self.error_type = error_type
        super().__init__(message)


def _elapsed_ms(started_at: float) -> int:
    return round((perf_counter() - started_at) * 1000)


def _enabled_pairs(rows: list[KeyValuePayload]) -> list[tuple[str, str]]:
    return [(row.key, row.value) for row in rows if row.enabled and row.key.strip()]


def _error_response(error_type: str, message: str, time_ms: int) -> dict:
    return {
        "ok": False,
        "status": 0,
        "statusText": "Request Error",
        "timeMs": time_ms,
        "sizeBytes": 0,
        "headers": [],
        "body": "",
        "error": {
            "type": error_type,
            "message": message,
        },
    }


def _is_blocked_ip(address: str) -> bool:
    ip = ipaddress.ip_address(address)
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped is not None:
        ip = ip.ipv4_mapped

    return (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
        or not ip.is_global
    )


def _validate_public_destination(url: str) -> None:
    parsed = urlsplit(url)
    if parsed.scheme not in {"http", "https"}:
        raise RunnerInputError("invalid_url", "Only http and https URLs can be sent.")

    if not parsed.netloc or parsed.hostname is None:
        raise RunnerInputError("invalid_url", "Enter a valid URL with a hostname.")

    hostname = parsed.hostname.strip().lower().rstrip(".")
    if hostname in BLOCKED_HOSTNAMES or hostname.endswith(".localhost"):
        raise RunnerInputError("blocked_url", "Local and metadata hosts are blocked by the request runner.")

    try:
        port = parsed.port or (443 if parsed.scheme == "https" else 80)
    except ValueError as exc:
        raise RunnerInputError("invalid_url", "Enter a valid port number.") from exc
    try:
        resolved_addresses = socket.getaddrinfo(hostname, port, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise RunnerInputError("connection_error", f"Could not resolve hostname: {hostname}.") from exc

    for address in {item[4][0] for item in resolved_addresses}:
        if _is_blocked_ip(address):
            raise RunnerInputError("blocked_url", "Private, loopback, link-local, and reserved IPs are blocked.")


def _build_url(payload: RunnerRequest) -> str:
    parsed = urlsplit(payload.url.strip())
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise RunnerInputError("invalid_url", "Enter a valid http or https URL before sending.")

    query_pairs = _enabled_pairs(payload.queryParams)
    query = urlencode(query_pairs, doseq=True) if payload.queryParams else parsed.query
    return urlunsplit((parsed.scheme, parsed.netloc, parsed.path or "", query, ""))


def _build_headers(payload: RunnerRequest) -> httpx.Headers:
    headers = httpx.Headers()
    for key, value in _enabled_pairs(payload.headers):
        headers[key] = value

    if payload.auth.type == "bearer" and payload.auth.token:
        headers["Authorization"] = f"Bearer {payload.auth.token}"

    return headers


def _build_request_kwargs(payload: RunnerRequest) -> dict:
    kwargs: dict = {"headers": _build_headers(payload)}

    if payload.auth.type == "basic":
        kwargs["auth"] = httpx.BasicAuth(payload.auth.username, payload.auth.password)

    if payload.bodyMode == "raw":
        kwargs["content"] = payload.rawBody
    elif payload.bodyMode == "form-data":
        kwargs["files"] = [(key, (None, value)) for key, value in _enabled_pairs(payload.formData)]
    elif payload.bodyMode == "x-www-form-urlencoded":
        kwargs["data"] = _enabled_pairs(payload.urlEncodedBody)

    return kwargs


def _response_headers(response: httpx.Response) -> list[dict[str, object]]:
    return [
        {"id": f"response-header-{index}", "key": key, "value": value, "enabled": True}
        for index, (key, value) in enumerate(response.headers.multi_items())
    ]


@router.post("/send")
async def send_request(payload: RunnerRequest) -> dict:
    started_at = perf_counter()
    settings = get_settings()

    try:
        url = _build_url(payload)
        _validate_public_destination(url)
    except RunnerInputError as exc:
        return _error_response(exc.error_type, str(exc), _elapsed_ms(started_at))

    try:
        async with httpx.AsyncClient(
            follow_redirects=False,
            timeout=httpx.Timeout(settings.request_timeout_seconds),
        ) as client:
            response = await client.request(payload.method, url, **_build_request_kwargs(payload))
    except httpx.TimeoutException:
        return _error_response(
            "timeout",
            f"The request timed out after {settings.request_timeout_seconds:g} seconds.",
            _elapsed_ms(started_at),
        )
    except httpx.ConnectError as exc:
        return _error_response("connection_error", f"Could not connect to the target host: {exc}", _elapsed_ms(started_at))
    except httpx.RequestError as exc:
        return _error_response("request_error", f"The request could not be completed: {exc}", _elapsed_ms(started_at))

    body = response.content.decode(response.encoding or "utf-8", errors="replace")
    return {
        "ok": True,
        "status": response.status_code,
        "statusText": response.reason_phrase,
        "timeMs": _elapsed_ms(started_at),
        "sizeBytes": len(response.content),
        "headers": _response_headers(response),
        "body": body,
    }
