"""add_fk_indices

Aggiunge indici sulle FK calde per migliorare le query più frequenti:
- participant.trip_id, participant.account_id
- vote.proposal_id, vote.user_id
- expense.trip_id, expense.payer_id
- itineraryitem.trip_id

Revision ID: g5h6i7j8k9l0
Revises: f4a5b6c7d8e9
Create Date: 2026-04-12
"""
from alembic import op

revision = 'g5h6i7j8k9l0'
down_revision = 'f4a5b6c7d8e9'
branch_labels = None
depends_on = None


def upgrade():
    op.create_index('ix_participant_trip_id',    'participant',    ['trip_id'])
    op.create_index('ix_participant_account_id', 'participant',    ['account_id'])
    op.create_index('ix_vote_proposal_id',       'vote',          ['proposal_id'])
    op.create_index('ix_vote_user_id',           'vote',          ['user_id'])
    op.create_index('ix_expense_trip_id',        'expense',       ['trip_id'])
    op.create_index('ix_expense_payer_id',       'expense',       ['payer_id'])
    op.create_index('ix_itineraryitem_trip_id',  'itineraryitem', ['trip_id'])


def downgrade():
    op.drop_index('ix_participant_trip_id',    table_name='participant')
    op.drop_index('ix_participant_account_id', table_name='participant')
    op.drop_index('ix_vote_proposal_id',       table_name='vote')
    op.drop_index('ix_vote_user_id',           table_name='vote')
    op.drop_index('ix_expense_trip_id',        table_name='expense')
    op.drop_index('ix_expense_payer_id',       table_name='expense')
    op.drop_index('ix_itineraryitem_trip_id',  table_name='itineraryitem')
