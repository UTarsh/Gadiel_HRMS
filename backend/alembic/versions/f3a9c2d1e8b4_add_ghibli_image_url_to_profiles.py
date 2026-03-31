"""add ghibli_image_url to employee_profiles

Revision ID: f3a9c2d1e8b4
Revises: e4e1d66d8cea
Create Date: 2026-03-28 12:00:00.000000
"""
from typing import Union
from alembic import op
import sqlalchemy as sa

revision: str = 'f3a9c2d1e8b4'
down_revision: Union[str, None] = 'd9e2b45f1a07'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'employee_profiles',
        sa.Column('ghibli_image_url', sa.String(500), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('employee_profiles', 'ghibli_image_url')
