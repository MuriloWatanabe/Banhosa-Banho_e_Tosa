from datetime import date as date_type
from datetime import datetime
from datetime import time as time_type
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import NotFoundError, ValidationError
from app.models.agendamento import Agendamento
from app.models.enums import StatusAgendamento
from app.models.pet import Pet
from app.models.profissional import Profissional
from app.repositories import agendamento_repository, pet_repository, profissional_repository
from app.schemas.agendamento import AgendamentoCreate, AgendamentoUpdate
from app.services import availability_service, duration_service
from app.services.availability_service import ExistingBooking

# Transições de status permitidas. Concluído e Cancelado são estados finais:
# o agendamento deixa de ser editável e permanece apenas como histórico.
_ALLOWED_STATUS_TRANSITIONS: dict[StatusAgendamento, set[StatusAgendamento]] = {
    StatusAgendamento.PENDENTE: {
        StatusAgendamento.CONFIRMADO,
        StatusAgendamento.CONCLUIDO,
        StatusAgendamento.CANCELADO,
    },
    StatusAgendamento.CONFIRMADO: {StatusAgendamento.CONCLUIDO, StatusAgendamento.CANCELADO},
    StatusAgendamento.CONCLUIDO: set(),
    StatusAgendamento.CANCELADO: set(),
}


def _now() -> datetime:
    """Data/hora atual no fuso do pet shop (naive, comparável a date+time
    gravados no banco). Isolada em função para facilitar o monkeypatch nos testes."""
    return datetime.now(ZoneInfo(settings.TIMEZONE)).replace(tzinfo=None)


def _assert_professional_active(profissional: Profissional) -> None:
    if not profissional.active:
        raise ValidationError(
            f"O profissional '{profissional.name}' está inativo e não pode receber agendamentos."
        )


def _assert_service_matches_role(service: str, profissional: Profissional) -> None:
    required_role = settings.SERVICE_REQUIRED_ROLES.get(service)
    if required_role is not None and profissional.role.value != required_role:
        raise ValidationError(
            f"O serviço '{service}' exige um profissional com papel '{required_role}', "
            f"mas '{profissional.name}' é '{profissional.role.value}'."
        )


def _assert_not_in_past(date: date_type, start_time: time_type) -> None:
    if datetime.combine(date, start_time) < _now():
        raise ValidationError("Não é possível agendar em data/horário no passado.")


def _validate_booking(
    db: Session,
    *,
    pet_id: str,
    profissional_id: str,
    service: str,
    date: date_type,
    start_time: time_type,
    exclude_id: str | None = None,
) -> tuple[Pet, Profissional, int]:
    """Validações comuns à criação e à remarcação. Retorna o pet, o
    profissional e a duração calculada (RN-01)."""
    pet = pet_repository.get_by_id(db, pet_id)
    if pet is None:
        raise NotFoundError(f"Pet '{pet_id}' não encontrado.")

    # Trava a linha do profissional até o commit: requisições simultâneas
    # para o mesmo profissional são serializadas e a checagem da RN-02
    # abaixo sempre enxerga os agendamentos já gravados (M04).
    profissional = profissional_repository.get_by_id_for_update(db, profissional_id)
    if profissional is None:
        raise NotFoundError(f"Profissional '{profissional_id}' não encontrado.")

    # RN-01: duração é sempre recalculada no servidor — nunca confiada ao cliente.
    # Também rejeita serviços desconhecidos.
    duration_minutes = duration_service.calculate_duration_minutes(service, pet.size)

    _assert_professional_active(profissional)
    _assert_service_matches_role(service, profissional)
    _assert_not_in_past(date, start_time)
    availability_service.assert_within_business_hours(start_time, duration_minutes)

    # RN-02: bloqueia sobreposição de horário para o mesmo profissional/data.
    existing = agendamento_repository.list_by_professional_and_date(
        db, profissional_id=profissional.id, date=date, exclude_id=exclude_id
    )
    existing_bookings = [
        ExistingBooking(id=item.id, start_time=item.start_time, duration_minutes=item.duration_minutes)
        for item in existing
    ]
    availability_service.assert_no_conflict(start_time, duration_minutes, existing_bookings)

    return pet, profissional, duration_minutes


def _get_or_404(db: Session, agendamento_id: str) -> Agendamento:
    agendamento = agendamento_repository.get_by_id(db, agendamento_id)
    if agendamento is None:
        raise NotFoundError(f"Agendamento '{agendamento_id}' não encontrado.")
    return agendamento


def list_appointments(db: Session) -> list[Agendamento]:
    return agendamento_repository.list_all(db)


def create_appointment(db: Session, payload: AgendamentoCreate) -> Agendamento:
    pet, profissional, duration_minutes = _validate_booking(
        db,
        pet_id=payload.pet_id,
        profissional_id=payload.profissional_id,
        service=payload.service,
        date=payload.date,
        start_time=payload.start_time,
    )

    agendamento = Agendamento(
        pet_id=pet.id,
        profissional_id=profissional.id,
        service=payload.service,
        date=payload.date,
        start_time=payload.start_time,
        duration_minutes=duration_minutes,
        status=payload.status,
    )
    return agendamento_repository.create(db, agendamento)


def update_appointment(db: Session, agendamento_id: str, payload: AgendamentoUpdate) -> Agendamento:
    agendamento = _get_or_404(db, agendamento_id)
    if not _ALLOWED_STATUS_TRANSITIONS[agendamento.status]:
        raise ValidationError(f"Agendamentos com status '{agendamento.status.value}' não podem ser editados.")

    pet, profissional, duration_minutes = _validate_booking(
        db,
        pet_id=payload.pet_id,
        profissional_id=payload.profissional_id,
        service=payload.service,
        date=payload.date,
        start_time=payload.start_time,
        exclude_id=agendamento.id,
    )

    agendamento.pet = pet
    agendamento.profissional = profissional
    agendamento.service = payload.service
    agendamento.date = payload.date
    agendamento.start_time = payload.start_time
    agendamento.duration_minutes = duration_minutes
    return agendamento_repository.update(db, agendamento)


def change_status(db: Session, agendamento_id: str, new_status: StatusAgendamento) -> Agendamento:
    agendamento = _get_or_404(db, agendamento_id)
    if new_status not in _ALLOWED_STATUS_TRANSITIONS[agendamento.status]:
        raise ValidationError(
            f"Transição de status inválida: '{agendamento.status.value}' → '{new_status.value}'."
        )
    agendamento.status = new_status
    return agendamento_repository.update(db, agendamento)


def delete_appointment(db: Session, agendamento_id: str) -> None:
    agendamento = _get_or_404(db, agendamento_id)
    agendamento_repository.delete(db, agendamento)
