import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Enum, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import PapelProfissional

if TYPE_CHECKING:
    from app.models.agendamento import Agendamento


class Profissional(Base):
    __tablename__ = "profissionais"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    role: Mapped[PapelProfissional] = mapped_column(
        Enum(
            PapelProfissional,
            name="papel_profissional",
            values_callable=lambda enum_cls: [e.value for e in enum_cls],
        ),
        nullable=False,
    )
    specialty: Mapped[str] = mapped_column(String(160), nullable=False, default="")
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    agendamentos: Mapped[list["Agendamento"]] = relationship(back_populates="profissional")
