from pydantic import BaseModel


class Anomaly(BaseModel):
    host: str
    anomaly: bool = False
    score: float = 0.0
    severity: str = 'low'
    reasons: list[str] = []
