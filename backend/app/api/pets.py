from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.pet import PetCreate, PetRead, PetUpdate
from app.services import pet_service

router = APIRouter(prefix="/pets", tags=["pets"])


@router.get("", response_model=list[PetRead])
def list_pets(db: DbSession, _current_user: CurrentUser) -> list[PetRead]:
    return pet_service.list_pets(db)


@router.post("", response_model=PetRead, status_code=status.HTTP_201_CREATED)
def create_pet(payload: PetCreate, db: DbSession, _current_user: CurrentUser) -> PetRead:
    return pet_service.create_pet(db, payload)


@router.put("/{pet_id}", response_model=PetRead)
def update_pet(pet_id: str, payload: PetUpdate, db: DbSession, _current_user: CurrentUser) -> PetRead:
    return pet_service.update_pet(db, pet_id, payload)


@router.delete("/{pet_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pet(pet_id: str, db: DbSession, _current_user: CurrentUser) -> None:
    pet_service.delete_pet(db, pet_id)
