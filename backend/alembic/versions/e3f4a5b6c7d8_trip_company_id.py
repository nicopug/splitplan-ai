"""trip_company_id

Revision ID: e3f4a5b6c7d8
Revises: d2e3f4a5b6c7
Create Date: 2026-04-11 00:00:00.000000

Aggiunge a Trip:
- company_id (FK → company.id, index) per query B2B dirette senza passare per Account→Participant
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'e3f4a5b6c7d8'
down_revision: Union[str, None] = 'd2e3f4a5b6c7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('trip', sa.Column('company_id', sa.Integer(), nullable=True))
    op.create_index('ix_trip_company_id', 'trip', ['company_id'])
    op.create_foreign_key('fk_trip_company_id', 'trip', 'company', ['company_id'], ['id'])


def downgrade() -> None:
    op.drop_constraint('fk_trip_company_id', 'trip', type_='foreignkey')
    op.drop_index('ix_trip_company_id', table_name='trip')
    op.drop_column('trip', 'company_id')
