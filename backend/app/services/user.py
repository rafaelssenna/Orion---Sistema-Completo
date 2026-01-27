from sqlalchemy.orm import Session
from typing import List, Tuple, Optional

from app.models.user import User, UserRole
from app.schemas.user import UserUpdate
from app.core.security import get_password_hash
from app.core.exceptions import NotFoundException, BadRequestException


class UserService:
    def __init__(self, db: Session):
        self.db = db

    def get_all(
        self,
        skip: int = 0,
        limit: int = 20,
        role: Optional[str] = None
    ) -> Tuple[List[User], int]:
        """Listar todos os usuários com paginação"""
        query = self.db.query(User)

        if role:
            query = query.filter(User.role == role)

        total = query.count()
        users = query.offset(skip).limit(limit).all()

        return users, total

    def get_by_id(self, user_id: int) -> Optional[User]:
        """Buscar usuário por ID"""
        return self.db.query(User).filter(User.id == user_id).first()

    def get_programmers(self) -> List[User]:
        """Listar apenas programadores"""
        return self.db.query(User).filter(
            User.role == UserRole.PROGRAMMER,
            User.is_active == True
        ).all()

    def update(self, user_id: int, user_data: UserUpdate) -> User:
        """Atualizar dados do usuário"""
        user = self.get_by_id(user_id)
        if not user:
            raise NotFoundException("Usuário não encontrado")

        update_data = user_data.model_dump(exclude_unset=True)

        # Se está atualizando email, verificar duplicidade
        if "email" in update_data:
            existing = self.db.query(User).filter(
                User.email == update_data["email"],
                User.id != user_id
            ).first()
            if existing:
                raise BadRequestException("Email já cadastrado")

        # Se está atualizando senha, fazer hash
        if "password" in update_data:
            update_data["hashed_password"] = get_password_hash(update_data.pop("password"))

        for field, value in update_data.items():
            setattr(user, field, value)

        self.db.commit()
        self.db.refresh(user)
        return user

    def delete(self, user_id: int) -> None:
        """Remover usuário"""
        user = self.get_by_id(user_id)
        if not user:
            raise NotFoundException("Usuário não encontrado")

        self.db.delete(user)
        self.db.commit()
