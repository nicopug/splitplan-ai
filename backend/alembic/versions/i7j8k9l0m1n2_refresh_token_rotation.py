"""refresh_token_rotation

Crea la tabella `refreshtoken` per supportare rotation + revocation
dei refresh token JWT (fix P0-4 security audit).

Revision ID: i7j8k9l0m1n2
Revises: h6i7j8k9l0m1
Create Date: 2026-04-19
"""
from alembic import op
import sqlalchemy as sa

revision = 'i7j8k9l0m1n2'
down_revision = 'h6i7j8k9l0m1'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'refreshtoken',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('jti', sa.String(), nullable=False),
        sa.Column('account_id', sa.Integer(), nullable=False),
        sa.Column('issued_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['account_id'], ['account.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_refreshtoken_jti', 'refreshtoken', ['jti'], unique=True)
    op.create_index('ix_refreshtoken_account_id', 'refreshtoken', ['account_id'])


def downgrade():
    op.drop_index('ix_refreshtoken_account_id', table_name='refreshtoken')
    op.drop_index('ix_refreshtoken_jti', table_name='refreshtoken')
    op.drop_table('refreshtoken')
