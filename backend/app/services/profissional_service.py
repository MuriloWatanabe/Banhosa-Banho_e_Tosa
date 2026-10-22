from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.models.profissional import Profissional
from app.repositories import agendamento_repository, profissional_repository
from app.schemas.profissional import ProfissionalCreate, ProfissionalUpdate


def _get_or_404(db: Session, profissional_id: str) -> Profissional:
    profissional = profissional_repository.get_by_id(db, profissional_id)
    if profissional is None:
        raise NotFoundError(f"Profissional '{profissional_id}' não encontrado.")
    return profissional


def list_professionals(db: Session) -> list[Profissional]:
    return profissional_repository.list_all(db)


def create_professional(db: Session, payload: ProfissionalCreate) -> Profissional:
    profissional = Profissional(
        name=payload.name,
        role=payload.role,
        specialty=payload.specialty,
        active=payload.active,
    )
    return profissional_repository.create(db, profissional)


def update_professional(db: Session, profissional_id: str, payload: ProfissionalUpdate) -> Profissional:
    profissional = _get_or_404(db, profissional_id)

    profissional.name = payload.name
    profissional.role = payload.role
    profissional.specialty = payload.specialty
    profissional.active = payload.active
    return profissional_repository.update(db, profissional)


def delete_professional(db: Session, profissional_id: str) -> None:
    profissional = _get_or_404(db, profissional_id)
    if agendamento_repository.exists_for_professional(db, profissional.id):
        raise ConflictError(
            "Não é possível excluir o profissional: existem agendamentos vinculados a ele. "
            "Para preservar o histórico, inative o profissional em vez de excluí-lo."
        )
    profissional_repository.delete(db, profissional)
