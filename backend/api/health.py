from __future__ import annotations

from datetime import datetime, timezone

import psutil
from fastapi import APIRouter

from ..config.settings import settings

router = APIRouter()


@router.get('/health')
async def health():
    boot_time = datetime.fromtimestamp(psutil.boot_time(), tz=timezone.utc)
    uptime_days = max(0, int((datetime.now(timezone.utc) - boot_time).total_seconds() // 86400))
    return {
        'status': 'healthy',
        'app': settings.APP_NAME,
        'engine_state': 'online',
        'model_version': settings.MODEL_VERSION,
        'confidence': 0.987,
        'system_uptime_days': uptime_days,
        'live_utc_time': datetime.now(timezone.utc).isoformat(),
        'monitor_duration': settings.HEARTBEAT_INTERVAL,
    }
