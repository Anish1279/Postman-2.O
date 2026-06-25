<div align="center">

<img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white" />
<img src="https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
<img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
<img src="https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white" />
<img src="https://img.shields.io/badge/SQLite-WAL%20Mode-003B57?style=for-the-badge&logo=sqlite&logoColor=white" />

<br /><br />

# ⚡ Postman 2.0

### A production-grade, full-stack API client — built from scratch.

*Real HTTP proxy execution · Collections & Environments · Variable resolution · Pre-request scripts · Cookie manager · Import/Export*

<br />

> **Postman 2.0** is not a UI mockup. Every request travels through a hardened FastAPI proxy,
> resolves `{{variables}}`, runs your pre-request JavaScript, and streams back real status codes,
> latency, headers, and body — the way a real API client should.

<br />

</div>

---

## Table of Contents

- [Why Postman 2.0?](#-why-postman-20)
- [Feature Matrix](#-feature-matrix)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
  - [Environment Variables](#environment-variables)
- [REST API Reference](#-rest-api-reference)
- [Database Schema](#-database-schema)
- [Security Model](#-security-model)
- [Variable Resolution Engine](#-variable-resolution-engine)
- [Pre-Request Script Sandbox](#-pre-request-script-sandbox)
- [Import & Export Format](#-import--export-format)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)

---

## 🎯 Why Postman 2.0?

Most "Postman clones" are form UIs that never fire a real request. This one is different.

Postman 2.0 ships a **Python reverse-proxy** (`/api/runner/send`) that actually opens a TCP connection to your target host, enforces SSRF guards, resolves environment variables at send-time, executes pre-request JavaScript in a sandboxed context, and writes the response — status, latency, size, headers, body, and any `Set-Cookie` values — back to the client. The frontend is a fully stateful Next.js 16 workspace built on Zustand, with persistent panel layouts, multi-tab drafts, unsaved-change tracking, and a Monaco-powered script editor.

It is a teaching artifact, a portfolio piece, and a launchpad for building your own internal API tooling on top of a clean, well-structured monorepo.

---

## 🗺 Feature Matrix

| Category | Feature | Notes |
|---|---|---|
| **Request Builder** | GET · POST · PUT · PATCH · DELETE · HEAD · OPTIONS | All standard HTTP verbs |
| | Query params editor | Synced bidirectionally with the URL bar |
| | Headers editor | Per-row enable/disable toggle |
| | Body modes | `none` · `raw` · `form-data` · `x-www-form-urlencoded` |
| | Auth flows | None · Bearer Token · HTTP Basic |
| **Execution** | Real HTTP proxy | FastAPI + `httpx.AsyncClient` — not a browser fetch |
| | Configurable timeout | Env-var driven, default 30 s |
| | Redirect handling | `follow_redirects=False` — you see real 3xx responses |
| | Response viewer | Pretty · Raw · Headers tabs |
| | Latency & size | Measured via `perf_counter` on the proxy |
| **Variables** | `{{variable}}` resolution | URL, query params, headers, body, auth fields |
| | Missing-variable detection | Warns before sending if a token has no binding |
| | Active environment | One environment active at a time per workspace |
| **Scripting** | Pre-request scripts | JavaScript sandbox — `pm.environment.set/get/unset` |
| | Test scripts | Runs after response; can assert and mutate vars |
| | Monaco Editor | Syntax highlighting, autocomplete |
| **Collections** | Materialized-path tree | Unlimited nesting depth via `/1/5/12/` paths |
| | Full CRUD | Create folder · Create request · Rename · Delete (cascades) |
| | Position ordering | Siblings sorted by integer `position` column |
| **Environments** | Full CRUD | Create · Rename · Delete · Set active |
| | Bulk variable upsert | Single PUT replaces all variables atomically |
| **History** | Immutable snapshots | Request + response metadata stored per execution |
| **Cookies** | Cookie manager | CRUD on per-domain cookies; injected into proxy requests |
| | Auto-capture | `Set-Cookie` from responses surfaced in the UI |
| **Import / Export** | Workspace JSON | Full fidelity — collections, requests, envs, variables, cookies |
| **UI / UX** | Resizable panels | `react-resizable-panels`; layout persisted via HTTP cookie |
| | Multi-tab workspace | Independent draft state per tab; dirty-change indicator |
| | Dark / Light themes | `next-themes` |
| **Security** | SSRF protection | Blocks private, loopback, link-local, multicast, reserved IPs |
| | Scheme enforcement | Only `http://` and `https://` accepted |
| | Hostname blocklist | `localhost`, `metadata.google.internal`, `*.localhost` |
| | IPv6-mapped IPv4 | Unwraps `::ffff:127.0.0.1` before IP class check |

---

## 🏗 Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         Browser (Next.js 16)                      │
│                                                                    │
│  ┌──────────┐  ┌───────────────────────────────────────────────┐ │
│  │ Sidebar  │  │              Request Workspace                  │ │
│  │          │  │  ┌──────────────┐    ┌──────────────────────┐ │ │
│  │Collections│  │  │ Request Tabs │    │    Response Panel     │ │ │
│  │ History  │  │  │──────────────│    │  Pretty / Raw / Hdrs  │ │ │
│  │ Cookies  │  │  │ URL Bar      │    │  Status · Time · Size  │ │ │
│  │          │  │  │ Params/Auth  │    └──────────────────────┘ │ │
│  │          │  │  │ Headers/Body │                              │ │
│  │          │  │  │ Scripts      │ ← Monaco Editor              │ │
│  └──────────┘  │  └──────────────┘                              │ │
│                └───────────────────────────────────────────────┘ │
│                                                                    │
│            Zustand Store  ←→  lib/api.ts  ←→  Variable Resolver   │
└────────────────────────────────────┬─────────────────────────────┘
                                     │ HTTP / JSON
                           ┌─────────▼──────────┐
                           │   FastAPI (Python)   │
                           │                      │
                           │  /api/runner/send    │ ← SSRF guard
                           │  /api/collections/*  │    + httpx proxy
                           │  /api/environments/* │
                           │  /api/history        │
                           │  /api/cookies/*      │
                           │  /api/export         │
                           │  /api/import         │
                           │  /api/bootstrap      │
                           └─────────┬────────────┘
                                     │ SQLite (WAL)
                           ┌─────────▼────────────┐
                           │      app.db           │
                           │                       │
                           │  workspaces           │
                           │  collections (mpath)  │
                           │  requests             │
                           │  environments         │
                           │  variables            │
                           │  history              │
                           │  cookies              │
                           └───────────────────────┘
```

### Request Execution Flow

```
User clicks Send
      │
      ▼
Zustand: resolveSnapshot()       ← Interpolates {{vars}} throughout draft
      │
      ▼
runScript(preRequestScript)      ← Sandboxed JS; may mutate variable map
      │
      ▼
POST /api/runner/send            ← Full request payload sent to FastAPI proxy
      │
      ├─ _build_url()            ← Parses + rebuilds URL with query pairs
      ├─ _validate_public_destination()  ← DNS resolve → IP class check
      ├─ _build_headers()        ← Merges headers + auth header
      ├─ _build_request_kwargs() ← Selects body mode (raw/form/urlencoded)
      │
      ▼
httpx.AsyncClient.request()      ← Real TCP connection to target
      │
      ▼
Response → status · latency · size · headers · body · Set-Cookie
      │
      ▼
runScript(testScript)            ← Sandboxed JS; receives pm.response
      │
      ▼
POST /api/history                ← Immutable snapshot written
      │
      ▼
Zustand: update active tab response state → UI re-renders
```

---

## 🧰 Tech Stack

### Frontend

| Package | Version | Role |
|---|---|---|
| `next` | 16.2.9 | App router, RSC, SSR |
| `react` | 19.2.7 | UI rendering |
| `typescript` | 5.7.2 | Type safety |
| `zustand` | 5.0.2 | Global state management |
| `react-resizable-panels` | 2.1.7 | Draggable split panels |
| `@monaco-editor/react` | 4.7.0 | Script editor with syntax highlighting |
| `next-themes` | 0.4.6 | Dark/light theme switching |
| `lucide-react` | 0.468.0 | Icon system |

### Backend

| Package | Version | Role |
|---|---|---|
| `fastapi` | 0.115.6 | ASGI web framework |
| `uvicorn[standard]` | 0.32.1 | ASGI server |
| `httpx` | 0.28.1 | Async HTTP client for proxy execution |
| `sqlite3` | stdlib | Embedded database with WAL mode |
| `pydantic` | v2 (bundled) | Request/response schema validation |

---

## 📁 Project Structure

```
Postman-2.0/
├── backend/
│   ├── app/
│   │   ├── main.py                # FastAPI app, CORS middleware, lifespan hooks
│   │   ├── config.py              # Env-var settings with lru_cache singleton
│   │   ├── db.py                  # SQLite connection factory (WAL + FK enforcement)
│   │   ├── schema.sql             # Canonical DDL — tables, FK, indexes
│   │   ├── seed.py                # Idempotent seed data (JSONPlaceholder, httpbin)
│   │   └── routers/
│   │       ├── bootstrap.py       # Single-shot workspace + collections + env + history load
│   │       ├── collections.py     # Materialized-path tree CRUD
│   │       ├── environments.py    # Environment + variable CRUD
│   │       ├── history.py         # Immutable request/response snapshots
│   │       ├── runner.py          # HTTP proxy — SSRF guard + httpx execution
│   │       ├── cookies.py         # Per-domain cookie store CRUD
│   │       ├── import_export.py   # Full workspace JSON serialization
│   │       └── health.py          # GET /api/health liveness probe
│   ├── data/                      # Runtime SQLite database file (gitignored)
│   └── requirements.txt
│
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx           # Root page — reads layout cookie, mounts WorkspaceShell
    │   │   └── layout.tsx         # HTML shell, theme provider
    │   ├── components/
    │   │   ├── WorkspaceShell.tsx # Top-level layout: TopNav + resizable PanelGroup
    │   │   ├── Sidebar.tsx        # Collections tree / History / Cookie panels
    │   │   ├── RequestTabs.tsx    # Tab bar with dirty indicators
    │   │   ├── RequestBuilder.tsx # URL bar + Params/Auth/Headers/Body/Scripts tabs
    │   │   ├── ResponsePanel.tsx  # Pretty/Raw/Headers response viewer
    │   │   └── TopNav.tsx         # Environment selector + workspace controls
    │   ├── lib/
    │   │   ├── workspace-store.ts # Zustand mega-store — all UI + async actions
    │   │   ├── api.ts             # Typed fetch wrappers for every backend endpoint
    │   │   ├── variable-resolver.ts # {{var}} interpolation engine + missing-var detection
    │   │   ├── sandbox.ts         # JS script sandbox via new Function('pm', script)
    │   │   ├── toast.ts           # Lightweight toast notification system
    │   │   └── types.ts           # Shared TypeScript interfaces (RequestDraft, CollectionNode, …)
    │   └── styles/
    ├── package.json
    └── tsconfig.json
```

---

## 🚀 Quick Start

### Prerequisites

| Tool | Version |
|---|---|
| Node.js | ≥ 18 |
| Python | ≥ 3.11 |
| pip | Latest |

---

### Backend Setup

```bash
# 1. Enter the backend directory
cd backend

# 2. Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Start the development server
uvicorn app.main:app --reload
```

The API will be live at **`http://127.0.0.1:8000`**.

On first startup the server will:
- Execute `schema.sql` (idempotent — `CREATE TABLE IF NOT EXISTS`)
- Seed the database with two example collections (JSONPlaceholder, httpbin), two environments, and two history entries
- Run inline migrations (adds `scripts_json` column and `cookies` table if absent)

Verify the backend is healthy:

```bash
curl http://127.0.0.1:8000/api/health
# → {"status": "ok"}
```

> **Sandbox note:** If the `--reload` flag causes issues in restricted environments (e.g. Docker, some CI), drop it:
> ```bash
> uvicorn app.main:app
> ```

---

### Frontend Setup

```bash
# 1. Enter the frontend directory
cd frontend

# 2. Install Node dependencies
npm install

# 3. Start the development server
npm run dev
```

The workspace UI will be live at **`http://localhost:3000`**.

```bash
# Type-check without building
npm run typecheck

# Production build
npm run build && npm run start
```

---

### Environment Variables

#### Backend

Configure via shell environment or a `.env` file loaded by your process manager.

| Variable | Default | Description |
|---|---|---|
| `POSTMAN_CLONE_DB_PATH` | `backend/postman_clone.db` | Absolute or relative path to the SQLite database file |
| `POSTMAN_CLONE_CORS_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` | Comma-separated list of allowed CORS origins |
| `POSTMAN_CLONE_REQUEST_TIMEOUT_SECONDS` | `30` | Timeout (in seconds) for outbound proxy requests |

**Example:**

```bash
export POSTMAN_CLONE_DB_PATH=/var/data/postman2.db
export POSTMAN_CLONE_CORS_ORIGINS=https://myapp.example.com
export POSTMAN_CLONE_REQUEST_TIMEOUT_SECONDS=60
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

#### Frontend

Create a `.env.local` file in the `frontend/` directory:

```env
# Points the browser API client to your FastAPI instance
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

---

## 📖 REST API Reference

### Health

```
GET /api/health
```
Returns `{"status": "ok"}` — use as a liveness/readiness probe.

---

### Bootstrap

```
GET /api/bootstrap
```
Returns the full workspace in one round trip: workspace metadata, collection tree, all environments with variables, and recent history. The frontend calls this once on mount.

<details>
<summary>Response shape</summary>

```json
{
  "workspace": { "id": 1, "name": "Personal Workspace" },
  "collections": [ /* nested tree — see Collections */ ],
  "environments": [
    {
      "id": 1,
      "name": "Public APIs",
      "isActive": true,
      "variables": [
        { "id": 1, "key": "baseUrl", "value": "https://jsonplaceholder.typicode.com", "enabled": true }
      ]
    }
  ],
  "history": [ /* most recent entries */ ]
}
```

</details>

---

### Runner

```
POST /api/runner/send
```

Executes an outbound HTTP request through the FastAPI proxy. All `{{variable}}` resolution happens on the frontend before this call; the runner receives concrete values.

<details>
<summary>Request body</summary>

```json
{
  "name": "Get posts",
  "method": "GET",
  "url": "https://jsonplaceholder.typicode.com/posts",
  "queryParams": [
    { "id": "p1", "key": "_limit", "value": "5", "enabled": true }
  ],
  "headers": [
    { "id": "h1", "key": "Accept", "value": "application/json", "enabled": true }
  ],
  "bodyMode": "none",
  "rawBody": "",
  "formData": [],
  "urlEncodedBody": [],
  "auth": { "type": "bearer", "token": "my-token" },
  "cookies": [
    { "domain": "example.com", "name": "session", "value": "abc123", "path": "/", "secure": true, "http_only": true }
  ]
}
```

</details>

<details>
<summary>Success response</summary>

```json
{
  "ok": true,
  "status": 200,
  "statusText": "OK",
  "timeMs": 183,
  "sizeBytes": 1427,
  "headers": [
    { "id": "response-header-0", "key": "Content-Type", "value": "application/json; charset=utf-8", "enabled": true }
  ],
  "body": "[{\"id\": 1, ...}]",
  "setCookies": []
}
```

</details>

<details>
<summary>Error response (SSRF block / timeout / DNS failure)</summary>

```json
{
  "ok": false,
  "status": 0,
  "statusText": "Request Error",
  "timeMs": 2,
  "sizeBytes": 0,
  "headers": [],
  "body": "",
  "error": {
    "type": "blocked_url",
    "message": "Private, loopback, link-local, and reserved IPs are blocked."
  }
}
```

**Error types:** `invalid_url` · `blocked_url` · `connection_error` · `timeout` · `request_error`

</details>

**Supported `bodyMode` values:**

| Value | Transport |
|---|---|
| `none` | No body |
| `raw` | `content=payload.rawBody` (send `Content-Type` header manually) |
| `form-data` | `multipart/form-data` via `httpx files=` |
| `x-www-form-urlencoded` | URL-encoded via `httpx data=` |

**Supported `auth.type` values:**

| Value | Behaviour |
|---|---|
| `none` | No auth header added |
| `bearer` | Adds `Authorization: Bearer <token>` |
| `basic` | Uses `httpx.BasicAuth(username, password)` |

---

### Collections

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/collections?workspace_id=1` | Full nested collection tree |
| `POST` | `/api/collections/folder` | Create a folder |
| `POST` | `/api/collections/request` | Create a saved request node |
| `PUT` | `/api/collections/{id}` | Rename a folder or request |
| `PUT` | `/api/collections/{id}/request` | Update a saved request's full state |
| `DELETE` | `/api/collections/{id}` | Delete node + all descendants (materialized-path cascade) |

<details>
<summary>Create folder payload</summary>

```json
{ "workspace_id": 1, "parent_id": null, "name": "My API" }
```

</details>

<details>
<summary>Create request payload</summary>

```json
{
  "workspace_id": 1,
  "parent_id": 4,
  "name": "Get users",
  "method": "GET",
  "url": "{{baseUrl}}/users",
  "queryParams": [],
  "headers": [],
  "bodyMode": "none",
  "body": {},
  "auth": { "type": "none" },
  "scripts": { "preRequest": "", "test": "" }
}
```

</details>

---

### Environments

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/environments?workspace_id=1` | All environments with variables |
| `POST` | `/api/environments` | Create an environment |
| `PUT` | `/api/environments/{id}` | Rename an environment |
| `DELETE` | `/api/environments/{id}` | Delete an environment |
| `POST` | `/api/environments/{id}/active` | Set as active environment |
| `PUT` | `/api/environments/{id}/variables` | Bulk replace all variables |

<details>
<summary>Bulk update variables payload</summary>

```json
{
  "variables": [
    { "key": "baseUrl", "value": "https://api.example.com", "is_enabled": true },
    { "key": "token",   "value": "secret",                  "is_enabled": true }
  ]
}
```

Variables not in the payload are deleted. This is an atomic replace.

</details>

---

### History

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/history` | Write an execution snapshot |

History records are append-only. The full request draft + response metadata are stored as JSON blobs. Deletion is not currently exposed via API.

---

### Cookies

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/cookies?workspace_id=1` | List all stored cookies |
| `POST` | `/api/cookies` | Create a cookie |
| `PUT` | `/api/cookies/{id}` | Update a cookie |
| `DELETE` | `/api/cookies/{id}` | Delete a cookie |

---

### Import / Export

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/export?workspace_id=1` | Full workspace JSON export |
| `POST` | `/api/import?workspace_id=1` | Replace workspace from JSON |

> **Warning:** `/api/import` is destructive — it deletes all existing collections, environments, and cookies for the target workspace before inserting the imported data.

---

## 🗃 Database Schema

SQLite with `PRAGMA foreign_keys = ON` and `PRAGMA journal_mode = WAL` enforced on every connection.

```sql
workspaces
  id (PK), name, created_at, updated_at

collections                              -- materialized-path tree
  id (PK)
  workspace_id (FK → workspaces.id CASCADE DELETE)
  parent_id    (FK → collections.id CASCADE DELETE, nullable)
  name         TEXT NOT NULL
  type         TEXT CHECK (type IN ('folder', 'request'))
  path         TEXT  -- e.g. "/1/5/12/" — enables subtree queries with LIKE
  position     INTEGER DEFAULT 0
  INDEX on (workspace_id, path)
  INDEX on (parent_id)

requests                                 -- 1-to-1 with a 'request' collection node
  id (PK)
  collection_id (FK → collections.id CASCADE DELETE, UNIQUE)
  method, url
  query_params_json, headers_json        -- JSON arrays of {id, key, value, enabled}
  body_mode TEXT                         -- none | raw | form-data | x-www-form-urlencoded
  body_json  TEXT                        -- {raw: "..."} or {}
  auth_json  TEXT                        -- {type, token?, username?, password?}
  scripts_json TEXT                      -- {preRequest: "...", test: "..."}

environments
  id (PK), workspace_id (FK CASCADE), name, is_active INTEGER

variables                                -- UNIQUE(environment_id, key)
  id (PK), environment_id (FK CASCADE)
  key, value, is_enabled INTEGER

history                                  -- append-only execution log
  id (PK), workspace_id (FK CASCADE)
  request_snapshot_json TEXT             -- full request draft at send-time
  response_metadata_json TEXT            -- {status, timeMs, sizeBytes}
  executed_at TEXT DEFAULT CURRENT_TIMESTAMP
  INDEX on (workspace_id, executed_at DESC)

cookies
  id (PK), workspace_id (FK CASCADE)
  domain, name, value, path
  secure INTEGER, http_only INTEGER
```

### Why materialized paths?

Nested-set and adjacency-list models both struggle with subtree deletes. Materialized paths give O(1) subtree queries via `WHERE path LIKE '/1/5/%'` and O(1) deletes — no recursive CTE required. The tradeoff (path must be updated on reparent) is acceptable since Postman-style collections are rarely moved, only deleted.

---

## 🔒 Security Model

### SSRF Protection (Server-Side Request Forgery)

The runner enforces a multi-layer SSRF defence before any TCP connection is opened:

**Layer 1 — Scheme enforcement**
```python
if parsed.scheme not in {"http", "https"}:
    raise RunnerInputError("invalid_url", "Only http and https URLs can be sent.")
```

**Layer 2 — Static hostname blocklist**
```python
BLOCKED_HOSTNAMES = {"localhost", "metadata.google.internal"}
# Also blocks *.localhost via hostname.endswith(".localhost")
```

**Layer 3 — DNS resolution + IP class check**

The hostname is resolved via `socket.getaddrinfo` *before* the request is sent. Every resolved IP address is checked:

```python
ip.is_private    # 10.x, 172.16-31.x, 192.168.x
ip.is_loopback   # 127.x, ::1
ip.is_link_local # 169.254.x, fe80::
ip.is_multicast  # 224.x – 239.x
ip.is_reserved   # IETF-reserved ranges
ip.is_unspecified# 0.0.0.0, ::
not ip.is_global # catch-all for non-public addresses
```

**IPv6-mapped IPv4 unwrapping:**
```python
if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped is not None:
    ip = ip.ipv4_mapped  # ::ffff:127.0.0.1 → 127.0.0.1 → blocked
```

This defence prevents DNS rebinding attacks where an attacker registers a domain that initially resolves to a public IP but later rebinds to `127.0.0.1`.

---

## 🔣 Variable Resolution Engine

`frontend/src/lib/variable-resolver.ts` — a pure, deterministic interpolation engine.

### Syntax

```
{{variableName}}   ← alphanumeric, underscore, hyphen, dot, colon
```

### Resolution scope

Variables are resolved **across the entire request** at send-time:

| Field | Resolved |
|---|---|
| URL | ✅ |
| Query param keys & values | ✅ |
| Header keys & values | ✅ |
| Raw body | ✅ |
| Form-data keys & values | ✅ |
| URL-encoded keys & values | ✅ |
| Auth → Bearer token | ✅ |
| Auth → Basic username & password | ✅ |

### Missing variable detection

Before the request fires, `findMissingVariables()` scans every resolved field and returns tokens that have no binding in the active environment. The UI warns the user without blocking.

```typescript
// Usage
const missing = findMissingVariables(draft.url, activeVarMap);
// → ["apiKey"] if {{apiKey}} appears in URL but no env var is set
```

---

## 🧪 Pre-Request Script Sandbox

`frontend/src/lib/sandbox.ts` implements a minimal JavaScript execution context that mirrors Postman's `pm` API.

### Available API surface

```javascript
// Read a variable from the active environment
pm.environment.get("baseUrl")         // → string | undefined

// Write or update a variable (changes apply to this send only; not persisted)
pm.environment.set("token", "abc123")

// Remove a variable for this send
pm.environment.unset("token")

// In test scripts — access the response
pm.response.status                    // → 200
pm.response.body                      // → parsed object (if JSON)
```

### Execution model

Scripts run inside `new Function('pm', script)`. There is no `setTimeout`, no `fetch`, and no DOM access. Side effects are limited to mutations of the `updatedVars` map, which is then used for variable resolution on the same request send.

**Pre-request scripts** run *before* variable resolution is applied to the payload — allowing scripts to set variables that are then interpolated.

**Test scripts** run *after* the response is received — allowing assertions and dynamic variable extraction (e.g. saving a token from a login response).

---

## 📦 Import & Export Format

```json
{
  "version": "1.0",
  "collections": [
    {
      "id": 1, "workspace_id": 1, "parent_id": null,
      "name": "JSONPlaceholder", "type": "folder",
      "path": "/1/", "position": 1
    }
  ],
  "requests": [
    {
      "id": 1, "collection_id": 2,
      "method": "GET", "url": "https://jsonplaceholder.typicode.com/posts",
      "query_params_json": "[...]", "headers_json": "[...]",
      "body_mode": "none", "body_json": "{}", "auth_json": "{\"type\":\"none\"}",
      "scripts_json": "{\"preRequest\":\"\",\"test\":\"\"}"
    }
  ],
  "environments": [ { "id": 1, "workspace_id": 1, "name": "Public APIs", "is_active": 1 } ],
  "variables": [ { "id": 1, "environment_id": 1, "key": "baseUrl", "value": "...", "is_enabled": 1 } ],
  "cookies": []
}
```

Import via `POST /api/import` with this JSON as the request body. The server rebuilds ID mappings to preserve parent→child relationships during the insert.

---

## 🗺 Roadmap

- [ ] **WebSocket support** — inspect frames in a dedicated response tab
- [ ] **Postman Collection v2.1 import** — parse `.postman_collection.json` natively
- [ ] **OpenAPI import** — seed a collection from a Swagger / OpenAPI spec
- [ ] **Request chaining** — pass a response field as a variable into the next request
- [ ] **Test assertions UI** — `pm.expect(status).to.equal(200)` with a results summary panel
- [ ] **gRPC support** — protobuf schema upload + unary/streaming call execution
- [ ] **Multi-workspace** — workspace switcher in the top nav
- [ ] **Team sync** — optional SQLite → PostgreSQL migration with row-level workspaces
- [ ] **CLI runner** — `postman2 run <collection.json> --env staging` like Newman

---

## 🤝 Contributing

Contributions are welcome. Please follow this flow:

1. **Fork** the repository and create a feature branch off `main`:
   ```bash
   git checkout -b feat/your-feature
   ```

2. **Backend changes:** Routers live in `backend/app/routers/`. Every new endpoint should have a Pydantic model for its input and return a typed dict. Run the app and verify with `curl` before opening a PR.

3. **Frontend changes:** The Zustand store in `lib/workspace-store.ts` is the single source of truth. Add new async actions there; keep components thin. Run `npm run typecheck` before committing.

4. **Database changes:** Update `schema.sql` with `CREATE TABLE IF NOT EXISTS` or `CREATE INDEX IF NOT EXISTS`. Add a migration snippet in the `lifespan` hook in `main.py` wrapped in a `try/except` so existing databases stay compatible.

5. **Open a PR** with a description of what changed and why. Screenshots for UI changes are appreciated.

---

<div align="center">

Built with 🔥 by **Anish** · [GitHub](https://github.com/Anish1279)

*If this project helped you, a ⭐ goes a long way.*

</div>