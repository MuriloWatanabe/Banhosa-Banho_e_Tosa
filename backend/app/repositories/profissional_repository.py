from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.profissional import Profissional


def list_all(db: Session) -> list[Profissional]:
    stmt = select(Profissional).order_by(Profissional.name)
    return list(db.scalars(stmt).all())


def get_by_id(db: Session, profissional_id: str) -> Profissional | None:
    stmt = select(Profissional).where(Profissional.id == profissional_id)
    return db.scalars(stmt).first()


def get_by_id_for_update(db: Session, profissional_id: str) -> Profissional | None:
    """Busca o profissional travando a linha (SELECT ... FOR UPDATE) até o
    fim da transação. Serializa agendamentos concorrentes do mesmo
    profissional para que a checagem da RN-02 enxergue o estado já
    gravado pela outra requisição. No SQLite (testes) o FOR UPDATE é omitido."""
    stmt = select(Profissional).where(Profissional.id == profissional_id).with_for_update()
    return db.scalars(stmt).first()


def create(db: Session, profissional: Profissional) -> Profissional:
    db.add(profissional)
    db.commit()
    db.refresh(profissional)
    return profissional


def delete(db: Session, profissional: Profissional) -> None:
    db.delete(profissional)
    db.commit()
