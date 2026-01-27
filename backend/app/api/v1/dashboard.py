from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List

from app.api.deps import get_db, get_current_user, get_current_admin
from app.schemas.dashboard import (
    AdminDashboardStats, ProgrammerDashboardStats, RecentActivity
)
from app.services.dashboard import DashboardService
from app.models.user import User

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=AdminDashboardStats)
async def get_admin_stats(
    db: Session = Depends(get_db),
    _: any = Depends(get_current_admin)
):
    """Estatísticas gerais para admin"""
    service = DashboardService(db)
    return service.get_admin_stats()


@router.get("/my-stats", response_model=ProgrammerDashboardStats)
async def get_programmer_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Estatísticas do programador logado"""
    service = DashboardService(db)
    return service.get_programmer_stats(current_user.id)


@router.get("/recent-activity", response_model=List[RecentActivity])
async def get_recent_activity(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    _: any = Depends(get_current_admin)
):
    """Atividades recentes do sistema"""
    service = DashboardService(db)
    return service.get_recent_activity(limit)
