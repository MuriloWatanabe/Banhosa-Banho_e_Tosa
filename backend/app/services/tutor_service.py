from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.models.tutor import Tutor
from app.repositories import agendamento_repository, tutor_repository
from app.schemas.tutor import TutorCreate


def list_tutors(db: Session) -> list[Tutor]:
    return tutor_repository.list_all(db)


def create_tutor(db: Session, payload: TutorCreate) -> Tutor:
    if tutor_repository.get_by_email(db, payload.email) is not None:
        raise ValidationError(f"Já existe um tutor cadastrado com o e-mail '{payload.email}'.")
    tutor = Tutor(name=payload.name, phone=payload.phone, email=payload.email)
    return tutor_repository.create(db, tutor)


def delete_tutor(db: Session, tutor_id: str) -> None:
    tutor = tutor_repository.get_by_id(db, tutor_id)
    if tutor is None:
        raise NotFoundError(f"Tutor '{tutor_id}' não encontrado.")
    # Excluir o tutor remove os pets em cascata; agendamentos desses pets
    # bloqueiam a exclusão (FK RESTRICT) e precisam ser preservados como histórico.
    if agendamento_repository.exists_for_tutor(db, tutor.id):
        raise ConflictError(
            "Não é possível excluir o tutor: existem agendamentos vinculados aos seus pets. "
            "Exclua esses agendamentos antes de remover o tutor."
        )
    tutor_repository.delete(db, tutor)
