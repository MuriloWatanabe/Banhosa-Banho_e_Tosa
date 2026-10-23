"""Popula o banco com o usuário administrativo padrão.

Usa as mesmas credenciais que já estavam hard-coded no mock de login
do frontend (src/app/login/page.tsx), para que a integração real
funcione sem precisar mudar a tela de login imediatamente.

Uso:
    python -m app.seed
"""

from app.core.database import Base, SessionLocal, engine
from app.core.security import hash_password
from app.models import Usuario  # noqa: F401 (garante o registro no metadata)
from app.repositories import usuario_repository

DEFAULT_USERNAME = "banhosa.adm"
DEFAULT_PASSWORD = "banhosa123"


def run() -> None:
    Base.metadata.create_all(bind=engine)  # atalho de dev; em produção, usar Alembic

    db = SessionLocal()
    try:
        existing = usuario_repository.get_by_username(db, DEFAULT_USERNAME)
        if existing is not None:
            print(f"Usuário '{DEFAULT_USERNAME}' já existe. Nada a fazer.")
            return

        usuario = Usuario(
            username=DEFAULT_USERNAME,
            hashed_password=hash_password(DEFAULT_PASSWORD),
            active=True,
        )
        usuario_repository.create(db, usuario)
        print(f"Usuário '{DEFAULT_USERNAME}' criado com sucesso.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
