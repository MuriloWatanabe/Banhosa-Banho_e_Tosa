from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.tutor import Tutor


def list_all(db: Session) -> list[Tutor]:
    stmt = select(Tutor).options(selectinload(Tutor.pets)).order_by(Tutor.name)
    return list(db.scalars(stmt).all())


def get_by_id(db: Session, tutor_id: str) -> Tutor | None:
    stmt = select(Tutor).options(selectinload(Tutor.pets)).where(Tutor.id == tutor_id)
    return db.scalars(stmt).first()


def get_by_email(db: Session, email: str) -> Tutor | None:
    stmt = select(Tutor).where(Tutor.email == email)
    return db.scalars(stmt).first()


def create(db: Session, tutor: Tutor) -> Tutor:
    db.add(tutor)
    db.commit()
    db.refresh(tutor)
    return tutor


def update(db: Session, tutor: Tutor) -> Tutor:
    db.commit()
    db.refresh(tutor)
    return tutor


def delete(db: Session, tutor: Tutor) -> None:
    db.delete(tutor)
    db.commit()
