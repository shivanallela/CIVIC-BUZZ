from fastapi import APIRouter, HTTPException
from models.schemas import (
    DemoVillager,
    DemoPanchayat,
    DemoCitizen,
    DemoEmployee,
    DemoAdmin,
    SessionResponse,
    UserRole,
    DemoLoginRequest,
)

router = APIRouter(prefix="/api/demo", tags=["demo"])

# ── Demo User Constants ──────────────────────────────────────────────────────

DEMO_CITIZEN = DemoCitizen(
    id="demo-villager-001",
    name="Ramesh Kumar",
    email="citizen@civic.gov.in",
    role=UserRole.citizen,
    village="Shyampet",
)

DEMO_EMPLOYEE = DemoEmployee(
    id="EMP-001",
    name="Ravi Kumar",
    email="employee@civic.gov.in",
    role=UserRole.employee,
    department="Roads & Infrastructure Department",
    role_title="Senior Field Engineer",
)

DEMO_ADMIN = DemoAdmin(
    id="ADM-001",
    name="Rajesh Sharma",
    email="admin@civic.gov.in",
    role=UserRole.admin,
    jurisdiction="Shyampet Gram Panchayat (Wards 1-6)",
)

DEMO_ACCOUNTS_MAP = {
    "citizen@civic.gov.in": {
        "password": "citizen123",
        "role": UserRole.citizen,
        "redirect_url": "/citizen/dashboard",
        "user": DEMO_CITIZEN.model_dump(),
    },
    "9876543210": {
        "password": "citizen123",
        "role": UserRole.citizen,
        "redirect_url": "/citizen/dashboard",
        "user": DEMO_CITIZEN.model_dump(),
    },
    "employee@civic.gov.in": {
        "password": "emp123",
        "role": UserRole.employee,
        "redirect_url": "/employee/dashboard",
        "user": DEMO_EMPLOYEE.model_dump(),
    },
    "ravi.kumar@civic.gov.in": {
        "password": "emp123",
        "role": UserRole.employee,
        "redirect_url": "/employee/dashboard",
        "user": DEMO_EMPLOYEE.model_dump(),
    },
    "emp-001": {
        "password": "emp123",
        "role": UserRole.employee,
        "redirect_url": "/employee/dashboard",
        "user": DEMO_EMPLOYEE.model_dump(),
    },
    "admin@civic.gov.in": {
        "password": "admin123",
        "role": UserRole.admin,
        "redirect_url": "/admin/dashboard",
        "user": DEMO_ADMIN.model_dump(),
    },
    "adm-001": {
        "password": "admin123",
        "role": UserRole.admin,
        "redirect_url": "/admin/dashboard",
        "user": DEMO_ADMIN.model_dump(),
    },
}

# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/login", response_model=SessionResponse)
async def demo_login(req: DemoLoginRequest):
    """
    Server-side role-validated authentication for Demo accounts.
    Enforces that selected roles match validated server credentials.
    """
    clean_id = req.identifier.strip().lower()
    clean_pass = req.password.strip()

    account = DEMO_ACCOUNTS_MAP.get(clean_id)
    if not account:
        raise HTTPException(
            status_code=401,
            detail="Account not found. For demo use: citizen@civic.gov.in / employee@civic.gov.in / admin@civic.gov.in",
        )

    if account["password"] != clean_pass:
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials. Check demo password.",
        )

    # If frontend requested a specific role, verify compatibility
    if req.role:
        req_role = req.role.lower()
        acc_role = account["role"].value.lower()
        if req_role in ["villager", "citizen"] and acc_role in ["villager", "citizen"]:
            pass  # compatible
        elif req_role != acc_role:
            raise HTTPException(
                status_code=403,
                detail=f"Role mismatch: This account belongs to the '{acc_role.upper()}' portal.",
            )

    return SessionResponse(
        success=True,
        role=account["role"],
        data=account["user"],
        message=f"Authenticated as {account['role'].value.upper()}",
    )


@router.get("/citizen", response_model=SessionResponse)
async def get_demo_citizen():
    """Return demo citizen session data."""
    return SessionResponse(
        success=True,
        role=UserRole.citizen,
        data=DEMO_CITIZEN.model_dump(),
    )


@router.get("/employee", response_model=SessionResponse)
async def get_demo_employee():
    """Return demo field employee session data."""
    return SessionResponse(
        success=True,
        role=UserRole.employee,
        data=DEMO_EMPLOYEE.model_dump(),
    )


@router.get("/admin", response_model=SessionResponse)
async def get_demo_admin():
    """Return demo admin session data."""
    return SessionResponse(
        success=True,
        role=UserRole.admin,
        data=DEMO_ADMIN.model_dump(),
    )


@router.get("/villager", response_model=SessionResponse)
async def get_demo_villager():
    """Backwards-compatible villager alias."""
    return SessionResponse(
        success=True,
        role=UserRole.villager,
        data=DEMO_CITIZEN.model_dump(),
    )

