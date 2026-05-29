from pydantic import BaseModel
class Anomaly(BaseModel):
    node: str
    type: str
    details: dict
