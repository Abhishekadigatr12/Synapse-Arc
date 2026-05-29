from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any
import json
from pathlib import Path


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


AUDIT_LOG_PATH = _repo_root() / 'logs' / 'healing_audit.jsonl'


def record_audit(entry: dict[str, Any]) -> dict[str, Any]:
    AUDIT_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        'timestamp': datetime.now(timezone.utc).isoformat(),
        **entry,
    }
    with AUDIT_LOG_PATH.open('a', encoding='utf-8') as handle:
        handle.write(json.dumps(payload) + '\n')
    return payload
