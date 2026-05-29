from __future__ import annotations

from .actions import cleanup_temp, reduce_priority, restart_process, restart_service


def execute_action(action_name: str) -> dict:
    action_map = {
        'reduce_priority': reduce_priority,
        'cleanup_temp': cleanup_temp,
        'restart_process': restart_process,
        'restart_service': restart_service,
    }
    action = action_map.get(action_name)
    if not action:
        return {'success': False, 'action': action_name}
    return action()