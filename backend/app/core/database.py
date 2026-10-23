"""Configuração do SQLAlchemy: engine, sessão e Base declarativa."""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Base declarativa para todos os modelos ORM."""


def get_db() -> Generator:
    """Dependency do FastAPI: fornece uma sessão de banco por request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
