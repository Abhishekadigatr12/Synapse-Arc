from pydantic import BaseModel


class Node(BaseModel):
    id: str
    label: str
    role: str = 'worker'
    status: str = 'stable'
    cpu: float = 0.0
    memory: float = 0.0
    disk: float = 0.0
    temp: float | None = None
    top_process: str | None = None
