# Synapse Arc
SYNAPSE-ARC is a hackathon-ready MVP demonstrating distributed-oriented monitoring, cascade prediction, and self-healing.

Quick start (Docker Compose):

```bash
docker-compose up --build
```

This brings up Redis, Postgres, Backend, Telemetry generator, and Frontend (Vite).

Backend API endpoints:

- `POST /metrics` — ingest metrics
- `GET /health` — health
- `GET /nodes` — list nodes
- `WS /ws/live` — websocket for real-time events

Frontend: open http://localhost:3000
