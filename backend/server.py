from fastapi import FastAPI, APIRouter, HTTPException, Cookie, Response, Request
from fastapi.responses import JSONResponse, StreamingResponse
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
from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_RIGHT, TA_CENTER

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

@api_router.post("/auth/google")
async def google_auth(code_data: dict, response: Response):
    """Exchange Google OAuth code for session_token"""
    try:
        code = code_data.get("code")
        redirect_uri = code_data.get("redirect_uri")

        if not code:
            raise HTTPException(status_code=400, detail="Missing authorization code")

        google_client_id = os.getenv("GOOGLE_CLIENT_ID")
        google_client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
        google_redirect_uri = os.getenv("GOOGLE_REDIRECT_URI") or redirect_uri

        if not google_client_id or not google_client_secret:
            raise HTTPException(status_code=500, detail="Google OAuth not configured")

        # Exchange code for access token
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": google_client_id,
                    "client_secret": google_client_secret,
                    "redirect_uri": google_redirect_uri,
                    "grant_type": "authorization_code"
                },
                timeout=10.0
            )

            if token_response.status_code != 200:
                logger.error(f"Google token exchange failed: {token_response.text}")
                raise HTTPException(status_code=401, detail="Invalid authorization code")

            token_data = token_response.json()
            access_token = token_data.get("access_token")

            # Get user info
            user_response = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10.0
            )

            if user_response.status_code != 200:
                logger.error(f"Google userinfo failed: {user_response.text}")
                raise HTTPException(status_code=401, detail="Failed to get user info")

            data = user_response.json()
            logger.info(f"Google user email: {data.get('email')}")

        # Generate user_id and session_token
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        session_token = f"session_{uuid.uuid4().hex}"

        # Check if user exists
        existing_user = await db.users.find_one({"email": data["email"]}, {"_id": 0})

        if existing_user:
            user_id = existing_user["user_id"]
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {
                    "name": data.get("name"),
                    "picture": data.get("picture")
                }}
            )
        else:
            user_doc = {
                "user_id": user_id,
                "email": data["email"],
                "name": data.get("name"),
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

        # Set httpOnly cookie (secure in production)
        is_secure = os.getenv("COOKIE_SECURE", "false").lower() == "true"
        response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True,
            secure=is_secure,
            samesite="none" if is_secure else "lax",
            path="/",
            max_age=7 * 24 * 60 * 60
        )

        # Return user data
        user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        if isinstance(user_doc['created_at'], str):
            user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])

        return User(**user_doc)

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Auth service timeout")
    except Exception as e:
        logger.error(f"Google auth error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to authenticate: {str(e)}")

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

# ============ Invoice Generation Route ============

class InvoiceRequest(BaseModel):
    job_id: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    invoice_number: Optional[str] = None
    notes: Optional[str] = None

@api_router.post("/invoices/generate")
async def generate_invoice(
    invoice_req: InvoiceRequest,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Generate a PDF invoice for hours worked"""
    user = await get_current_user(request, session_token)
    
    # Build query for hours logs
    query = {"user_id": user.user_id}
    if invoice_req.job_id:
        query["job_id"] = invoice_req.job_id
    if invoice_req.start_date or invoice_req.end_date:
        date_query = {}
        if invoice_req.start_date:
            date_query["$gte"] = invoice_req.start_date
        if invoice_req.end_date:
            date_query["$lte"] = invoice_req.end_date
        query["date"] = date_query
    
    # Fetch hours logs
    hours_logs = await db.hours_logs.find(query, {"_id": 0}).sort("date", 1).to_list(10000)
    
    if not hours_logs:
        raise HTTPException(status_code=404, detail="No hours logs found for the specified criteria")
    
    # Create PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
    
    # Container for the 'Flowable' objects
    elements = []
    
    # Define styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#344E41'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#344E41'),
        spaceAfter=12
    )
    
    normal_style = styles['Normal']
    
    # Invoice header
    invoice_num = invoice_req.invoice_number or f"INV-{datetime.now().strftime('%Y%m%d')}"
    elements.append(Paragraph(f"INVOICE", title_style))
    elements.append(Spacer(1, 0.2*inch))
    
    # Invoice info
    invoice_data = [
        [Paragraph(f"<b>Invoice Number:</b> {invoice_num}", normal_style)],
        [Paragraph(f"<b>Date:</b> {datetime.now().strftime('%B %d, %Y')}", normal_style)],
        [Paragraph(f"<b>From:</b> {user.name}", normal_style)],
        [Paragraph(f"<b>Email:</b> {user.email}", normal_style)],
    ]
    
    info_table = Table(invoice_data, colWidths=[6*inch])
    info_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 0.3*inch))
    
    # Hours breakdown
    elements.append(Paragraph("Hours Worked", heading_style))
    
    # Prepare table data
    table_data = [['Date', 'Job', 'Hours', 'Rate', 'Amount']]
    total_amount = 0
    
    for log in hours_logs:
        table_data.append([
            datetime.fromisoformat(log['date']).strftime('%m/%d/%Y') if isinstance(log['date'], str) else log['date'].strftime('%m/%d/%Y'),
            log['job_name'],
            str(log['hours_worked']),
            f"${log['hourly_rate']:.2f}",
            f"${log['calculated_pay']:.2f}"
        ])
        total_amount += log['calculated_pay']
    
    # Add total row
    table_data.append(['', '', '', 'TOTAL:', f"${total_amount:.2f}"])
    
    # Create table
    hours_table = Table(table_data, colWidths=[1*inch, 2*inch, 0.8*inch, 0.9*inch, 1*inch])
    hours_table.setStyle(TableStyle([
        # Header row
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#344E41')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        
        # Data rows
        ('FONTNAME', (0, 1), (-1, -2), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -2), 9),
        ('ALIGN', (2, 1), (2, -1), 'CENTER'),
        ('ALIGN', (3, 1), (-1, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -2), 0.5, colors.HexColor('#EAE6DF')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, colors.HexColor('#FDFCFB')]),
        
        # Total row
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, -1), (-1, -1), 11),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#F5F3EE')),
        ('TOPPADDING', (0, -1), (-1, -1), 12),
        ('BOTTOMPADDING', (0, -1), (-1, -1), 12),
        ('LINEABOVE', (0, -1), (-1, -1), 2, colors.HexColor('#344E41')),
    ]))
    elements.append(hours_table)
    
    # Notes section
    if invoice_req.notes:
        elements.append(Spacer(1, 0.3*inch))
        elements.append(Paragraph("Notes", heading_style))
        elements.append(Paragraph(invoice_req.notes, normal_style))
    
    # Build PDF
    doc.build(elements)
    
    # Get PDF data
    pdf_data = buffer.getvalue()
    buffer.close()
    
    # Return as downloadable file
    filename = f"invoice_{invoice_num}.pdf"
    return StreamingResponse(
        BytesIO(pdf_data),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# ============ Earnings Statement Route ============

@api_router.get("/reports/statement")
async def generate_earnings_statement(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Generate a comprehensive earnings statement PDF"""
    user = await get_current_user(request, session_token)
    
    # Fetch all data
    hours_logs = await db.hours_logs.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("date", 1).to_list(10000)
    
    payments = await db.payments.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("date", 1).to_list(10000)
    
    jobs = await db.jobs.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).to_list(1000)
    
    # Calculate totals
    total_earnings = sum(log["calculated_pay"] for log in hours_logs)
    total_payments = sum(payment["amount"] for payment in payments)
    balance = total_earnings - total_payments
    total_hours = sum(log["hours_worked"] for log in hours_logs)
    
    # Job breakdown
    job_earnings = {}
    for log in hours_logs:
        job_id = log["job_id"]
        if job_id not in job_earnings:
            job_earnings[job_id] = {
                "job_name": log["job_name"],
                "hours": 0,
                "earnings": 0,
                "rate": log["hourly_rate"]
            }
        job_earnings[job_id]["hours"] += log["hours_worked"]
        job_earnings[job_id]["earnings"] += log["calculated_pay"]
    
    # Create PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=letter, 
        rightMargin=50, 
        leftMargin=50, 
        topMargin=50, 
        bottomMargin=30
    )
    
    elements = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'Title',
        parent=styles['Heading1'],
        fontSize=28,
        textColor=colors.HexColor('#344E41'),
        spaceAfter=10,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Normal'],
        fontSize=11,
        textColor=colors.HexColor('#5C6B61'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    heading_style = ParagraphStyle(
        'Heading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor('#344E41'),
        spaceAfter=15,
        spaceBefore=20,
        fontName='Helvetica-Bold'
    )
    
    # Header
    elements.append(Paragraph("EARNINGS STATEMENT", title_style))
    elements.append(Paragraph(
        f"Prepared for: {user.name}<br/>{user.email}<br/>Date: {datetime.now().strftime('%B %d, %Y')}", 
        subtitle_style
    ))
    
    # Summary Section
    elements.append(Paragraph("Summary", heading_style))
    
    summary_data = [
        ['Total Hours Worked:', f"{total_hours:.1f} hours"],
        ['Total Earnings:', f"${total_earnings:,.2f}"],
        ['Total Payments Received:', f"${total_payments:,.2f}"],
        ['Balance Owed:', f"${balance:,.2f}"]
    ]
    
    summary_table = Table(summary_data, colWidths=[3*inch, 2*inch])
    summary_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#344E41')),
        ('TEXTCOLOR', (1, 0), (1, -2), colors.HexColor('#1F2937')),
        ('TEXTCOLOR', (1, -1), (1, -1), colors.HexColor('#E07A5F') if balance > 0 else colors.HexColor('#3A5A40')),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('LINEBELOW', (0, -1), (-1, -1), 2, colors.HexColor('#344E41')),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 0.3*inch))
    
    # Earnings by Job
    if job_earnings:
        elements.append(Paragraph("Earnings by Job", heading_style))
        
        job_data = [['Job', 'Hours', 'Rate', 'Total Earnings']]
        for job_id, data in sorted(job_earnings.items(), key=lambda x: x[1]['earnings'], reverse=True):
            job_data.append([
                data['job_name'],
                f"{data['hours']:.1f}",
                f"${data['rate']:.2f}/hr",
                f"${data['earnings']:,.2f}"
            ])
        
        job_table = Table(job_data, colWidths=[2.5*inch, 1*inch, 1.2*inch, 1.3*inch])
        job_table.setStyle(TableStyle([
            # Header
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#344E41')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('TOPPADDING', (0, 0), (-1, 0), 12),
            
            # Data rows
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('ALIGN', (1, 1), (-1, -1), 'RIGHT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#EAE6DF')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#FDFCFB')]),
            ('TOPPADDING', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ]))
        elements.append(job_table)
        elements.append(Spacer(1, 0.3*inch))
    
    # Payment History
    if payments:
        elements.append(Paragraph("Payment History", heading_style))
        
        payment_data = [['Date', 'Job', 'Amount', 'Notes']]
        for payment in payments:
            date_str = payment['date']
            if isinstance(date_str, str):
                date_obj = datetime.fromisoformat(date_str)
            else:
                date_obj = date_str
            
            payment_data.append([
                date_obj.strftime('%m/%d/%Y'),
                payment.get('job_name', 'General'),
                f"${payment['amount']:,.2f}",
                payment.get('notes', '-')[:30] if payment.get('notes') else '-'
            ])
        
        # Add total row
        payment_data.append(['', 'TOTAL RECEIVED:', f"${total_payments:,.2f}", ''])
        
        payment_table = Table(payment_data, colWidths=[1*inch, 1.8*inch, 1.2*inch, 2*inch])
        payment_table.setStyle(TableStyle([
            # Header
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#344E41')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            
            # Data rows
            ('FONTNAME', (0, 1), (-1, -2), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -2), 9),
            ('ALIGN', (2, 1), (2, -1), 'RIGHT'),
            ('GRID', (0, 0), (-1, -2), 0.5, colors.HexColor('#EAE6DF')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, colors.HexColor('#FDFCFB')]),
            ('TOPPADDING', (0, 1), (-1, -2), 8),
            ('BOTTOMPADDING', (0, 1), (-1, -2), 8),
            
            # Total row
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, -1), (-1, -1), 11),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#F5F3EE')),
            ('LINEABOVE', (0, -1), (-1, -1), 2, colors.HexColor('#344E41')),
            ('TOPPADDING', (0, -1), (-1, -1), 10),
            ('BOTTOMPADDING', (0, -1), (-1, -1), 10),
        ]))
        elements.append(payment_table)
    
    # Footer note
    elements.append(Spacer(1, 0.5*inch))
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#5C6B61'),
        alignment=TA_CENTER
    )
    elements.append(Paragraph(
        f"This statement was generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}",
        footer_style
    ))
    
# ============ Simple Monthly Spreadsheet Report ============

@api_router.get("/reports/monthly-spreadsheet")
async def generate_monthly_spreadsheet(
    request: Request,
    month: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    session_token: Optional[str] = Cookie(None)
):
    """Generate a spreadsheet-style PDF for a specific month or date range"""
    user = await get_current_user(request, session_token)
    
    if not month and not (start_date and end_date):
        raise HTTPException(status_code=400, detail="Must provide month OR start_date and end_date")
    
    # Fetch hours logs and payments
    hours_logs = await db.hours_logs.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("date", 1).to_list(10000)
    
    payments = await db.payments.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).to_list(10000)
    
    # Filter based on criteria
    if month:
        filtered_logs = [log for log in hours_logs if log['date'].startswith(month)]
        filtered_payments = [p for p in payments if p['date'].startswith(month)]
        month_date = datetime.strptime(month + '-01', '%Y-%m-%d')
        period_str = month_date.strftime('%B %Y')
        filename_part = month_date.strftime('%B_%Y')
    else:
        filtered_logs = [log for log in hours_logs if start_date <= log['date'] <= end_date]
        filtered_payments = [p for p in payments if start_date <= p['date'] <= end_date]
        period_str = f"{start_date} to {end_date}"
        filename_part = f"{start_date}_to_{end_date}"
    
    if not filtered_logs and not filtered_payments:
        raise HTTPException(status_code=404, detail=f"No activity found for {period_str}")
    
    # Calculate totals
    total_hours = sum(log['hours_worked'] for log in filtered_logs)
    total_earned = sum(log['calculated_pay'] for log in filtered_logs)
    total_paid = sum(p['amount'] for p in filtered_payments)
    balance = total_earned - total_paid
    
    # Create PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=letter, rightMargin=50, leftMargin=50, topMargin=50, bottomMargin=50
    )
    
    elements = []
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'Title', parent=styles['Heading1'], fontSize=18, textColor=colors.HexColor('#061b31'),
        spaceAfter=5, fontName='Helvetica-Bold'
    )
    subtitle_style = ParagraphStyle(
        'Subtitle', parent=styles['Normal'], fontSize=11, textColor=colors.HexColor('#4A5568'),
        spaceAfter=20
    )
    
    elements.append(Paragraph("TIMESHEET", title_style))
    elements.append(Paragraph(f"{user.name} | Period: {period_str}", subtitle_style))
    
    # Summary Box
    summary_data = [
        ['Total Earned', 'Total Paid', 'Balance Owed'],
        [f"${total_earned:,.2f}", f"${total_paid:,.2f}", f"${balance:,.2f}"]
    ]
    summary_table = Table(summary_data, colWidths=[2.2*inch, 2.2*inch, 2.2*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#061b31')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('FONTSIZE', (0, 1), (-1, 1), 14),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('BOTTOMPADDING', (0, 1), (-1, 1), 16),
        ('TOPPADDING', (0, 1), (-1, 1), 16),
        ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#F8FAFC')),
        ('TEXTCOLOR', (2, 1), (2, 1), colors.HexColor('#E53E3E') if balance > 0 else colors.HexColor('#38A169')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#E2E8F0')),
        ('INNERGRID', (0, 0), (-1, -1), 1, colors.HexColor('#E2E8F0')),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 0.4*inch))
    
    # Hours Log Table
    elements.append(Paragraph("Logged Hours", ParagraphStyle('H2', parent=styles['Heading2'], fontSize=14, textColor=colors.HexColor('#061b31'), spaceAfter=10)))
    if filtered_logs:
        table_data = [['Date', 'Job', 'Hours', 'Rate', 'Amount']]
        
        for log in filtered_logs:
            date_obj = datetime.fromisoformat(log['date']) if isinstance(log['date'], str) else log['date']
            table_data.append([
                date_obj.strftime('%m/%d/%Y'),
                log['job_name'],
                f"{log['hours_worked']:.1f}",
                f"${log['hourly_rate']:.2f}",
                f"${log['calculated_pay']:.2f}"
            ])
            
        table_data.append(['', 'TOTAL', f"{total_hours:.1f}", '', f"${total_earned:,.2f}"])
        
        table = Table(table_data, colWidths=[1.2*inch, 2.5*inch, 0.8*inch, 1*inch, 1.2*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#061b31')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
            ('TOPPADDING', (0, 0), (-1, 0), 10),
            ('FONTNAME', (0, 1), (-1, -2), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -2), 10),
            ('ALIGN', (2, 1), (2, -1), 'CENTER'),
            ('ALIGN', (3, 1), (-1, -1), 'RIGHT'),
            ('GRID', (0, 0), (-1, -2), 0.5, colors.HexColor('#E2E8F0')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, colors.HexColor('#F8FAFC')]),
            ('TOPPADDING', (0, 1), (-1, -2), 6),
            ('BOTTOMPADDING', (0, 1), (-1, -2), 6),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, -1), (-1, -1), 11),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#EDF2F7')),
            ('LINEABOVE', (0, -1), (-1, -1), 2, colors.HexColor('#061b31')),
            ('TOPPADDING', (0, -1), (-1, -1), 10),
            ('BOTTOMPADDING', (0, -1), (-1, -1), 10),
        ]))
        elements.append(table)
    else:
        elements.append(Paragraph("No hours logged for this period.", styles['Normal']))
    
    # Build PDF
    doc.build(elements)
    pdf_data = buffer.getvalue()
    buffer.close()
    
    filename = f"timesheet_{filename_part}.pdf"
    return StreamingResponse(
        BytesIO(pdf_data),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
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
