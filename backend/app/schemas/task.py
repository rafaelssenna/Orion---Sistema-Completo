from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.task import TaskStatus, TaskPriority


class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None


class TaskCreate(TaskBase):
    project_id: int
    assignee_id: Optional[int] = None
    priority: Optional[TaskPriority] = TaskPriority.MEDIUM
    due_date: Optional[datetime] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assignee_id: Optional[int] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    due_date: Optional[datetime] = None


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


class CommentUserInfo(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class TaskCommentResponse(BaseModel):
    id: int
    content: str
    task_id: int
    user_id: int
    user: CommentUserInfo
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TaskCommentCreate(BaseModel):
    content: str


class TaskCommentUpdate(BaseModel):
    content: str


class TaskResponse(TaskBase):
    id: int
    status: TaskStatus
    priority: TaskPriority
    due_date: Optional[datetime] = None
    project_id: int
    assignee_id: Optional[int] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    assignee: Optional[AssigneeInfo] = None
    project: Optional[ProjectInfo] = None
    comments: Optional[List[TaskCommentResponse]] = None

    class Config:
        from_attributes = True


class TaskListResponse(BaseModel):
    tasks: List[TaskResponse]
    total: int


class TaskCommentListResponse(BaseModel):
    comments: List[TaskCommentResponse]
    total: int
