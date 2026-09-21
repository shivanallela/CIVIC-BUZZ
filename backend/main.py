"""
Civic Catalyst — FastAPI Backend
AI-assisted Citizen Civic Issue Reporting Platform
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from routers import demo, complaints
from models.schemas import HealthResponse

load_dotenv()

# ── App ──────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Civic Catalyst Citizen API",
    description="AI-assisted civic issue reporting & citizen engagement platform.",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# ── CORS ─────────────────────────────────────────────────────────────────────

ALLOWED_ORIGINS_ENV = os.getenv("ALLOWED_ORIGINS", "")
if ALLOWED_ORIGINS_ENV:
    origins = [o.strip() for o in ALLOWED_ORIGINS_ENV.split(",") if o.strip()]
else:
    origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if "*" in origins else origins,
    allow_origin_regex=r"https://.*\.vercel\.app" if "*" not in origins else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────────────

app.include_router(demo.router)
app.include_router(complaints.router)

# ── Core endpoints ───────────────────────────────────────────────────────────


@app.get("/health", response_model=HealthResponse, tags=["system"])
async def health_check():
    """Service health check endpoint."""
    return HealthResponse(
        status="ok",
        service="Civic Catalyst Citizen API",
        version="0.1.0",
    )


@app.get("/", tags=["system"])
async def root():
    return {
        "message": "Civic Catalyst Citizen API is running.",
        "docs": "/api/docs",
        "version": "0.1.0",
    }
