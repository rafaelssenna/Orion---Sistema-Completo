from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.task import TaskStatus


class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None


class TaskCreate(TaskBase):
    project_id: int
    assignee_id: Optional[int] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assignee_id: Optional[int] = None
    status: Optional[TaskStatus] = None


class TaskStatusUpdate(BaseModel):
    status: TaskStatus


class AssigneeInfo(BaseModel):
    id: int
    name: str
    email: str

    class Config:
        from_attributes = True


class ProjectInfo(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class TaskResponse(TaskBase):
    id: int
    status: TaskStatus
    project_id: int
    assignee_id: Optional[int] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    assignee: Optional[AssigneeInfo] = None
    project: Optional[ProjectInfo] = None

    class Config:
        from_attributes = True


class TaskListResponse(BaseModel):
    tasks: List[TaskResponse]
    total: int
