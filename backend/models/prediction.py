from pydantic import BaseModel


class Prediction(BaseModel):
    resource: str
    current: float
    predicted: float
    time_to_threshold: str
    risk_score: float = 0.0
    forecasts: dict = {}
