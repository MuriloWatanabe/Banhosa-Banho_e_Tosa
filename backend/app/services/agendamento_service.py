from datetime import date as date_type, datetime, time as time_type
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import NotFoundError, ValidationError
from app.models.agendamento import Agendamento
from app.models.profissional import Profissional
from app.repositories import agendamento_repository, pet_repository, profissional_repository
from app.schemas.agendamento import AgendamentoCreate
from app.services import availability_service, duration_service
from app.services.availability_service import ExistingBooking


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


def list_appointments(db: Session) -> list[Agendamento]:
    return agendamento_repository.list_all(db)


def create_appointment(db: Session, payload: AgendamentoCreate) -> Agendamento:
    pet = pet_repository.get_by_id(db, payload.pet_id)
    if pet is None:
        raise NotFoundError(f"Pet '{payload.pet_id}' não encontrado.")

    profissional = profissional_repository.get_by_id(db, payload.profissional_id)
    if profissional is None:
        raise NotFoundError(f"Profissional '{payload.profissional_id}' não encontrado.")

    # RN-01: duração é sempre recalculada no servidor — nunca confiada ao cliente.
    # Também rejeita serviços desconhecidos.
    duration_minutes = duration_service.calculate_duration_minutes(payload.service, pet.size)

    _assert_professional_active(profissional)
    _assert_service_matches_role(payload.service, profissional)
    _assert_not_in_past(payload.date, payload.start_time)
    availability_service.assert_within_business_hours(payload.start_time, duration_minutes)

    # RN-02: bloqueia sobreposição de horário para o mesmo profissional/data.
    existing = agendamento_repository.list_by_professional_and_date(
        db, profissional_id=profissional.id, date=payload.date
    )
    existing_bookings = [
        ExistingBooking(id=item.id, start_time=item.start_time, duration_minutes=item.duration_minutes)
        for item in existing
    ]
    availability_service.assert_no_conflict(payload.start_time, duration_minutes, existing_bookings)

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


def delete_appointment(db: Session, agendamento_id: str) -> None:
    agendamento = agendamento_repository.get_by_id(db, agendamento_id)
    if agendamento is None:
        raise NotFoundError(f"Agendamento '{agendamento_id}' não encontrado.")
    agendamento_repository.delete(db, agendamento)
