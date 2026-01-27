from pydantic import BaseModel
from datetime import datetime


class AdminDashboardStats(BaseModel):
    total_projects: int
    active_projects: int
    completed_projects: int
    total_tasks: int
    pending_tasks: int
    in_progress_tasks: int
    completed_tasks: int
    total_users: int
    total_programmers: int
    completion_rate: float


class ProgrammerDashboardStats(BaseModel):
    assigned_tasks: int
    pending_tasks: int
    in_progress_tasks: int
    completed_tasks: int
    projects_count: int
    completion_rate: float


class RecentActivity(BaseModel):
    id: int
    type: str
    description: str
    timestamp: datetime
    user_name: str
