from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List

from app.api.deps import get_db, get_current_user, get_current_admin
from app.schemas.project import (
    ProjectCreate, ProjectUpdate, ProjectResponse,
    ProjectListResponse, ProjectDetailResponse
)
from app.services.project import ProjectService
from app.models.user import User

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("/", response_model=ProjectListResponse)
async def list_projects(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: str = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Listar projetos (admin vê todos, programador vê atribuídos)"""
    service = ProjectService(db)
    if current_user.role.value == "admin":
        projects, total = service.get_all(skip=skip, limit=limit, status=status)
    else:
        projects, total = service.get_by_programmer(
            current_user.id, skip=skip, limit=limit
        )
    return {"projects": projects, "total": total}


@router.get("/my", response_model=List[ProjectResponse])
async def my_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Projetos onde o programador tem tarefas atribuídas"""
    service = ProjectService(db)
    projects, _ = service.get_by_programmer(current_user.id)
    return projects


@router.post("/", response_model=ProjectResponse)
async def create_project(
    project_data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Criar novo projeto"""
    service = ProjectService(db)
    return service.create(project_data, current_user.id)


@router.get("/{project_id}", response_model=ProjectDetailResponse)
async def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Detalhes do projeto com tarefas"""
    service = ProjectService(db)
    project = service.get_with_details(project_id, current_user)
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    return project


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    project_data: ProjectUpdate,
    db: Session = Depends(get_db),
    _: any = Depends(get_current_admin)
):
    """Atualizar projeto"""
    service = ProjectService(db)
    return service.update(project_id, project_data)


@router.delete("/{project_id}")
async def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    _: any = Depends(get_current_admin)
):
    """Remover projeto e suas tarefas"""
    service = ProjectService(db)
    service.delete(project_id)
    return {"message": "Projeto removido com sucesso"}
