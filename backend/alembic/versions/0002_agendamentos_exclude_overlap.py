"""constraint de exclusão contra sobreposição de agendamentos (RN-02 / M04)

Revision ID: 0002_exclude_overlap
Revises: 0001_initial
Create Date: 2026-10-17

A checagem de sobreposição da RN-02 era feita apenas em memória, na
camada de serviço: duas requisições simultâneas podiam gravar horários
sobrepostos para o mesmo profissional. Esta constraint garante a regra
no próprio banco, ignorando agendamentos cancelados.

Atenção: se a base já contiver sobreposições, o ADD CONSTRAINT falha —
elas precisam ser resolvidas (canceladas/remarcadas) antes do upgrade.
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0002_exclude_overlap"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

CONSTRAINT_NAME = "ex_agendamentos_profissional_sem_sobreposicao"


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS btree_gist")
    op.execute(
        f"ALTER TABLE agendamentos ADD CONSTRAINT {CONSTRAINT_NAME} "
        "EXCLUDE USING gist ("
        "profissional_id WITH =, "
        'tsrange("date" + start_time, "date" + start_time + make_interval(mins => duration_minutes)) WITH &&'
        ") WHERE (status <> 'Cancelado')"
    )


def downgrade() -> None:
    op.execute(f"ALTER TABLE agendamentos DROP CONSTRAINT IF EXISTS {CONSTRAINT_NAME}")
