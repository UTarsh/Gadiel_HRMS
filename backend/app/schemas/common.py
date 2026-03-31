from typing import Any, Optional, Generic, TypeVar
from pydantic import BaseModel

T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    """Standard response envelope used by every endpoint.
    Mobile apps rely on this consistent structure."""
    success: bool
    message: str
    data: Optional[T] = None


class PaginatedResponse(BaseModel, Generic[T]):
    success: bool
    message: str
    data: list[T]
    total: int
    page: int
    per_page: int
    total_pages: int


def ok(data: Any = None, message: str = "Success") -> dict:
    return {"success": True, "message": message, "data": data}


def fail(message: str, data: Any = None) -> dict:
    return {"success": False, "message": message, "data": data}
