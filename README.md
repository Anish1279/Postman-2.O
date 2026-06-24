# Postman Clone

A staged fullstack Postman-style API client built with Next.js, FastAPI, and SQLite.

## Tech Stack

- Frontend: Next.js, TypeScript, Zustand, react-resizable-panels, lucide-react
- Backend: FastAPI, SQLite, httpx
- Database: SQLite with a materialized-path collection tree

## Project Structure

```text
frontend/   Next.js workspace UI
backend/    FastAPI API, SQLite schema, seed data
```

## Local Setup

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The backend starts at `http://127.0.0.1:8000`.

If the sandbox blocks the reload watcher, run:

```bash
uvicorn app.main:app
```

Useful endpoints:

- `GET /api/health`
- `GET /api/bootstrap`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend starts at `http://localhost:3000`.

## Current Stage

Stage 1: Basic Setup

- Monorepo folders for frontend and backend
- FastAPI app with CORS, SQLite initialization, seed data, and bootstrap endpoint
- SQLite schema for workspaces, collections, saved requests, environments, variables, and history
- Next.js workspace shell with Postman-like panes, tabs, request builder controls, environment selector, collection/history sidebar, and response viewer

## Database Schema Overview

- `workspaces`: default logged-in workspace container
- `collections`: materialized-path tree nodes for folders and saved request entries
- `requests`: request details attached to request collection nodes
- `environments`: named variable scopes
- `variables`: key/value variables for each environment
- `history`: immutable snapshots of executed requests and response metadata
