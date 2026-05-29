from pydantic import BaseModel
class Prediction(BaseModel):
    risk: float
    affected: list
