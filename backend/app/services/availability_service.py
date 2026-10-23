"""RN-02 — Disponibilidade de agenda / conflito de horário.

Evita agendamentos sobrepostos para o mesmo profissional, que é
exatamente o problema relatado pelo pet shop (atrasos e sobreposição
nos tosadores principais). A checagem é feita em memória, sobre uma
lista de agendamentos já existentes, para manter a regra pura e
testável sem precisar de um banco real.
"""

from dataclasses import dataclass
from datetime import time as time_type

from app.core.config import settings
from app.core.exceptions import ConflictError, ValidationError


@dataclass(frozen=True)
class ExistingBooking:
    """Representação mínima de um agendamento já existente, usada
    apenas para a checagem de sobreposição (desacoplada do ORM)."""

    id: str
    start_time: time_type
    duration_minutes: int


def _to_minutes(value: time_type) -> int:
    return value.hour * 60 + value.minute


def _intervals_overlap(start_a: int, end_a: int, start_b: int, end_b: int) -> bool:
    return start_a < end_b and start_b < end_a


def assert_within_business_hours(start_time: time_type, duration_minutes: int) -> None:
    start = _to_minutes(start_time)
    end = start + duration_minutes
    business_start = settings.BUSINESS_START_HOUR * 60
    business_end = settings.BUSINESS_END_HOUR * 60
    if start < business_start or end > business_end:
        raise ValidationError(
            "Horário fora do funcionamento "
            f"({settings.BUSINESS_START_HOUR:02d}h–{settings.BUSINESS_END_HOUR:02d}h)."
        )


def assert_no_conflict(
    new_start_time: time_type,
    new_duration_minutes: int,
    existing_bookings: list[ExistingBooking],
) -> None:
    """Levanta ConflictError se o novo horário sobrepõe algum agendamento
    existente do mesmo profissional/data (excluindo cancelados, que já
    vêm filtrados pelo repository)."""
    new_start = _to_minutes(new_start_time)
    new_end = new_start + new_duration_minutes

    for booking in existing_bookings:
        existing_start = _to_minutes(booking.start_time)
        existing_end = existing_start + booking.duration_minutes
        if _intervals_overlap(new_start, new_end, existing_start, existing_end):
            raise ConflictError(
                "Conflito de horário: o profissional já possui um agendamento "
                f"das {booking.start_time.strftime('%H:%M')} às "
                f"{time_type(existing_end // 60, existing_end % 60).strftime('%H:%M')}."
            )
