"""ai_calls_monthly

Revision ID: j8k9l0m1n2o3
Revises: i7j8k9l0m1n2
Create Date: 2026-05-17 00:00:00.000000

Refactor del rate limit AI per allinearlo al pricing B2B:
- Company.max_ai_calls_per_day -> Company.max_ai_calls_per_month
- Account: aggiunti monthly_ai_usage e last_monthly_reset per tracciamento mensile B2B
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'j8k9l0m1n2o3'
down_revision: Union[str, Sequence[str], None] = 'i7j8k9l0m1n2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        'company',
        'max_ai_calls_per_day',
        new_column_name='max_ai_calls_per_month',
    )
    op.add_column(
        'account',
        sa.Column('monthly_ai_usage', sa.Integer(), nullable=False, server_default='0'),
    )
    op.add_column(
        'account',
        sa.Column('last_monthly_reset', sa.String(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('account', 'last_monthly_reset')
    op.drop_column('account', 'monthly_ai_usage')
    op.alter_column(
        'company',
        'max_ai_calls_per_month',
        new_column_name='max_ai_calls_per_day',
    )
