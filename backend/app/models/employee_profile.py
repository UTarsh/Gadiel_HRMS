import datetime
from typing import Optional, Any
from sqlalchemy import String, Text, Date, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import gen_uuid, TimestampMixin


class EmployeeProfile(Base, TimestampMixin):
    """
    User-editable extended profile — everything the employee fills in themselves.
    Only pre-populated fields are read from the employees table (name, email, DOJ).
    """
    __tablename__ = "employee_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    employee_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("employees.id", ondelete="CASCADE"),
        unique=True, nullable=False
    )

    # Photos
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    ghibli_image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Custom display title (user-editable override for their designation)
    custom_title: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # Bio
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Personal tidbits
    birthday: Mapped[Optional[datetime.date]] = mapped_column(Date, nullable=True)
    birthplace: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    guardian_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # Contact / identity
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    blood_group: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    gender: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    marital_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    education: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Flexible JSON arrays — user builds these up over time
    skills: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)           # ["React", "Python"]
    interests: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)        # ["Gaming", "Music"]
    certifications: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)   # [{name, issuer, earned}]
    badges: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)           # [{name, desc, icon, earned}]
    assets: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)           # [{nickname, model, code, status, icon}]

    # Social
    linkedin_url: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    twitter_url: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)  # kept for compat, not shown in UI
    github_url: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    coding_profile_url: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)

    # Relationship back to employee
    employee: Mapped["Employee"] = relationship("Employee", back_populates="profile")
