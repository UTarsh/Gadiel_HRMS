"""add_custom_title_to_profiles

Revision ID: d9e2b45f1a07
Revises: c3f8a12d5e01
Create Date: 2026-03-28 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'd9e2b45f1a07'
down_revision: Union[str, None] = 'c3f8a12d5e01'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'employee_profiles',
        sa.Column('custom_title', sa.String(length=200), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('employee_profiles', 'custom_title')
