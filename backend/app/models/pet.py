import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import EspeciePet, PortePet

if TYPE_CHECKING:
    from app.models.agendamento import Agendamento
    from app.models.tutor import Tutor


class Pet(Base):
    __tablename__ = "pets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    species: Mapped[EspeciePet] = mapped_column(
        Enum(EspeciePet, name="especie_pet", values_callable=lambda enum_cls: [e.value for e in enum_cls]),
        nullable=False,
    )
    breed: Mapped[str] = mapped_column(String(120), nullable=False)
    size: Mapped[PortePet] = mapped_column(
        Enum(PortePet, name="porte_pet", values_callable=lambda enum_cls: [e.value for e in enum_cls]),
        nullable=False,
    )

    tutor_id: Mapped[str] = mapped_column(ForeignKey("tutores.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    tutor: Mapped["Tutor"] = relationship(back_populates="pets")
    agendamentos: Mapped[list["Agendamento"]] = relationship(back_populates="pet")

    @property
    def tutor_name(self) -> str:
        """Usado pelo schema PetRead (campo tutorName do frontend)."""
        return self.tutor.name if self.tutor else ""
