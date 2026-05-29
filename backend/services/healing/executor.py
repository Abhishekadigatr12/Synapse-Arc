from __future__ import annotations

import os
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

SAFE_ACTIONS = {
    'restart_process',
    'kill_process',
    'reduce_process_priority',
    'restart_service',
    'clear_temp_files',
    'notify_only',
    'block_process',
    'isolate_node',
}


def _action_description(action: str, target: str) -> str:
    return {
        'restart_process': f'Restart process target={target}',
        'kill_process': f'Kill process target={target}',
        'reduce_process_priority': f'Reduce process priority target={target}',
        'restart_service': f'Restart service target={target}',
        'clear_temp_files': 'Clear temporary files in safe temp locations',
        'notify_only': 'Trigger notification only',
        'block_process': f'Block suspicious process target={target}',
        'isolate_node': 'Isolate host from further automated actions',
    }.get(action, f'Unknown action {action}')


def execute(action_payload: dict) -> dict:
    action = str(action_payload.get('action', 'notify_only'))
    target = str(action_payload.get('target', 'system'))
    reason = str(action_payload.get('reason', 'policy decision'))
    dry_run = os.getenv('SYNAPSE_DRY_RUN', '1') != '0'
    allowed = action in SAFE_ACTIONS

    status = 'simulated' if dry_run or not allowed else 'executed'
    result = {
        'id': str(uuid4()),
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'action': action,
        'target': target,
        'reason': reason,
        'status': status,
        'description': _action_description(action, target),
        'dry_run': dry_run,
        'allowed': allowed,
    }

    if action == 'clear_temp_files' and not dry_run and allowed:
        temp_dirs = [Path(os.getenv('TEMP', '/tmp'))]
        result['cleanup_paths'] = [str(path) for path in temp_dirs]

    return result