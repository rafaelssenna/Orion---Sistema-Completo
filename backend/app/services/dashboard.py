from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from app.models.user import User, UserRole
from app.models.project import Project, ProjectStatus
from app.models.task import Task, TaskStatus
from app.schemas.dashboard import AdminDashboardStats, ProgrammerDashboardStats, RecentActivity


class DashboardService:
    def __init__(self, db: Session):
        self.db = db

    def get_admin_stats(self) -> AdminDashboardStats:
        """Obter estatísticas gerais para admin"""
        # Projetos
        total_projects = self.db.query(func.count(Project.id)).scalar()
        active_projects = self.db.query(func.count(Project.id)).filter(
            Project.status == ProjectStatus.IN_PROGRESS
        ).scalar()
        completed_projects = self.db.query(func.count(Project.id)).filter(
            Project.status == ProjectStatus.COMPLETED
        ).scalar()

        # Tarefas
        total_tasks = self.db.query(func.count(Task.id)).scalar()
        pending_tasks = self.db.query(func.count(Task.id)).filter(
            Task.status == TaskStatus.PENDING
        ).scalar()
        in_progress_tasks = self.db.query(func.count(Task.id)).filter(
            Task.status == TaskStatus.IN_PROGRESS
        ).scalar()
        completed_tasks = self.db.query(func.count(Task.id)).filter(
            Task.status == TaskStatus.COMPLETED
        ).scalar()

        # Usuários
        total_users = self.db.query(func.count(User.id)).scalar()
        total_programmers = self.db.query(func.count(User.id)).filter(
            User.role == UserRole.PROGRAMMER
        ).scalar()

        # Taxa de conclusão
        completion_rate = 0.0
        if total_tasks > 0:
            completion_rate = (completed_tasks / total_tasks) * 100

        return AdminDashboardStats(
            total_projects=total_projects,
            active_projects=active_projects,
            completed_projects=completed_projects,
            total_tasks=total_tasks,
            pending_tasks=pending_tasks,
            in_progress_tasks=in_progress_tasks,
            completed_tasks=completed_tasks,
            total_users=total_users,
            total_programmers=total_programmers,
            completion_rate=round(completion_rate, 1)
        )

    def get_programmer_stats(self, user_id: int) -> ProgrammerDashboardStats:
        """Obter estatísticas do programador"""
        # Tarefas atribuídas
        assigned_tasks = self.db.query(func.count(Task.id)).filter(
            Task.assignee_id == user_id
        ).scalar()

        pending_tasks = self.db.query(func.count(Task.id)).filter(
            Task.assignee_id == user_id,
            Task.status == TaskStatus.PENDING
        ).scalar()

        in_progress_tasks = self.db.query(func.count(Task.id)).filter(
            Task.assignee_id == user_id,
            Task.status == TaskStatus.IN_PROGRESS
        ).scalar()

        completed_tasks = self.db.query(func.count(Task.id)).filter(
            Task.assignee_id == user_id,
            Task.status == TaskStatus.COMPLETED
        ).scalar()

        # Projetos onde tem tarefas
        projects_count = self.db.query(func.count(func.distinct(Task.project_id))).filter(
            Task.assignee_id == user_id
        ).scalar()

        # Taxa de conclusão
        completion_rate = 0.0
        if assigned_tasks > 0:
            completion_rate = (completed_tasks / assigned_tasks) * 100

        return ProgrammerDashboardStats(
            assigned_tasks=assigned_tasks,
            pending_tasks=pending_tasks,
            in_progress_tasks=in_progress_tasks,
            completed_tasks=completed_tasks,
            projects_count=projects_count,
            completion_rate=round(completion_rate, 1)
        )

    def get_recent_activity(self, limit: int = 10) -> List[RecentActivity]:
        """Obter atividades recentes"""
        activities = []

        # Tarefas concluídas recentemente
        completed_tasks = self.db.query(Task).filter(
            Task.completed_at.isnot(None)
        ).order_by(Task.completed_at.desc()).limit(limit).all()

        for task in completed_tasks:
            assignee_name = task.assignee.name if task.assignee else "Sistema"
            activities.append(RecentActivity(
                id=task.id,
                type="task_completed",
                description=f"Tarefa '{task.title}' concluída",
                timestamp=task.completed_at,
                user_name=assignee_name
            ))

        # Projetos criados recentemente
        recent_projects = self.db.query(Project).order_by(
            Project.created_at.desc()
        ).limit(limit).all()

        for project in recent_projects:
            creator_name = project.creator.name if project.creator else "Sistema"
            activities.append(RecentActivity(
                id=project.id,
                type="project_created",
                description=f"Projeto '{project.name}' criado",
                timestamp=project.created_at,
                user_name=creator_name
            ))

        # Ordenar por timestamp e limitar
        activities.sort(key=lambda x: x.timestamp, reverse=True)
        return activities[:limit]
