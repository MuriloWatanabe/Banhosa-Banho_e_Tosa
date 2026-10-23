"""criacao das tabelas iniciais (tutores, pets, profissionais, agendamentos, usuarios)

Revision ID: 0001_initial
Revises:
Create Date: 2026-08-16

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0001_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


especie_pet = sa.Enum("Cão", "Gato", name="especie_pet")
porte_pet = sa.Enum("Pequeno", "Médio", "Grande", "Gigante", name="porte_pet")
papel_profissional = sa.Enum("Tosador", "Veterinário", name="papel_profissional")
status_agendamento = sa.Enum("Confirmado", "Pendente", "Concluído", "Cancelado", name="status_agendamento")


def upgrade() -> None:
    op.create_table(
        "usuarios",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("username", sa.String(length=80), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("username", name="uq_usuarios_username"),
    )

    op.create_table(
        "tutores",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("phone", sa.String(length=30), nullable=False),
        sa.Column("email", sa.String(length=160), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("email", name="uq_tutores_email"),
    )

    op.create_table(
        "profissionais",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("role", papel_profissional, nullable=False),
        sa.Column("specialty", sa.String(length=160), nullable=False, server_default=""),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "pets",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("species", especie_pet, nullable=False),
        sa.Column("breed", sa.String(length=120), nullable=False),
        sa.Column("size", porte_pet, nullable=False),
        sa.Column(
            "tutor_id",
            sa.String(length=36),
            sa.ForeignKey("tutores.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_pets_tutor_id", "pets", ["tutor_id"])

    op.create_table(
        "agendamentos",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column(
            "pet_id",
            sa.String(length=36),
            sa.ForeignKey("pets.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "profissional_id",
            sa.String(length=36),
            sa.ForeignKey("profissionais.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("service", sa.String(length=60), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("status", status_agendamento, nullable=False, server_default="Pendente"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    # RN-02 depende diretamente destas colunas: índice composto acelera a
    # busca de conflitos de horário por profissional/data.
    op.create_index(
        "ix_agendamentos_profissional_data",
        "agendamentos",
        ["profissional_id", "date"],
    )
    op.create_index("ix_agendamentos_pet_id", "agendamentos", ["pet_id"])


def downgrade() -> None:
    op.drop_index("ix_agendamentos_pet_id", table_name="agendamentos")
    op.drop_index("ix_agendamentos_profissional_data", table_name="agendamentos")
    op.drop_table("agendamentos")
    op.drop_index("ix_pets_tutor_id", table_name="pets")
    op.drop_table("pets")
    op.drop_table("profissionais")
    op.drop_table("tutores")
    op.drop_table("usuarios")

    status_agendamento.drop(op.get_bind(), checkfirst=True)
    papel_profissional.drop(op.get_bind(), checkfirst=True)
    porte_pet.drop(op.get_bind(), checkfirst=True)
    especie_pet.drop(op.get_bind(), checkfirst=True)
