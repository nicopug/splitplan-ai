"""company_pending_manager

Revision ID: k9l0m1n2o3p4
Revises: j8k9l0m1n2o3
Create Date: 2026-05-27 00:00:00.000000

Onboarding sales-led B2B: aggiunge Company.pending_manager_email.
Permette all'admin di approvare un'azienda anche quando il referente
non ha ancora un account. Alla sua registrazione viene promosso a manager.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'k9l0m1n2o3p4'
down_revision: Union[str, Sequence[str], None] = 'j8k9l0m1n2o3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'company',
        sa.Column('pending_manager_email', sa.String(), nullable=True),
    )
    op.create_index(
        'ix_company_pending_manager_email',
        'company',
        ['pending_manager_email'],
    )


def downgrade() -> None:
    op.drop_index('ix_company_pending_manager_email', table_name='company')
    op.drop_column('company', 'pending_manager_email')
