"""
SYNAPSE-ARC FastAPI Backend Server
Mounts all API routes and starts uvicorn on port 8000.
"""
import os
import sys
from pathlib import Path

# Ensure project root is on sys.path so backend package imports work
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# Set DATABASE_URL to use the project-level DB so routes.py can find it
DB_PATH = ROOT / 'synapse_arc.db'
os.environ.setdefault('DATABASE_URL', f'sqlite:///{DB_PATH}')

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.api.routes import router as api_router
from backend.api.health import router as health_router
from backend.api.websocket import router as websocket_router
from backend.database.connection import init_db

# Create FastAPI application
app = FastAPI(title="SYNAPSE-ARC", version="2.4")

# Allow all CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(api_router)
app.include_router(health_router)
app.include_router(websocket_router)

# Serve the frontend dashboard shell from the backend so the UI and API share one origin.
FRONTEND_DIR = ROOT / 'frontend'
if FRONTEND_DIR.exists():
    app.mount('/', StaticFiles(directory=str(FRONTEND_DIR), html=True), name='frontend')

# Initialize database tables on startup
@app.on_event("startup")
async def on_startup():
    try:
        init_db()
    except Exception as exc:
        print(f"[startup] database initialization failed; continuing with runtime telemetry fallback: {exc}", flush=True)
    
    # Automatically start collecting telemetry in the background on startup
    import asyncio
    from backend.services.monitoring.collector import start_telemetry_loop
    from backend.websocket.manager import manager
    
    # Create the background task to run the telemetry loop
    asyncio.create_task(start_telemetry_loop(manager))


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8000, log_level='info')
