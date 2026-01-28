from sqlalchemy.orm import Session, joinedload
from typing import List, Tuple, Optional
from datetime import datetime

from app.models.task import Task, TaskStatus, TaskComment
from app.models.project import Project
from app.models.user import User, UserRole
from app.schemas.task import TaskCreate, TaskUpdate, TaskCommentCreate
from app.core.exceptions import NotFoundException, ForbiddenException, BadRequestException


class TaskService:
    def __init__(self, db: Session):
        self.db = db

    def get_all(
        self,
        skip: int = 0,
        limit: int = 20,
        status: Optional[TaskStatus] = None,
        project_id: Optional[int] = None,
        assignee_id: Optional[int] = None,
        user: Optional[User] = None
    ) -> Tuple[List[Task], int]:
        """Listar tarefas com filtros"""
        query = self.db.query(Task).options(
            joinedload(Task.assignee),
            joinedload(Task.project)
        )

        # Se for programador, mostrar apenas suas tarefas
        if user and user.role == UserRole.PROGRAMMER:
            query = query.filter(Task.assignee_id == user.id)

        if status:
            query = query.filter(Task.status == status)

        if project_id:
            query = query.filter(Task.project_id == project_id)

        if assignee_id:
            query = query.filter(Task.assignee_id == assignee_id)

        total = query.count()
        tasks = query.order_by(Task.created_at.desc()).offset(skip).limit(limit).all()

        return tasks, total

    def get_by_id(self, task_id: int, user: Optional[User] = None) -> Optional[Task]:
        """Buscar tarefa por ID"""
        task = self.db.query(Task).options(
            joinedload(Task.assignee),
            joinedload(Task.project),
            joinedload(Task.comments).joinedload(TaskComment.user)
        ).filter(Task.id == task_id).first()

        if task and user and user.role == UserRole.PROGRAMMER:
            if task.assignee_id != user.id:
                raise ForbiddenException("Você não tem acesso a esta tarefa")

        return task

    def get_by_assignee(
        self,
        user_id: int,
        status: Optional[TaskStatus] = None
    ) -> List[Task]:
        """Buscar tarefas atribuídas a um usuário"""
        query = self.db.query(Task).options(
            joinedload(Task.project)
        ).filter(Task.assignee_id == user_id)

        if status:
            query = query.filter(Task.status == status)

        return query.order_by(Task.created_at.desc()).all()

    def create(self, task_data: TaskCreate) -> Task:
        """Criar nova tarefa"""
        # Verificar se projeto existe
        project = self.db.query(Project).filter(
            Project.id == task_data.project_id
        ).first()
        if not project:
            raise BadRequestException("Projeto não encontrado")

        # Verificar se assignee existe (se fornecido)
        if task_data.assignee_id:
            assignee = self.db.query(User).filter(
                User.id == task_data.assignee_id
            ).first()
            if not assignee:
                raise BadRequestException("Usuário responsável não encontrado")

        task = Task(
            title=task_data.title,
            description=task_data.description,
            project_id=task_data.project_id,
            assignee_id=task_data.assignee_id,
            priority=task_data.priority,
            due_date=task_data.due_date
        )
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        return task

    def update(self, task_id: int, task_data: TaskUpdate) -> Task:
        """Atualizar tarefa"""
        task = self.db.query(Task).filter(Task.id == task_id).first()
        if not task:
            raise NotFoundException("Tarefa não encontrada")

        update_data = task_data.model_dump(exclude_unset=True)

        # Se está atribuindo a alguém, verificar se usuário existe
        if "assignee_id" in update_data and update_data["assignee_id"]:
            assignee = self.db.query(User).filter(
                User.id == update_data["assignee_id"]
            ).first()
            if not assignee:
                raise BadRequestException("Usuário responsável não encontrado")

        # Se está marcando como concluída, registrar data
        if "status" in update_data and update_data["status"] == TaskStatus.COMPLETED:
            update_data["completed_at"] = datetime.utcnow()
        elif "status" in update_data and update_data["status"] != TaskStatus.COMPLETED:
            update_data["completed_at"] = None

        for field, value in update_data.items():
            setattr(task, field, value)

        self.db.commit()
        self.db.refresh(task)
        return task

    def update_status(
        self,
        task_id: int,
        status: TaskStatus,
        completed_at: Optional[datetime] = None
    ) -> Task:
        """Atualizar apenas o status da tarefa"""
        task = self.db.query(Task).filter(Task.id == task_id).first()
        if not task:
            raise NotFoundException("Tarefa não encontrada")

        task.status = status
        if status == TaskStatus.COMPLETED:
            task.completed_at = completed_at or datetime.utcnow()
        else:
            task.completed_at = None

        self.db.commit()
        self.db.refresh(task)
        return task

    def delete(self, task_id: int) -> None:
        """Remover tarefa"""
        task = self.db.query(Task).filter(Task.id == task_id).first()
        if not task:
            raise NotFoundException("Tarefa não encontrada")

        self.db.delete(task)
        self.db.commit()

    # Comment methods
    def get_comments(self, task_id: int) -> List[TaskComment]:
        """Listar comentários de uma tarefa"""
        return self.db.query(TaskComment).options(
            joinedload(TaskComment.user)
        ).filter(TaskComment.task_id == task_id).order_by(TaskComment.created_at.asc()).all()

    def add_comment(self, task_id: int, user_id: int, content: str) -> TaskComment:
        """Adicionar comentário a uma tarefa"""
        task = self.db.query(Task).filter(Task.id == task_id).first()
        if not task:
            raise NotFoundException("Tarefa não encontrada")

        comment = TaskComment(
            content=content,
            task_id=task_id,
            user_id=user_id
        )
        self.db.add(comment)
        self.db.commit()
        self.db.refresh(comment)

        # Load user relationship
        self.db.refresh(comment, ["user"])
        return comment

    def update_comment(self, comment_id: int, user_id: int, content: str) -> TaskComment:
        """Atualizar comentário"""
        comment = self.db.query(TaskComment).filter(TaskComment.id == comment_id).first()
        if not comment:
            raise NotFoundException("Comentário não encontrado")

        if comment.user_id != user_id:
            raise ForbiddenException("Você só pode editar seus próprios comentários")

        comment.content = content
        self.db.commit()
        self.db.refresh(comment, ["user"])
        return comment

    def delete_comment(self, comment_id: int, user_id: int, is_admin: bool = False) -> None:
        """Remover comentário"""
        comment = self.db.query(TaskComment).filter(TaskComment.id == comment_id).first()
        if not comment:
            raise NotFoundException("Comentário não encontrado")

        if not is_admin and comment.user_id != user_id:
            raise ForbiddenException("Você só pode remover seus próprios comentários")

        self.db.delete(comment)
        self.db.commit()
