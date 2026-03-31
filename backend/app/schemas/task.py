from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.task import TaskPriority, TaskStatus


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=220)
    description: Optional[str] = None
    assigned_to_id: str
    due_date: Optional[date] = None
    priority: TaskPriority = TaskPriority.medium


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=220)
    description: Optional[str] = None
    assigned_to_id: Optional[str] = None
    due_date: Optional[date] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    progress: Optional[int] = Field(None, ge=0, le=100)
    is_archived: Optional[bool] = None


class TaskOut(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    assigned_to_id: str
    assigned_to_name: str
    assigned_by_id: str
    assigned_by_name: str
    due_date: Optional[date] = None
    status: TaskStatus
    priority: TaskPriority
    progress: int
    is_archived: bool
    created_at: datetime
    updated_at: datetime
