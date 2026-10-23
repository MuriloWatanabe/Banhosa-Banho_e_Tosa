import uuid
from datetime import date as date_type
from datetime import datetime
from datetime import time as time_type
from typing import TYPE_CHECKING

from sqlalchemy import DDL, Date, DateTime, Enum, ForeignKey, Integer, String, Time, event, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import StatusAgendamento

if TYPE_CHECKING:
    from app.models.pet import Pet
    from app.models.profissional import Profissional

# RN-02 no nível do banco: impede que dois agendamentos não cancelados do
# mesmo profissional ocupem intervalos sobrepostos, mesmo sob requisições
# concorrentes. Exige a extensão btree_gist (igualdade de texto em índice GiST).
# Mesma definição da migration 0002 — mantenha as duas em sincronia para
# que create_all e Alembic gerem o mesmo schema.
EXCLUDE_OVERLAP_CONSTRAINT_NAME = "ex_agendamentos_profissional_sem_sobreposicao"
CREATE_BTREE_GIST_SQL = "CREATE EXTENSION IF NOT EXISTS btree_gist"
ADD_EXCLUDE_OVERLAP_SQL = (
    f"ALTER TABLE agendamentos ADD CONSTRAINT {EXCLUDE_OVERLAP_CONSTRAINT_NAME} "
    "EXCLUDE USING gist ("
    "profissional_id WITH =, "
    'tsrange("date" + start_time, "date" + start_time + make_interval(mins => duration_minutes)) WITH &&'
    ") WHERE (status <> 'Cancelado')"
)


class Agendamento(Base):
    __tablename__ = "agendamentos"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    pet_id: Mapped[str] = mapped_column(ForeignKey("pets.id", ondelete="RESTRICT"), nullable=False)
    profissional_id: Mapped[str] = mapped_column(
        ForeignKey("profissionais.id", ondelete="RESTRICT"), nullable=False
    )

    service: Mapped[str] = mapped_column(String(60), nullable=False)
    date: Mapped[date_type] = mapped_column(Date, nullable=False)
    start_time: Mapped[time_type] = mapped_column(Time, nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[StatusAgendamento] = mapped_column(
        Enum(
            StatusAgendamento,
            name="status_agendamento",
            values_callable=lambda enum_cls: [e.value for e in enum_cls],
        ),
        nullable=False,
        default=StatusAgendamento.PENDENTE,
    )

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    pet: Mapped["Pet"] = relationship(back_populates="agendamentos")
    profissional: Mapped["Profissional"] = relationship(back_populates="agendamentos")

    # Propriedades de conveniência para o schema AgendamentoRead, que
    # espelha o formato "achatado" (denormalizado) esperado pelo frontend.
    @property
    def pet_name(self) -> str:
        return self.pet.name if self.pet else ""

    @property
    def tutor_name(self) -> str:
        return self.pet.tutor.name if self.pet and self.pet.tutor else ""

    @property
    def professional_name(self) -> str:
        return self.profissional.name if self.profissional else ""

    @property
    def size(self):  # PortePet, evitando import circular no type hint
        return self.pet.size if self.pet else None


# Aplica a constraint quando o schema é criado via metadata.create_all
# (ex.: app.seed). Via Alembic, a migration 0002 cuida disso. Somente
# PostgreSQL — o SQLite usado nos testes não suporta EXCLUDE.
event.listen(
    Agendamento.__table__,
    "before_create",
    DDL(CREATE_BTREE_GIST_SQL).execute_if(dialect="postgresql"),
)
event.listen(
    Agendamento.__table__,
    "after_create",
    DDL(ADD_EXCLUDE_OVERLAP_SQL).execute_if(dialect="postgresql"),
)
