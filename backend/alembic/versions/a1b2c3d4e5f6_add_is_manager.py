"""add is_manager to account

Revision ID: a1b2c3d4e5f6
Revises: 2cab18db85c5
Create Date: 2026-04-03 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "2cab18db85c5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("account", sa.Column("is_manager", sa.Boolean(), nullable=False, server_default="false"))


def downgrade() -> None:
    op.drop_column("account", "is_manager")
