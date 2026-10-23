"""
@file Unitários: Serviço de Disponibilidade (Availability Service)
@description Valida puramente as regras de negócio para conflitos de horário 
e limites do expediente de trabalho, garantindo a integridade da agenda.

@type {Teste de Unidade}

@notes
- REGRA DE NEGÓCIO (RN-02): A agenda não pode ter horários sobrepostos para o mesmo profissional.
- ISOLAMENTO E PERFORMANCE: Este é um teste puramente unitário. Utiliza a dataclass 
  simples `ExistingBooking`, não dependendo de banco de dados ou de requests HTTP.
"""

from datetime import time

import pytest

from app.core.exceptions import ConflictError, ValidationError
from app.services.availability_service import (
    ExistingBooking,
    assert_no_conflict,
    assert_within_business_hours,
)

# ==============================================================================
# SUÍTE DE TESTES: CONFLITOS DE AGENDA (RN-02)
# ==============================================================================


def test_no_conflict_when_no_existing_bookings() -> None:
    # Arrange, Act & Assert
    # Uma agenda vazia não deve levantar exceção (nenhum conflito)
    assert_no_conflict(time(10, 0), 60, existing_bookings=[])


def test_no_conflict_when_bookings_dont_overlap() -> None:
    # 1. Arrange (Agendamento existente: 09:00 às 10:00)
    existing = [ExistingBooking(id="1", start_time=time(9, 0), duration_minutes=60)]

    # 2. Act & Assert
    # Tentativa: 10:00 às 11:00. Começa exatamente quando o outro acaba (permitido)
    assert_no_conflict(time(10, 0), 60, existing)


def test_conflict_when_new_booking_starts_during_existing() -> None:
    # 1. Arrange (Agendamento existente: 09:00 às 10:00)
    existing = [ExistingBooking(id="1", start_time=time(9, 0), duration_minutes=60)]

    # 2. Act & Assert
    # Tentativa: 09:30 às 10:00. Inicia no meio do agendamento existente (bloqueado)
    with pytest.raises(ConflictError):
        assert_no_conflict(time(9, 30), 30, existing)


def test_conflict_when_new_booking_fully_contains_existing() -> None:
    # 1. Arrange (Agendamento existente curto: 09:30 às 09:45)
    existing = [ExistingBooking(id="1", start_time=time(9, 30), duration_minutes=15)]

    # 2. Act & Assert
    # Tentativa: 09:00 às 11:00. Engloba totalmente o agendamento existente (bloqueado)
    with pytest.raises(ConflictError):
        assert_no_conflict(time(9, 0), 120, existing)


def test_conflict_with_double_duration_large_pet() -> None:
    # 1. Arrange
    # Caso realista: Tosador com um Banho às 09:00 para um pet Grande.
    # Pela regra RN-01, o tempo dobra para 120min, terminando às 11:00.
    existing = [ExistingBooking(id="1", start_time=time(9, 0), duration_minutes=120)]

    # 2. Act & Assert
    # Tentativa: Novo agendamento às 10:30.
    # Deve ser recusado, mesmo que a hora de início "pareça" livre.
    with pytest.raises(ConflictError):
        assert_no_conflict(time(10, 30), 45, existing)


# ==============================================================================
# SUÍTE DE TESTES: VALIDAÇÃO DE HORÁRIO COMERCIAL
# ==============================================================================


def test_within_business_hours_ok() -> None:
    # Arrange, Act & Assert
    # Agendamento perfeitamente dentro do horário comercial
    assert_within_business_hours(time(9, 0), 60)


def test_within_business_hours_allows_appointment_ending_at_closing() -> None:
    # Arrange, Act & Assert
    # Agendamento de 1h que termina exatamente às 19:00 (hora limite)
    assert_within_business_hours(time(18, 0), 60)


def test_outside_business_hours_raises_validation_error() -> None:
    # Arrange, Act & Assert
    # Tentativa: Agendamento das 18:30 às 19:30 (ultrapassa o limite do expediente)
    with pytest.raises(ValidationError):
        assert_within_business_hours(time(18, 30), 60)
