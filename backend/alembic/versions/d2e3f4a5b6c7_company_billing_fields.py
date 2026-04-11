"""company_billing_fields

Revision ID: d2e3f4a5b6c7
Revises: c1d2e3f4a5b6
Create Date: 2026-04-11 00:00:00.000000

Aggiunge a Company:
- vat_number (P.IVA per fatturazione B2B)
- billing_email
- billing_address
- stripe_customer_id
- onboarded_at
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'd2e3f4a5b6c7'
down_revision: Union[str, None] = 'c1d2e3f4a5b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('company', sa.Column('vat_number', sa.String(), nullable=True))
    op.add_column('company', sa.Column('billing_email', sa.String(), nullable=True))
    op.add_column('company', sa.Column('billing_address', sa.String(), nullable=True))
    op.add_column('company', sa.Column('stripe_customer_id', sa.String(), nullable=True))
    op.add_column('company', sa.Column('onboarded_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column('company', 'onboarded_at')
    op.drop_column('company', 'stripe_customer_id')
    op.drop_column('company', 'billing_address')
    op.drop_column('company', 'billing_email')
    op.drop_column('company', 'vat_number')
