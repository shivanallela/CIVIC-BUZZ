from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from enum import Enum


class UserRole(str, Enum):
    villager = "villager"
    citizen = "citizen"
    employee = "employee"
    admin = "admin"
    panchayat_official = "panchayat_official"


class DemoCitizen(BaseModel):
    id: str
    name: str
    email: str
    role: UserRole = UserRole.citizen
    village: str


class DemoEmployee(BaseModel):
    id: str
    name: str
    email: str
    role: UserRole = UserRole.employee
    department: str
    role_title: str


class DemoAdmin(BaseModel):
    id: str
    name: str
    email: str
    role: UserRole = UserRole.admin
    jurisdiction: str


class DemoVillager(BaseModel):
    id: str
    name: str
    role: UserRole
    village: str


class DemoPanchayat(BaseModel):
    id: str
    name: str
    village: str
    role: UserRole


class SessionResponse(BaseModel):
    success: bool
    role: UserRole
    data: dict
    message: Optional[str] = None


class DemoLoginRequest(BaseModel):
    identifier: str
    password: str
    role: Optional[str] = None


class AssignComplaintRequest(BaseModel):
    employee_id: str
    department: Optional[str] = None
    admin_notes: Optional[str] = None
    override_reason: Optional[str] = None
    admin_name: Optional[str] = "Admin Official"


class TaskStatusUpdateRequest(BaseModel):
    employee_id: str
    status: str
    notes: Optional[str] = None
    resolution_image_url: Optional[str] = None


class VerifyResolutionRequest(BaseModel):
    approved: bool
    admin_notes: Optional[str] = None
    admin_name: Optional[str] = "Admin Official"


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str

