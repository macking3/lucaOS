from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from typing import Optional, Dict, Any
from tools.osint.osint_service import identity_service

router = APIRouter(prefix="/api/osint", tags=["osint"])

class IdentitySearchRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    method: str = "quick" # quick, deep

@router.post("/identity")
async def search_identity(request: IdentitySearchRequest):
    """
    Search for identity across social networks.
    """
    results = {}
    
    # 1. Username Search
    if request.username:
        print(f"[OSINT] Searching username: {request.username} (Method: {request.method})")
        username_results = await identity_service.search_username(request.username, request.method)
        results["username_scan"] = username_results

    # 2. Email Search
    if request.email:
         print(f"[OSINT] Searching email: {request.email}")
         email_results = await identity_service.check_email(request.email)
         results["email_scan"] = email_results
         
    return {"status": "success", "data": results}

@router.get("/status")
async def osint_status():
    return {"status": "active", "tools": ["blackbird", "maigret", "holehe", "ghunt"]}
