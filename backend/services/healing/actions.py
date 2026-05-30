from __future__ import annotations

from pathlib import Path
import shutil


def reduce_priority() -> dict:
    return {'success': True, 'action': 'reduce_priority'}


def cleanup_temp() -> dict:
    temp_dir = Path.cwd() / 'tmp'
    if temp_dir.exists():
        for entry in temp_dir.iterdir():
            try:
                if entry.is_file():
                    entry.unlink()
                elif entry.is_dir():
                    shutil.rmtree(entry)
            except Exception:
                continue
    return {'success': True, 'action': 'cleanup_temp'}


def restart_process() -> dict:
    return {'success': True, 'action': 'restart_process'}


def restart_service() -> dict:
    return {'success': True, 'action': 'restart_service'}


def terminate_instance() -> dict:
    return {'success': True, 'action': 'terminate_instance'}


SAFE_ACTIONS = {
    'reduce_priority': reduce_priority,
    'cleanup_temp': cleanup_temp,
    'restart_process': restart_process,
    'restart_service': restart_service,
    'terminate_instance': terminate_instance,
}
