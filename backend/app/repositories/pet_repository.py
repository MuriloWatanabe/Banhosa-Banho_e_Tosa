from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.pet import Pet


def list_all(db: Session) -> list[Pet]:
    stmt = select(Pet).options(selectinload(Pet.tutor)).order_by(Pet.name)
    return list(db.scalars(stmt).all())


def get_by_id(db: Session, pet_id: str) -> Pet | None:
    stmt = select(Pet).options(selectinload(Pet.tutor)).where(Pet.id == pet_id)
    return db.scalars(stmt).first()


def create(db: Session, pet: Pet) -> Pet:
    db.add(pet)
    db.commit()
    db.refresh(pet)
    return pet


def update(db: Session, pet: Pet) -> Pet:
    db.commit()
    db.refresh(pet)
    return pet


def delete(db: Session, pet: Pet) -> None:
    db.delete(pet)
    db.commit()
