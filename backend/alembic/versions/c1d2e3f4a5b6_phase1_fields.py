"""phase1_fields

Revision ID: c1d2e3f4a5b6
Revises: 730eaedc323c
Create Date: 2026-04-07 00:00:00.000000

Aggiunge:
- Trip: approved_by, approval_requested_at, rejection_reason
- Company: plan, plan_expires_at, max_active_users, max_trips_per_month, max_ai_calls_per_day
- Nuova tabella: notification
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


revision: str = 'c1d2e3f4a5b6'
down_revision: Union[str, Sequence[str], None] = '730eaedc323c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Trip: campi approvazione ---
    op.add_column('trip', sa.Column('approved_by', sa.Integer(), nullable=True))
    op.add_column('trip', sa.Column('approval_requested_at', sa.DateTime(), nullable=True))
    op.add_column('trip', sa.Column('rejection_reason', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.create_foreign_key('fk_trip_approved_by_account', 'trip', 'account', ['approved_by'], ['id'])

    # --- Company: piano e limiti ---
    op.add_column('company', sa.Column('plan', sqlmodel.sql.sqltypes.AutoString(), nullable=False, server_default='starter'))
    op.add_column('company', sa.Column('plan_expires_at', sa.DateTime(), nullable=True))
    op.add_column('company', sa.Column('max_active_users', sa.Integer(), nullable=False, server_default='30'))
    op.add_column('company', sa.Column('max_trips_per_month', sa.Integer(), nullable=False, server_default='15'))
    op.add_column('company', sa.Column('max_ai_calls_per_day', sa.Integer(), nullable=False, server_default='200'))

    # --- Tabella notification ---
    op.create_table(
        'notification',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('account_id', sa.Integer(), nullable=False),
        sa.Column('type', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('title', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('message', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('trip_id', sa.Integer(), nullable=True),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['account_id'], ['account.id']),
        sa.ForeignKeyConstraint(['trip_id'], ['trip.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_notification_account_id', 'notification', ['account_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_notification_account_id', table_name='notification')
    op.drop_table('notification')

    op.drop_column('company', 'max_ai_calls_per_day')
    op.drop_column('company', 'max_trips_per_month')
    op.drop_column('company', 'max_active_users')
    op.drop_column('company', 'plan_expires_at')
    op.drop_column('company', 'plan')

    op.drop_constraint('fk_trip_approved_by_account', 'trip', type_='foreignkey')
    op.drop_column('trip', 'rejection_reason')
    op.drop_column('trip', 'approval_requested_at')
    op.drop_column('trip', 'approved_by')
