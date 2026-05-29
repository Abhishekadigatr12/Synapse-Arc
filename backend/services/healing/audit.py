from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any
import json


AUDIT_LOG_PATH = Path('logs') / 'healing_audit.jsonl'


def record_audit(entry: dict[str, Any]) -> dict[str, Any]:
    AUDIT_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        'timestamp': datetime.now(timezone.utc).isoformat(),
        **entry,
    }
    with AUDIT_LOG_PATH.open('a', encoding='utf-8') as handle:
        handle.write(json.dumps(payload) + '\n')
    return payload
