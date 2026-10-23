"""
@file Unitários: Serviço de Cálculo de Duração
@description Valida a lógica central de cálculo de tempo de serviços, garantindo 
a aplicação correta dos multiplicadores baseados no porte do pet.

@type {Teste de Unidade}

@notes
- REGRA DE NEGÓCIO (RN-01): A duração do atendimento dobra para pets de porte Grande e Gigante.
- PERFORMANCE E ISOLAMENTO: Teste puramente unitário. Executa a função de serviço diretamente, 
  sem nenhuma dependência de banco de dados, requisições HTTP ou fixtures complexas.
"""

import pytest

from app.core.exceptions import ValidationError
from app.models.enums import PortePet
from app.services.duration_service import calculate_duration_minutes

# ============================================================================
# SUÍTE DE TESTES: MULTIPLICADOR DE PORTE (RN-01)
# ============================================================================


@pytest.mark.parametrize(
    "size,expected_multiplier",
    [
        (PortePet.PEQUENO, 1),
        (PortePet.MEDIO, 1),
        (PortePet.GRANDE, 2),
        (PortePet.GIGANTE, 2),
    ],
)
def test_duration_multiplier_by_size(size: PortePet, expected_multiplier: int) -> None:
    # 1. Arrange (Define o tempo base de um serviço padrão)
    base_minutes = 60  # "Banho"

    # 2. Act
    duration = calculate_duration_minutes("Banho", size)

    # 3. Assert (Valida se o multiplicador correto foi aplicado sobre a base)
    assert duration == base_minutes * expected_multiplier


def test_duration_uses_correct_base_per_service() -> None:
    # Arrange, Act & Assert
    # Garante que cada serviço possui sua própria duração-base catalogada corretamente
    # antes de aplicar os multiplicadores da RN-01.
    assert calculate_duration_minutes("Tosa higiênica", PortePet.PEQUENO) == 45
    assert calculate_duration_minutes("Tosa higiênica", PortePet.GRANDE) == 90
    assert calculate_duration_minutes("Consulta veterinária", PortePet.MEDIO) == 30
    assert calculate_duration_minutes("Consulta veterinária", PortePet.GIGANTE) == 60


# ============================================================================
# SUÍTE DE TESTES: VALIDAÇÃO DE SERVIÇOS
# ============================================================================


def test_unknown_service_raises_validation_error() -> None:
    # Arrange, Act & Assert
    # Serviços não catalogados devem ser rejeitados imediatamente.
    with pytest.raises(ValidationError):
        calculate_duration_minutes("Serviço inexistente", PortePet.PEQUENO)


def test_unknown_service_error_lists_valid_services() -> None:
    # Arrange, Act & Assert
    # A mensagem de erro deve ser auto-explicativa e listar quais são os
    # serviços válidos disponíveis (ex: a string "Banho" deve constar na mensagem).
    with pytest.raises(ValidationError, match="Banho"):
        calculate_duration_minutes("Serviço inexistente", PortePet.PEQUENO)
