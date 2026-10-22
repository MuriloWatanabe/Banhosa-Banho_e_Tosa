from pydantic import BaseModel, ConfigDict, EmailStr, Field


class TutorBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    phone: str = Field(min_length=1, max_length=30)
    email: EmailStr


class TutorCreate(TutorBase):
    pass


class TutorUpdate(TutorBase):
    pass


class TutorRead(TutorBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    petsCount: int = Field(validation_alias="pets_count", serialization_alias="petsCount", default=0)
