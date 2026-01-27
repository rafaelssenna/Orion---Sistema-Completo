from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime
from app.models.project import ProjectStatus


class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None


class ProjectResponse(ProjectBase):
    id: int
    status: ProjectStatus
    created_by: int
    created_at: datetime
    task_stats: Optional[Dict[str, int]] = None

    class Config:
        from_attributes = True


class CreatorInfo(BaseModel):
    id: int
    name: str
    email: str

    class Config:
        from_attributes = True


class TaskInProject(BaseModel):
    id: int
    title: str
    status: str
    assignee_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ProjectDetailResponse(ProjectBase):
    id: int
    status: ProjectStatus
    created_by: int
    created_at: datetime
    tasks: List[TaskInProject] = []
    creator: CreatorInfo
    task_stats: Dict[str, int]

    class Config:
        from_attributes = True


class ProjectListResponse(BaseModel):
    projects: List[ProjectResponse]
    total: int
