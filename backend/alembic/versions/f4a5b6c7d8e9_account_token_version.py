"""account token_version for logout-all

Revision ID: f4a5b6c7d8e9
Revises: e3f4a5b6c7d8
Create Date: 2026-04-12
"""
from alembic import op
import sqlalchemy as sa

revision = 'f4a5b6c7d8e9'
down_revision = 'e3f4a5b6c7d8'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'account',
        sa.Column('token_version', sa.Integer(), nullable=False, server_default='0'),
    )


def downgrade():
    op.drop_column('account', 'token_version')
