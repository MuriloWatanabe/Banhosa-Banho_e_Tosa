from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.tutor import TutorCreate, TutorRead, TutorUpdate
from app.services import tutor_service

router = APIRouter(prefix="/tutores", tags=["tutores"])


@router.get("", response_model=list[TutorRead])
def list_tutores(db: DbSession, _current_user: CurrentUser) -> list[TutorRead]:
    return tutor_service.list_tutors(db)


@router.post("", response_model=TutorRead, status_code=status.HTTP_201_CREATED)
def create_tutor(payload: TutorCreate, db: DbSession, _current_user: CurrentUser) -> TutorRead:
    return tutor_service.create_tutor(db, payload)


@router.put("/{tutor_id}", response_model=TutorRead)
def update_tutor(tutor_id: str, payload: TutorUpdate, db: DbSession, _current_user: CurrentUser) -> TutorRead:
    return tutor_service.update_tutor(db, tutor_id, payload)


@router.delete("/{tutor_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tutor(tutor_id: str, db: DbSession, _current_user: CurrentUser) -> None:
    tutor_service.delete_tutor(db, tutor_id)
