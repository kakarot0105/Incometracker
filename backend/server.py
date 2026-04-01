from fastapi import FastAPI, APIRouter, HTTPException, Cookie, Response, Request
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ============ Models ============

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime

class UserSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime

class SessionCreate(BaseModel):
    session_id: str

class Job(BaseModel):
    model_config = ConfigDict(extra="ignore")
    job_id: str
    user_id: str
    job_name: str
    hourly_rate: float
    is_active: bool = True
    created_at: datetime

class JobCreate(BaseModel):
    job_name: str
    hourly_rate: float

class JobUpdate(BaseModel):
    job_name: Optional[str] = None
    hourly_rate: Optional[float] = None
    is_active: Optional[bool] = None

class HoursLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    log_id: str
    user_id: str
    job_id: str
    job_name: str
    hourly_rate: float
    date: str
    hours_worked: float
    calculated_pay: float
    created_at: datetime

class HoursLogCreate(BaseModel):
    job_id: str
    date: str
    hours_worked: float

class Payment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    payment_id: str
    user_id: str
    job_id: Optional[str] = None
    job_name: Optional[str] = None
    amount: float
    date: str
    notes: Optional[str] = None
    created_at: datetime

class PaymentCreate(BaseModel):
    job_id: Optional[str] = None
    amount: float
    date: str
    notes: Optional[str] = None

class DashboardSummary(BaseModel):
    total_earnings: float
    total_payments: float
    balance: float
    total_hours: float
    active_jobs: int
    job_breakdown: List[dict]

# ============ Auth Helper ============

async def get_current_user(request: Request, session_token: Optional[str] = Cookie(None)) -> User:
    """Get current user from session_token cookie or Authorization header"""
    token = session_token
    
    # Fallback to Authorization header if cookie not present
    if not token:
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Find session
    session_doc = await db.user_sessions.find_one(
        {"session_token": token},
        {"_id": 0}
    )
    
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check expiry
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    # Get user
    user_doc = await db.users.find_one(
        {"user_id": session_doc["user_id"]},
        {"_id": 0}
    )
    
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Convert datetime strings
    if isinstance(user_doc['created_at'], str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    return User(**user_doc)

# ============ Auth Routes ============

@api_router.post("/auth/session")
async def create_session(session_create: SessionCreate, response: Response):
    """Exchange session_id for session_token"""
    try:
        # Call Emergent Auth API
        async with httpx.AsyncClient() as client:
            emergent_response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_create.session_id},
                timeout=10.0
            )
            
            if emergent_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session_id")
            
            data = emergent_response.json()
        
        # Generate our own user_id and session_token
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        session_token = f"session_{uuid.uuid4().hex}"
        
        # Check if user exists
        existing_user = await db.users.find_one(
            {"email": data["email"]},
            {"_id": 0}
        )
        
        if existing_user:
            user_id = existing_user["user_id"]
            # Update user info
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {
                    "name": data["name"],
                    "picture": data.get("picture")
                }}
            )
        else:
            # Create new user
            user_doc = {
                "user_id": user_id,
                "email": data["email"],
                "name": data["name"],
                "picture": data.get("picture"),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(user_doc)
        
        # Create session
        session_doc = {
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.user_sessions.insert_one(session_doc)
        
        # Set httpOnly cookie
        response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True,
            secure=True,
            samesite="none",
            path="/",
            max_age=7 * 24 * 60 * 60
        )
        
        # Return user data
        user_doc = await db.users.find_one(
            {"user_id": user_id},
            {"_id": 0}
        )
        if isinstance(user_doc['created_at'], str):
            user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
        
        return User(**user_doc)
    
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Auth service timeout")
    except Exception as e:
        logging.error(f"Session creation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create session")

@api_router.get("/auth/me", response_model=User)
async def get_me(request: Request, session_token: Optional[str] = Cookie(None)):
    """Get current user"""
    return await get_current_user(request, session_token)

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response, session_token: Optional[str] = Cookie(None)):
    """Logout user"""
    user = await get_current_user(request, session_token)
    
    # Delete all sessions for this user
    await db.user_sessions.delete_many({"user_id": user.user_id})
    
    # Clear cookie
    response.delete_cookie(key="session_token", path="/")
    
    return {"message": "Logged out successfully"}

# ============ Job Routes ============

@api_router.get("/jobs", response_model=List[Job])
async def get_jobs(request: Request, session_token: Optional[str] = Cookie(None)):
    """Get all jobs for current user"""
    user = await get_current_user(request, session_token)
    
    jobs = await db.jobs.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    for job in jobs:
        if isinstance(job['created_at'], str):
            job['created_at'] = datetime.fromisoformat(job['created_at'])
    
    return jobs

@api_router.post("/jobs", response_model=Job)
async def create_job(job_create: JobCreate, request: Request, session_token: Optional[str] = Cookie(None)):
    """Create a new job"""
    user = await get_current_user(request, session_token)
    
    job_doc = {
        "job_id": f"job_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "job_name": job_create.job_name,
        "hourly_rate": job_create.hourly_rate,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.jobs.insert_one(job_doc)
    job_doc['created_at'] = datetime.fromisoformat(job_doc['created_at'])
    
    return Job(**job_doc)

@api_router.put("/jobs/{job_id}", response_model=Job)
async def update_job(job_id: str, job_update: JobUpdate, request: Request, session_token: Optional[str] = Cookie(None)):
    """Update a job"""
    user = await get_current_user(request, session_token)
    
    # Check job belongs to user
    job = await db.jobs.find_one(
        {"job_id": job_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Update fields
    update_data = job_update.model_dump(exclude_unset=True)
    if update_data:
        await db.jobs.update_one(
            {"job_id": job_id},
            {"$set": update_data}
        )
    
    # Return updated job
    updated_job = await db.jobs.find_one(
        {"job_id": job_id},
        {"_id": 0}
    )
    
    if isinstance(updated_job['created_at'], str):
        updated_job['created_at'] = datetime.fromisoformat(updated_job['created_at'])
    
    return Job(**updated_job)

@api_router.delete("/jobs/{job_id}")
async def delete_job(job_id: str, request: Request, session_token: Optional[str] = Cookie(None)):
    """Delete a job"""
    user = await get_current_user(request, session_token)
    
    result = await db.jobs.delete_one(
        {"job_id": job_id, "user_id": user.user_id}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return {"message": "Job deleted successfully"}

# ============ Hours Routes ============

@api_router.get("/hours", response_model=List[HoursLog])
async def get_hours(request: Request, session_token: Optional[str] = Cookie(None)):
    """Get all hours logs for current user"""
    user = await get_current_user(request, session_token)
    
    logs = await db.hours_logs.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("date", -1).to_list(1000)
    
    for log in logs:
        if isinstance(log['created_at'], str):
            log['created_at'] = datetime.fromisoformat(log['created_at'])
    
    return logs

@api_router.post("/hours", response_model=HoursLog)
async def create_hours_log(hours_create: HoursLogCreate, request: Request, session_token: Optional[str] = Cookie(None)):
    """Create a new hours log"""
    user = await get_current_user(request, session_token)
    
    # Get job details
    job = await db.jobs.find_one(
        {"job_id": hours_create.job_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    calculated_pay = hours_create.hours_worked * job["hourly_rate"]
    
    log_doc = {
        "log_id": f"log_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "job_id": hours_create.job_id,
        "job_name": job["job_name"],
        "hourly_rate": job["hourly_rate"],
        "date": hours_create.date,
        "hours_worked": hours_create.hours_worked,
        "calculated_pay": calculated_pay,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.hours_logs.insert_one(log_doc)
    log_doc['created_at'] = datetime.fromisoformat(log_doc['created_at'])
    
    return HoursLog(**log_doc)

@api_router.delete("/hours/{log_id}")
async def delete_hours_log(log_id: str, request: Request, session_token: Optional[str] = Cookie(None)):
    """Delete a hours log"""
    user = await get_current_user(request, session_token)
    
    result = await db.hours_logs.delete_one(
        {"log_id": log_id, "user_id": user.user_id}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Hours log not found")
    
    return {"message": "Hours log deleted successfully"}

# ============ Payment Routes ============

@api_router.get("/payments", response_model=List[Payment])
async def get_payments(request: Request, session_token: Optional[str] = Cookie(None)):
    """Get all payments for current user"""
    user = await get_current_user(request, session_token)
    
    payments = await db.payments.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("date", -1).to_list(1000)
    
    for payment in payments:
        if isinstance(payment['created_at'], str):
            payment['created_at'] = datetime.fromisoformat(payment['created_at'])
    
    return payments

@api_router.post("/payments", response_model=Payment)
async def create_payment(payment_create: PaymentCreate, request: Request, session_token: Optional[str] = Cookie(None)):
    """Create a new payment"""
    user = await get_current_user(request, session_token)
    
    job_name = None
    if payment_create.job_id:
        # Get job details
        job = await db.jobs.find_one(
            {"job_id": payment_create.job_id, "user_id": user.user_id},
            {"_id": 0}
        )
        if job:
            job_name = job["job_name"]
    
    payment_doc = {
        "payment_id": f"payment_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "job_id": payment_create.job_id,
        "job_name": job_name,
        "amount": payment_create.amount,
        "date": payment_create.date,
        "notes": payment_create.notes,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.payments.insert_one(payment_doc)
    payment_doc['created_at'] = datetime.fromisoformat(payment_doc['created_at'])
    
    return Payment(**payment_doc)

@api_router.delete("/payments/{payment_id}")
async def delete_payment(payment_id: str, request: Request, session_token: Optional[str] = Cookie(None)):
    """Delete a payment"""
    user = await get_current_user(request, session_token)
    
    result = await db.payments.delete_one(
        {"payment_id": payment_id, "user_id": user.user_id}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    return {"message": "Payment deleted successfully"}

# ============ Dashboard Route ============

@api_router.get("/dashboard/summary", response_model=DashboardSummary)
async def get_dashboard_summary(request: Request, session_token: Optional[str] = Cookie(None)):
    """Get dashboard summary"""
    user = await get_current_user(request, session_token)
    
    # Get all hours logs
    hours_logs = await db.hours_logs.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).to_list(10000)
    
    # Get all payments
    payments = await db.payments.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).to_list(10000)
    
    # Get active jobs count
    active_jobs = await db.jobs.count_documents(
        {"user_id": user.user_id, "is_active": True}
    )
    
    # Calculate totals
    total_earnings = sum(log["calculated_pay"] for log in hours_logs)
    total_payments = sum(payment["amount"] for payment in payments)
    total_hours = sum(log["hours_worked"] for log in hours_logs)
    balance = total_earnings - total_payments
    
    # Job breakdown
    job_earnings = {}
    for log in hours_logs:
        job_id = log["job_id"]
        if job_id not in job_earnings:
            job_earnings[job_id] = {
                "job_id": job_id,
                "job_name": log["job_name"],
                "earnings": 0,
                "hours": 0
            }
        job_earnings[job_id]["earnings"] += log["calculated_pay"]
        job_earnings[job_id]["hours"] += log["hours_worked"]
    
    job_breakdown = sorted(
        job_earnings.values(),
        key=lambda x: x["earnings"],
        reverse=True
    )
    
    return DashboardSummary(
        total_earnings=total_earnings,
        total_payments=total_payments,
        balance=balance,
        total_hours=total_hours,
        active_jobs=active_jobs,
        job_breakdown=job_breakdown
    )

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
