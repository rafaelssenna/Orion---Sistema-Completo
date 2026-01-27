from pydantic_settings import BaseSettings
from typing import List
import json


class Settings(BaseSettings):
    # Banco de Dados
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/orion"

    # JWT
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    CORS_ORIGINS: str = '["http://localhost:3000","http://localhost:3001"]'

    @property
    def cors_origins_list(self) -> List[str]:
        try:
            return json.loads(self.CORS_ORIGINS)
        except:
            return ["http://localhost:3000", "http://localhost:3001"]

    # ImgBB
    IMGBB_API_KEY: str = ""

    # App
    DEBUG: bool = False

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()
