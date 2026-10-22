from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.profissional import ProfissionalCreate, ProfissionalRead, ProfissionalUpdate
from app.services import profissional_service

router = APIRouter(prefix="/profissionais", tags=["profissionais"])


@router.get("", response_model=list[ProfissionalRead])
def list_profissionais(db: DbSession, _current_user: CurrentUser) -> list[ProfissionalRead]:
    return profissional_service.list_professionals(db)


@router.post("", response_model=ProfissionalRead, status_code=status.HTTP_201_CREATED)
def create_profissional(payload: ProfissionalCreate, db: DbSession, _current_user: CurrentUser) -> ProfissionalRead:
    return profissional_service.create_professional(db, payload)


@router.put("/{profissional_id}", response_model=ProfissionalRead)
def update_profissional(
    profissional_id: str, payload: ProfissionalUpdate, db: DbSession, _current_user: CurrentUser
) -> ProfissionalRead:
    return profissional_service.update_professional(db, profissional_id, payload)


@router.delete("/{profissional_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_profissional(profissional_id: str, db: DbSession, _current_user: CurrentUser) -> None:
    profissional_service.delete_professional(db, profissional_id)
