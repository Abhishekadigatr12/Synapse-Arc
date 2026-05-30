# Synapse Arc

SYNAPSE-ARC is a monitoring and self-healing MVP with a FastAPI backend, telemetry generator, and Vite frontend.

## 1) Prerequisites

- Docker + Docker Compose (recommended)
- Python 3.11+
- Node.js 18+
- npm

## 2) Quick Start (Docker Compose)

From the repository root:

```bash
docker-compose up --build
```

This starts:

- Redis (`6379`)
- Postgres (`5432`)
- Backend API (`8000`)
- Telemetry service (posts node metrics to backend)
- Frontend dashboard (`3000`)

Open:

- Frontend: http://localhost:3000
- Backend health: http://localhost:8000/health

## 3) Run Locally (without Docker)

### Backend

From repository root:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the UI at http://localhost:3000.

### Optional telemetry service

In another terminal from repository root:

```bash
export BACKEND_URL=http://localhost:8000
export NODES=20
export INTERVAL=1
python services/telemetry-service/main.py
```

## 4) Key API Endpoints

- `GET /health` — backend health status
- `POST /metrics` — ingest telemetry metrics
- `GET /nodes` — list current nodes
- `WS /ws/live` — real-time event stream

## 5) Configuration

Common environment variables:

- `DATABASE_URL` (default: `sqlite:///./synapse_arc.db`)
- `REDIS_URL` (default: `redis://localhost:6379`)
- `MODEL_VERSION` (default: `v2.4`)
- `CLUSTER_NODES` (default: `12`)
- `HEARTBEAT_INTERVAL` (default: `5`)

## 6) Stopping the Project

- Docker: `docker-compose down`
- Local: stop processes with `Ctrl+C`
