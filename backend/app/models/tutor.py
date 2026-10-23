import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.pet import Pet


class Tutor(Base):
    __tablename__ = "tutores"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    phone: Mapped[str] = mapped_column(String(30), nullable=False)
    email: Mapped[str] = mapped_column(String(160), nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    pets: Mapped[list["Pet"]] = relationship(back_populates="tutor", cascade="all, delete-orphan")

    @property
    def pets_count(self) -> int:
        """Usado pelo schema TutorRead (campo petsCount do frontend)."""
        return len(self.pets)
