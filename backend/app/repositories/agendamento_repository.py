from datetime import date as date_type

from sqlalchemy import exists, select
from sqlalchemy.orm import Session, selectinload

from app.models.agendamento import Agendamento
from app.models.pet import Pet

_EAGER = (
    # pet + pet.tutor aninhado (usado por AgendamentoRead.tutorName/petName)
    selectinload(Agendamento.pet).selectinload(Pet.tutor),
    selectinload(Agendamento.profissional),
)


def list_all(db: Session) -> list[Agendamento]:
    stmt = select(Agendamento).options(*_EAGER).order_by(Agendamento.date, Agendamento.start_time)
    return list(db.scalars(stmt).all())


def list_by_date(db: Session, date: date_type) -> list[Agendamento]:
    stmt = (
        select(Agendamento)
        .options(*_EAGER)
        .where(Agendamento.date == date)
        .order_by(Agendamento.start_time)
    )
    return list(db.scalars(stmt).all())


def list_by_professional_and_date(
    db: Session, profissional_id: str, date: date_type, exclude_id: str | None = None
) -> list[Agendamento]:
    """Usado pela RN-02 (verificação de conflito de horário).

    Traz todos os agendamentos ativos (não cancelados) do mesmo
    profissional, na mesma data, para checagem de sobreposição em
    memória na camada de serviço (mantém a regra de negócio isolada
    e testável, fora do SQL).
    """
    stmt = (
        select(Agendamento)
        .options(*_EAGER)
        .where(
            Agendamento.profissional_id == profissional_id,
            Agendamento.date == date,
            Agendamento.status != "Cancelado",
        )
    )
    if exclude_id is not None:
        stmt = stmt.where(Agendamento.id != exclude_id)
    return list(db.scalars(stmt).all())


def get_by_id(db: Session, agendamento_id: str) -> Agendamento | None:
    stmt = select(Agendamento).options(*_EAGER).where(Agendamento.id == agendamento_id)
    return db.scalars(stmt).first()


def exists_for_pet(db: Session, pet_id: str) -> bool:
    return bool(db.scalar(select(exists().where(Agendamento.pet_id == pet_id))))


def exists_for_professional(db: Session, profissional_id: str) -> bool:
    return bool(db.scalar(select(exists().where(Agendamento.profissional_id == profissional_id))))


def exists_for_tutor(db: Session, tutor_id: str) -> bool:
    stmt = select(exists().where(Agendamento.pet_id == Pet.id, Pet.tutor_id == tutor_id))
    return bool(db.scalar(stmt))


def create(db: Session, agendamento: Agendamento) -> Agendamento:
    db.add(agendamento)
    db.commit()
    db.refresh(agendamento)
    return agendamento


def delete(db: Session, agendamento: Agendamento) -> None:
    db.delete(agendamento)
    db.commit()
