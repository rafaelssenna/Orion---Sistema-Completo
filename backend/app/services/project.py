from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Tuple, Optional

from app.models.project import Project, ProjectStatus
from app.models.task import Task, TaskStatus
from app.models.user import User, UserRole
from app.schemas.project import ProjectCreate, ProjectUpdate
from app.core.exceptions import NotFoundException, ForbiddenException


class ProjectService:
    def __init__(self, db: Session):
        self.db = db

    def get_all(
        self,
        skip: int = 0,
        limit: int = 20,
        status: Optional[str] = None
    ) -> Tuple[List[Project], int]:
        """Listar todos os projetos com paginação"""
        query = self.db.query(Project)

        if status:
            query = query.filter(Project.status == status)

        total = query.count()
        projects = query.order_by(Project.created_at.desc()).offset(skip).limit(limit).all()

        # Adicionar estatísticas de tarefas
        for project in projects:
            project.task_stats = self._get_task_stats(project.id)

        return projects, total

    def get_by_id(self, project_id: int) -> Optional[Project]:
        """Buscar projeto por ID"""
        return self.db.query(Project).filter(Project.id == project_id).first()

    def get_by_programmer(
        self,
        user_id: int,
        skip: int = 0,
        limit: int = 20
    ) -> Tuple[List[Project], int]:
        """Buscar projetos onde o programador tem tarefas atribuídas"""
        project_ids = self.db.query(Task.project_id).filter(
            Task.assignee_id == user_id
        ).distinct().subquery()

        query = self.db.query(Project).filter(Project.id.in_(project_ids))
        total = query.count()
        projects = query.offset(skip).limit(limit).all()

        for project in projects:
            project.task_stats = self._get_task_stats(project.id)

        return projects, total

    def get_with_details(self, project_id: int, user: User) -> Optional[dict]:
        """Buscar projeto com detalhes completos"""
        project = self.get_by_id(project_id)
        if not project:
            return None

        # Se for programador, verificar se tem acesso
        if user.role == UserRole.PROGRAMMER:
            has_task = self.db.query(Task).filter(
                Task.project_id == project_id,
                Task.assignee_id == user.id
            ).first()
            if not has_task:
                raise ForbiddenException("Você não tem acesso a este projeto")

        return {
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "internal_prompt": project.internal_prompt,
            "main_features": project.main_features or [],
            "status": project.status,
            "created_by": project.created_by,
            "created_at": project.created_at,
            "tasks": project.tasks,
            "creator": project.creator,
            "task_stats": self._get_task_stats(project.id)
        }

    def create(self, project_data: ProjectCreate, user_id: int) -> Project:
        """Criar novo projeto"""
        project = Project(
            name=project_data.name,
            description=project_data.description,
            internal_prompt=project_data.internal_prompt,
            main_features=project_data.main_features,
            created_by=user_id
        )
        self.db.add(project)
        self.db.commit()
        self.db.refresh(project)
        project.task_stats = {"pending": 0, "in_progress": 0, "completed": 0}
        return project

    def update(self, project_id: int, project_data: ProjectUpdate) -> Project:
        """Atualizar projeto"""
        project = self.get_by_id(project_id)
        if not project:
            raise NotFoundException("Projeto não encontrado")

        update_data = project_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(project, field, value)

        self.db.commit()
        self.db.refresh(project)
        project.task_stats = self._get_task_stats(project.id)
        return project

    def delete(self, project_id: int) -> None:
        """Remover projeto"""
        project = self.get_by_id(project_id)
        if not project:
            raise NotFoundException("Projeto não encontrado")

        self.db.delete(project)
        self.db.commit()

    def _get_task_stats(self, project_id: int) -> dict:
        """Obter estatísticas de tarefas do projeto"""
        stats = self.db.query(
            Task.status,
            func.count(Task.id)
        ).filter(
            Task.project_id == project_id
        ).group_by(Task.status).all()

        result = {"pending": 0, "in_progress": 0, "completed": 0}
        status_map = {
            TaskStatus.PENDING: "pending",
            TaskStatus.IN_PROGRESS: "in_progress",
            TaskStatus.COMPLETED: "completed"
        }

        for status, count in stats:
            key = status_map.get(status)
            if key:
                result[key] = count

        return result
