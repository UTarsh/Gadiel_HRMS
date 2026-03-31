import datetime
from typing import Optional, Any, List
from pydantic import BaseModel


class ProfileUpdate(BaseModel):
    """Fields the employee can update in their own profile."""
    custom_title: Optional[str] = None
    bio: Optional[str] = None
    birthday: Optional[datetime.date] = None
    birthplace: Optional[str] = None
    guardian_name: Optional[str] = None
    phone: Optional[str] = None
    blood_group: Optional[str] = None
    gender: Optional[str] = None
    marital_status: Optional[str] = None
    education: Optional[str] = None
    skills: Optional[List[str]] = None
    interests: Optional[List[str]] = None
    certifications: Optional[List[Any]] = None
    badges: Optional[List[Any]] = None
    assets: Optional[List[Any]] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    coding_profile_url: Optional[str] = None


class ProfileOut(BaseModel):
    avatar_url: Optional[str] = None
    custom_title: Optional[str] = None
    bio: Optional[str] = None
    birthday: Optional[datetime.date] = None
    birthplace: Optional[str] = None
    guardian_name: Optional[str] = None
    phone: Optional[str] = None
    blood_group: Optional[str] = None
    gender: Optional[str] = None
    marital_status: Optional[str] = None
    education: Optional[str] = None
    skills: Optional[List[str]] = None
    interests: Optional[List[str]] = None
    certifications: Optional[List[Any]] = None
    badges: Optional[List[Any]] = None
    assets: Optional[List[Any]] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    coding_profile_url: Optional[str] = None

    model_config = {"from_attributes": True}
