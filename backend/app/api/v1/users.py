from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List

from app.api.deps import get_db, get_current_admin
from app.schemas.user import UserResponse, UserUpdate, UserListResponse
from app.services.user import UserService

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=UserListResponse)
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    role: str = Query(None),
    db: Session = Depends(get_db),
    _: any = Depends(get_current_admin)
):
    """Listar todos os usuários com paginação"""
    service = UserService(db)
    users, total = service.get_all(skip=skip, limit=limit, role=role)
    return {"users": users, "total": total}


@router.get("/programmers", response_model=List[UserResponse])
async def list_programmers(
    db: Session = Depends(get_db),
    _: any = Depends(get_current_admin)
):
    """Listar apenas programadores (para atribuição de tarefas)"""
    service = UserService(db)
    return service.get_programmers()


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: any = Depends(get_current_admin)
):
    """Buscar usuário por ID"""
    service = UserService(db)
    user = service.get_by_id(user_id)
    if not user:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return user


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    _: any = Depends(get_current_admin)
):
    """Atualizar dados do usuário"""
    service = UserService(db)
    return service.update(user_id, user_data)


@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: any = Depends(get_current_admin)
):
    """Remover usuário (apenas programadores podem ser removidos)"""
    from fastapi import HTTPException
    service = UserService(db)
    user = service.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if user.role.value == "admin":
        raise HTTPException(status_code=403, detail="Não é permitido excluir contas de administrador")
    service.delete(user_id)
    return {"message": "Usuário removido com sucesso"}
