from pydantic import BaseModel
class Action(BaseModel):
    action: str
    target: list
