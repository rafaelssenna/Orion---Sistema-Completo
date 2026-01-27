from sqlalchemy.orm import Session
from typing import Optional

from app.models.user import User
from app.schemas.auth import UserCreate, Token
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token
)
from app.core.exceptions import BadRequestException, CredentialsException


class AuthService:
    def __init__(self, db: Session):
        self.db = db

    def authenticate(self, email: str, password: str) -> Optional[User]:
        """Autenticar usuário por email e senha"""
        user = self.db.query(User).filter(User.email == email).first()
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    def create_user(self, user_data: UserCreate) -> User:
        """Criar novo usuário"""
        # Verificar se email já existe
        existing = self.db.query(User).filter(User.email == user_data.email).first()
        if existing:
            raise BadRequestException("Email já cadastrado")

        user = User(
            name=user_data.name,
            email=user_data.email,
            hashed_password=get_password_hash(user_data.password),
            role=user_data.role
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def create_tokens(self, user: User) -> Token:
        """Criar tokens de acesso e refresh"""
        access_token = create_access_token(
            data={"sub": str(user.id), "role": user.role.value}
        )
        refresh_token = create_refresh_token(data={"sub": str(user.id)})

        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer"
        )

    def refresh_tokens(self, refresh_token: str) -> Token:
        """Renovar tokens usando refresh token"""
        payload = decode_token(refresh_token)
        if payload is None:
            raise CredentialsException()

        if payload.get("type") != "refresh":
            raise CredentialsException()

        user_id = payload.get("sub")
        if user_id is None:
            raise CredentialsException()

        user = self.db.query(User).filter(User.id == int(user_id)).first()
        if user is None:
            raise CredentialsException()

        if not user.is_active:
            raise CredentialsException()

        return self.create_tokens(user)
