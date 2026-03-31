"""add_guardian_name_to_employee_profiles

Revision ID: 775650e42ec8
Revises: 16a84df3369c
Create Date: 2026-03-30 12:54:40.493960

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '775650e42ec8'
down_revision: Union[str, None] = '16a84df3369c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('employee_profiles', sa.Column('guardian_name', sa.String(length=200), nullable=True))


def downgrade() -> None:
    op.drop_column('employee_profiles', 'guardian_name')
