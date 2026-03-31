from datetime import datetime
from typing import Optional
from sqlalchemy import (
    String, Boolean, DateTime, Text, ForeignKey,
    Integer, Enum as SAEnum, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.base import TimestampMixin, gen_uuid
import enum


class DocumentType(str, enum.Enum):
    offer_letter = "offer_letter"
    joining_letter = "joining_letter"
    appointment_letter = "appointment_letter"
    increment_letter = "increment_letter"
    payslip = "payslip"
    id_proof = "id_proof"              # Aadhaar, PAN scan
    address_proof = "address_proof"
    education_certificate = "education_certificate"
    experience_letter = "experience_letter"
    resignation_letter = "resignation_letter"
    relieving_letter = "relieving_letter"
    noc = "noc"
    other = "other"


# ─────────────────────────────────────────────────────────────────────────────
# Document (employee file store — offer letters, ID proofs, payslips, etc.)
# ─────────────────────────────────────────────────────────────────────────────
class Document(Base, TimestampMixin):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    employee_id: Mapped[str] = mapped_column(String(36), ForeignKey("employees.id"), nullable=False)

    document_type: Mapped[DocumentType] = mapped_column(SAEnum(DocumentType), nullable=False)
    name: Mapped[str] = mapped_column(String(300), nullable=False)   # display name, e.g. "Offer Letter - March 2025"

    # Storage — file_url points to cloud bucket or local /media path
    file_url: Mapped[str] = mapped_column(String(1000), nullable=False)
    file_size_bytes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    mime_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # e.g. application/pdf

    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Upload audit
    uploaded_by_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("employees.id"), nullable=True)

    # HR Verification
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    verified_by_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("employees.id"), nullable=True)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    employee: Mapped["Employee"] = relationship("Employee", foreign_keys=[employee_id])  # type: ignore[name-defined]
    uploaded_by: Mapped[Optional["Employee"]] = relationship("Employee", foreign_keys=[uploaded_by_id])  # type: ignore[name-defined]
    verified_by: Mapped[Optional["Employee"]] = relationship("Employee", foreign_keys=[verified_by_id])  # type: ignore[name-defined]
