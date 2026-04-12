"""expense_involved_ids_json

Migra Expense.involved_ids da TEXT (JSON string) a colonna JSON nativa PostgreSQL.
I valori esistenti sono già JSON-serializzati, quindi USING cast è sufficiente.

Revision ID: h6i7j8k9l0m1
Revises: g5h6i7j8k9l0
Create Date: 2026-04-12
"""
from alembic import op
import sqlalchemy as sa

revision = 'h6i7j8k9l0m1'
down_revision = 'g5h6i7j8k9l0'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('expense') as batch_op:
        batch_op.alter_column(
            'involved_ids',
            existing_type=sa.Text(),
            type_=sa.JSON(),
            existing_nullable=True,
            postgresql_using='involved_ids::json',
        )


def downgrade():
    with op.batch_alter_table('expense') as batch_op:
        batch_op.alter_column(
            'involved_ids',
            existing_type=sa.JSON(),
            type_=sa.Text(),
            existing_nullable=True,
        )
