"""
Script para criar o primeiro usuário admin
Execute com: python -m scripts.create_admin
"""
import sys
sys.path.append(".")

from app.database import SessionLocal, engine
from app.models import Base, User, UserRole
from app.core.security import get_password_hash


def create_admin():
    # Criar tabelas se não existirem
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        # Verificar se já existe admin
        existing_admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
        if existing_admin:
            print(f"Ja existe um admin cadastrado: {existing_admin.email}")
            return

        # Criar admin
        admin = User(
            name="Administrador",
            email="admin@orion.com",
            hashed_password=get_password_hash("admin123"),
            role=UserRole.ADMIN,
            is_active=True
        )

        db.add(admin)
        db.commit()

        print("Admin criado com sucesso!")
        print("Email: admin@orion.com")
        print("Senha: admin123")
        print("\nIMPORTANTE: Altere a senha apos o primeiro acesso!")

    finally:
        db.close()


if __name__ == "__main__":
    create_admin()
