from pydantic import BaseModel


class ProcessMetricModel(BaseModel):
    pid: int
    name: str
    cpu: float = 0.0
    memory: float = 0.0
    threads: int = 0
    open_files: int = 0
