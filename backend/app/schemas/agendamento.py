from datetime import date as date_type
from datetime import time as time_type

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import PortePet, StatusAgendamento


class AgendamentoCreate(BaseModel):
    """Payload de criação. O backend recalcula a duração (RN-01) e valida
    disponibilidade (RN-02) — nada disso é confiado ao cliente."""

    pet_id: str
    profissional_id: str
    service: str = Field(min_length=1, max_length=60)
    date: date_type
    start_time: time_type
    status: StatusAgendamento = StatusAgendamento.PENDENTE


class AgendamentoUpdate(BaseModel):
    """Payload de edição/remarcação. Passa pelas mesmas validações da
    criação (RN-01, RN-02, M02). O status muda apenas pelo endpoint
    dedicado (PATCH /agendamentos/{id}/status), preservando o histórico."""

    pet_id: str
    profissional_id: str
    service: str = Field(min_length=1, max_length=60)
    date: date_type
    start_time: time_type


class AgendamentoStatusUpdate(BaseModel):
    status: StatusAgendamento


class AgendamentoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    # IDs de referência: permitem ao frontend pré-preencher a tela de edição.
    petId: str = Field(validation_alias="pet_id", serialization_alias="petId")
    professionalId: str = Field(validation_alias="profissional_id", serialization_alias="professionalId")
    petName: str = Field(validation_alias="pet_name", serialization_alias="petName")
    tutorName: str = Field(validation_alias="tutor_name", serialization_alias="tutorName")
    service: str
    size: PortePet
    professionalName: str = Field(
        validation_alias="professional_name", serialization_alias="professionalName"
    )
    date: date_type
    startTime: time_type = Field(validation_alias="start_time", serialization_alias="startTime")
    durationMinutes: int = Field(validation_alias="duration_minutes", serialization_alias="durationMinutes")
    status: StatusAgendamento
