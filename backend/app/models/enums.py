"""Enums compartilhados pelos modelos ORM.

Os valores espelham exatamente os literais usados no frontend
(src/types/index.ts) para que schemas Pydantic sirvam a resposta
sem nenhuma tradução.
"""

import enum


class EspeciePet(str, enum.Enum):
    CAO = "Cão"
    GATO = "Gato"


class PortePet(str, enum.Enum):
    PEQUENO = "Pequeno"
    MEDIO = "Médio"
    GRANDE = "Grande"
    GIGANTE = "Gigante"


class PapelProfissional(str, enum.Enum):
    TOSADOR = "Tosador"
    VETERINARIO = "Veterinário"


class StatusAgendamento(str, enum.Enum):
    CONFIRMADO = "Confirmado"
    PENDENTE = "Pendente"
    CONCLUIDO = "Concluído"
    CANCELADO = "Cancelado"
