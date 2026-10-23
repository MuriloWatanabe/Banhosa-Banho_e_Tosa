from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.agendamento import (
    AgendamentoCreate,
    AgendamentoRead,
    AgendamentoStatusUpdate,
    AgendamentoUpdate,
)
from app.services import agendamento_service

router = APIRouter(prefix="/agendamentos", tags=["agendamentos"])


@router.get("", response_model=list[AgendamentoRead])
def list_agendamentos(db: DbSession, _current_user: CurrentUser) -> list[AgendamentoRead]:
    return agendamento_service.list_appointments(db)


@router.post("", response_model=AgendamentoRead, status_code=status.HTTP_201_CREATED)
def create_agendamento(
    payload: AgendamentoCreate, db: DbSession, _current_user: CurrentUser
) -> AgendamentoRead:
    return agendamento_service.create_appointment(db, payload)


@router.put("/{agendamento_id}", response_model=AgendamentoRead)
def update_agendamento(
    agendamento_id: str, payload: AgendamentoUpdate, db: DbSession, _current_user: CurrentUser
) -> AgendamentoRead:
    return agendamento_service.update_appointment(db, agendamento_id, payload)


@router.patch("/{agendamento_id}/status", response_model=AgendamentoRead)
def change_agendamento_status(
    agendamento_id: str, payload: AgendamentoStatusUpdate, db: DbSession, _current_user: CurrentUser
) -> AgendamentoRead:
    return agendamento_service.change_status(db, agendamento_id, payload.status)


@router.delete("/{agendamento_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_agendamento(agendamento_id: str, db: DbSession, _current_user: CurrentUser) -> None:
    agendamento_service.delete_appointment(db, agendamento_id)
