from pydantic import BaseModel
class Metrics(BaseModel):
    node: str
    cpu: int
    memory: int
    temp: int
    packet_loss: int = 0
