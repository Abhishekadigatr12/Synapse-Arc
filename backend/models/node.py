from pydantic import BaseModel
class Node(BaseModel):
    id: str
    status: str
