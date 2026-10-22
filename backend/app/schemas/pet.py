from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import EspeciePet, PortePet


class PetBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    species: EspeciePet
    breed: str = Field(min_length=1, max_length=120)
    size: PortePet


class PetCreate(PetBase):
    tutor_id: str = Field(..., description="ID do tutor responsável pelo pet")


class PetUpdate(PetCreate):
    pass


class PetRead(PetBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    tutorName: str = Field(validation_alias="tutor_name", serialization_alias="tutorName")
