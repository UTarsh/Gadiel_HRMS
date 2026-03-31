"""add_github_coding_profile_to_profiles

Revision ID: c3f8a12d5e01
Revises: b7f4a91c2e83
Create Date: 2026-03-28 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'c3f8a12d5e01'
down_revision: Union[str, None] = 'b7f4a91c2e83'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'employee_profiles',
        sa.Column('github_url', sa.String(length=300), nullable=True),
    )
    op.add_column(
        'employee_profiles',
        sa.Column('coding_profile_url', sa.String(length=300), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('employee_profiles', 'coding_profile_url')
    op.drop_column('employee_profiles', 'github_url')
