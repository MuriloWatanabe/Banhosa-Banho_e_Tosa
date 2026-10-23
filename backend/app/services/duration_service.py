"""RN-01 — Cálculo da duração do atendimento.

Regra de negócio: portes Grande e Gigante dobram a duração-base do
serviço. Esta função é pura (sem I/O), o que permite testá-la
unitariamente sem qualquer dependência de banco de dados ou HTTP.
"""

from app.core.config import settings
from app.core.exceptions import ValidationError
from app.models.enums import PortePet

_PORTES_QUE_DOBRAM_DURACAO = {PortePet.GRANDE, PortePet.GIGANTE}


def get_base_duration_minutes(service: str) -> int:
    """Retorna a duração-base (minutos) configurada para um serviço.

    Levanta ValidationError se o serviço não for reconhecido, para
    evitar agendamentos com duração indefinida.
    """
    try:
        return settings.BASE_SERVICE_DURATIONS_MINUTES[service]
    except KeyError as exc:
        servicos_validos = ", ".join(settings.BASE_SERVICE_DURATIONS_MINUTES.keys())
        raise ValidationError(
            f"Serviço '{service}' não reconhecido. Serviços válidos: {servicos_validos}."
        ) from exc


def calculate_duration_minutes(service: str, size: PortePet) -> int:
    """RN-01: duração-base do serviço, dobrada para porte Grande/Gigante."""
    base_minutes = get_base_duration_minutes(service)
    if size in _PORTES_QUE_DOBRAM_DURACAO:
        return base_minutes * 2
    return base_minutes
