"""Reexporta todos os modelos ORM.

Importante: este módulo precisa ser importado (direta ou
indiretamente) antes de qualquer `Base.metadata.create_all(...)` ou
`alembic revision --autogenerate`, para que todas as tabelas estejam
registradas no metadata do SQLAlchemy.
"""

from app.models.agendamento import Agendamento
from app.models.pet import Pet
from app.models.profissional import Profissional
from app.models.tutor import Tutor
from app.models.usuario import Usuario

__all__ = ["Tutor", "Pet", "Profissional", "Agendamento", "Usuario"]
