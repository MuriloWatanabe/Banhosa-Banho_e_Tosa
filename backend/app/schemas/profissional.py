from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import PapelProfissional


class ProfissionalBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    role: PapelProfissional
    specialty: str = Field(default="", max_length=160)
    active: bool = True


class ProfissionalCreate(ProfissionalBase):
    pass


class ProfissionalUpdate(ProfissionalBase):
    pass


class ProfissionalRead(ProfissionalBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
