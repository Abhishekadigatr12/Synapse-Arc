from pydantic import BaseModel


class Metrics(BaseModel):
    host: str
    cpu: float
    memory: float
    disk: float = 0.0
    network: float = 0.0
    temp: float | None = None
    processes: list[dict] = []
