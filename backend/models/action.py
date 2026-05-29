from pydantic import BaseModel


class Action(BaseModel):
    action: str
    target: str
    reason: str
    status: str = 'simulated'
    result: str | None = None
