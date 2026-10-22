from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.models.pet import Pet
from app.repositories import agendamento_repository, pet_repository, tutor_repository
from app.schemas.pet import PetCreate


def list_pets(db: Session) -> list[Pet]:
    return pet_repository.list_all(db)


def create_pet(db: Session, payload: PetCreate) -> Pet:
    tutor = tutor_repository.get_by_id(db, payload.tutor_id)
    if tutor is None:
        raise NotFoundError(f"Tutor '{payload.tutor_id}' não encontrado.")

    pet = Pet(
        name=payload.name,
        species=payload.species,
        breed=payload.breed,
        size=payload.size,
        tutor_id=tutor.id,
    )
    return pet_repository.create(db, pet)


def delete_pet(db: Session, pet_id: str) -> None:
    pet = pet_repository.get_by_id(db, pet_id)
    if pet is None:
        raise NotFoundError(f"Pet '{pet_id}' não encontrado.")
    if agendamento_repository.exists_for_pet(db, pet.id):
        raise ConflictError(
            "Não é possível excluir o pet: existem agendamentos vinculados a ele. "
            "Exclua esses agendamentos antes de remover o pet."
        )
    pet_repository.delete(db, pet)
