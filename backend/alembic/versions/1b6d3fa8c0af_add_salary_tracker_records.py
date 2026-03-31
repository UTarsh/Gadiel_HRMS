"""add_salary_tracker_records

Revision ID: 1b6d3fa8c0af
Revises: 8f1c2a7b9d41
Create Date: 2026-03-29 03:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "1b6d3fa8c0af"
down_revision: Union[str, None] = "8f1c2a7b9d41"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "salary_tracker_records",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("employee_id", sa.String(length=36), nullable=False),
        sa.Column("month", sa.Integer(), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("record_date", sa.Date(), nullable=False),
        sa.Column("title", sa.String(length=220), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("record_type", sa.Enum("expense", "income", "savings", name="salaryrecordtype"), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_salary_tracker_records_employee", "salary_tracker_records", ["employee_id"], unique=False)
    op.create_index("ix_salary_tracker_records_month_year", "salary_tracker_records", ["month", "year"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_salary_tracker_records_month_year", table_name="salary_tracker_records")
    op.drop_index("ix_salary_tracker_records_employee", table_name="salary_tracker_records")
    op.drop_table("salary_tracker_records")
