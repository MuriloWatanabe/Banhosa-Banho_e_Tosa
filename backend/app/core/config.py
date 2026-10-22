"""Configurações centrais da aplicação.

Todas as configurações são lidas de variáveis de ambiente (ou de um
arquivo .env na raiz do projeto), nunca hard-coded no código.
"""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Aplicação
    PROJECT_NAME: str = "Banhosa API"
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = "development"  # development | test | production

    # Banco de dados (PostgreSQL)
    DATABASE_URL: str = "postgresql+psycopg2://banhosa:banhosa@localhost:5432/banhosa"

    # Segurança / JWT
    SECRET_KEY: str = "CHANGE_ME_INSECURE_DEV_ONLY_SECRET_KEY"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8  # 8 horas

    # CORS — origens permitidas (frontend Next.js)
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # RN-01 — durações-base por serviço (minutos). Porte Grande/Gigante dobra.
    BASE_SERVICE_DURATIONS_MINUTES: dict[str, int] = {
        "Banho": 60,
        "Banho + Tosa": 60,
        "Tosa higiênica": 45,
        "Consulta veterinária": 30,
    }

    # Papel do profissional exigido por cada serviço (ex.: um Tosador não
    # pode atender uma "Consulta veterinária").
    SERVICE_REQUIRED_ROLES: dict[str, str] = {
        "Banho": "Tosador",
        "Banho + Tosa": "Tosador",
        "Tosa higiênica": "Tosador",
        "Consulta veterinária": "Veterinário",
    }

    # Horário de funcionamento (usado para validar agendamentos)
    BUSINESS_START_HOUR: int = 8
    BUSINESS_END_HOUR: int = 19

    # Fuso horário do pet shop — referência para "data/horário no passado",
    # independente do fuso do servidor/container (geralmente UTC).
    TIMEZONE: str = "America/Sao_Paulo"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
