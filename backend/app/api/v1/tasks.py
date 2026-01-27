from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.api.deps import get_db, get_current_user, get_current_admin
from app.schemas.task import (
    TaskCreate, TaskUpdate, TaskResponse,
    TaskListResponse, TaskStatusUpdate
)
from app.services.task import TaskService
from app.models.task import TaskStatus
from app.models.user import User

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("", response_model=TaskListResponse)
async def list_tasks(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: TaskStatus = Query(None),
    project_id: int = Query(None),
    assignee_id: int = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Listar tarefas com filtros"""
    service = TaskService(db)
    tasks, total = service.get_all(
        skip=skip,
        limit=limit,
        status=status,
        project_id=project_id,
        assignee_id=assignee_id,
        user=current_user
    )
    return {"tasks": tasks, "total": total}


@router.get("/my", response_model=List[TaskResponse])
async def my_tasks(
    status: TaskStatus = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Tarefas atribuídas ao programador logado"""
    service = TaskService(db)
    return service.get_by_assignee(current_user.id, status=status)


@router.post("", response_model=TaskResponse)
async def create_task(
    task_data: TaskCreate,
    db: Session = Depends(get_db),
    _: any = Depends(get_current_admin)
):
    """Criar nova tarefa"""
    service = TaskService(db)
    return service.create(task_data)


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Detalhes da tarefa"""
    service = TaskService(db)
    task = service.get_by_id(task_id, current_user)
    if not task:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    return task


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    task_data: TaskUpdate,
    db: Session = Depends(get_db),
    _: any = Depends(get_current_admin)
):
    """Atualizar tarefa (admin)"""
    service = TaskService(db)
    return service.update(task_id, task_data)


@router.patch("/{task_id}/status", response_model=TaskResponse)
async def update_task_status(
    task_id: int,
    status_data: TaskStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Atualizar status da tarefa (programador pode alterar suas tarefas)"""
    service = TaskService(db)
    task = service.get_by_id(task_id)

    if not task:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")

    # Verificar permissão
    if current_user.role.value != "admin" and task.assignee_id != current_user.id:
        raise HTTPException(status_code=403, detail="Sem permissão")

    # Se concluindo, registrar data
    completed_at = None
    if status_data.status == TaskStatus.COMPLETED:
        completed_at = datetime.utcnow()

    return service.update_status(task_id, status_data.status, completed_at)


@router.delete("/{task_id}")
async def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    _: any = Depends(get_current_admin)
):
    """Remover tarefa"""
    service = TaskService(db)
    service.delete(task_id)
    return {"message": "Tarefa removida com sucesso"}
