"""Model Context Protocol server for Track Your Bucks.

The MCP endpoint is mounted by server.py at /mcp. It reuses the website's
existing session tokens as Bearer tokens and always derives user_id from the
validated token, never from tool arguments.
"""

import os
from datetime import datetime, timezone
from typing import Optional
import uuid

from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import AnyHttpUrl
from mcp.server import MCPServer
from mcp.server.mcpserver import Context
from mcp.server.auth.provider import AccessToken, TokenVerifier
from mcp.server.auth.settings import AuthSettings
from mcp.server.transport_security import TransportSecuritySettings


_mongo_client = AsyncIOMotorClient(os.environ["MONGO_URL"])
_db = _mongo_client[os.environ["DB_NAME"]]


class TrackYourBucksTokenVerifier(TokenVerifier):
    """Validate the same session Bearer tokens used by the web application."""

    async def verify_token(self, token: str) -> AccessToken | None:
        session = await _db.user_sessions.find_one({"session_token": token}, {"_id": 0})
        if not session:
            return None

        expires_at = session.get("expires_at")
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        if expires_at is None:
            return None
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at <= datetime.now(timezone.utc):
            return None

        user_id = session.get("user_id")
        if not user_id:
            return None

        return AccessToken(
            token=token,
            client_id="trackyourbucks-mcp-client",
            scopes=["trackyourbucks:read", "trackyourbucks:write"],
            expires_at=int(expires_at.timestamp()),
            subject=user_id,
            claims={"iss": "https://trackyourbucks.fun"},
        )


mcp = MCPServer(
    "Track Your Bucks",
    description="Read and update the authenticated user's jobs, work hours, payments, and earnings.",
    website_url="https://trackyourbucks.fun",
    token_verifier=TrackYourBucksTokenVerifier(),
    auth=AuthSettings(
        issuer_url=AnyHttpUrl("https://trackyourbucks.fun"),
        resource_server_url=AnyHttpUrl("https://trackyourbucks.fun/mcp"),
        required_scopes=["trackyourbucks:read"],
    ),
)


def _user_id(ctx: Context) -> str:
    request = ctx.request_context.request
    if request is None or not getattr(request, "user", None):
        raise ValueError("Authenticated MCP request required")
    access_token = getattr(request.user, "access_token", None)
    user_id = getattr(access_token, "subject", None)
    if not user_id:
        raise ValueError("Authenticated user identity is missing")
    return user_id


def _date_query(start_date: Optional[str], end_date: Optional[str]) -> dict:
    query = {}
    if start_date:
        query["$gte"] = start_date
    if end_date:
        query["$lte"] = end_date
    return query


@mcp.tool()
async def get_earnings_summary(ctx: Context) -> dict:
    """Get total earnings, payments received, outstanding balance, hours, and active jobs."""
    user_id = _user_id(ctx)
    hours_logs = await _db.hours_logs.find({"user_id": user_id}, {"_id": 0}).to_list(10000)
    payments = await _db.payments.find({"user_id": user_id}, {"_id": 0}).to_list(10000)
    active_jobs = await _db.jobs.count_documents({"user_id": user_id, "is_active": True})

    total_earnings = sum(float(x.get("calculated_pay", 0)) for x in hours_logs)
    total_payments = sum(float(x.get("amount", 0)) for x in payments)
    total_hours = sum(float(x.get("hours_worked", 0)) for x in hours_logs)
    return {
        "total_earnings": total_earnings,
        "total_payments": total_payments,
        "balance": total_earnings - total_payments,
        "total_hours": total_hours,
        "active_jobs": active_jobs,
    }


@mcp.tool()
async def list_jobs(ctx: Context, active_only: bool = False) -> list[dict]:
    """List the authenticated user's jobs and hourly rates."""
    user_id = _user_id(ctx)
    query = {"user_id": user_id}
    if active_only:
        query["is_active"] = True
    return await _db.jobs.find(query, {"_id": 0, "user_id": 0}).sort("created_at", -1).to_list(1000)


@mcp.tool()
async def get_hours(
    ctx: Context,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    job_id: Optional[str] = None,
) -> list[dict]:
    """Get work-hour entries, optionally filtered by ISO date range and job."""
    user_id = _user_id(ctx)
    query: dict = {"user_id": user_id}
    if job_id:
        query["job_id"] = job_id
    dates = _date_query(start_date, end_date)
    if dates:
        query["date"] = dates
    return await _db.hours_logs.find(query, {"_id": 0, "user_id": 0}).sort("date", -1).to_list(1000)


@mcp.tool()
async def get_payments(
    ctx: Context,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    job_id: Optional[str] = None,
) -> list[dict]:
    """Get received payments, optionally filtered by ISO date range and job."""
    user_id = _user_id(ctx)
    query: dict = {"user_id": user_id}
    if job_id:
        query["job_id"] = job_id
    dates = _date_query(start_date, end_date)
    if dates:
        query["date"] = dates
    return await _db.payments.find(query, {"_id": 0, "user_id": 0}).sort("date", -1).to_list(1000)


@mcp.tool()
async def add_hours(ctx: Context, job_id: str, date: str, hours_worked: float) -> dict:
    """Log hours worked for one of the authenticated user's jobs."""
    if hours_worked <= 0 or hours_worked > 24:
        raise ValueError("hours_worked must be greater than 0 and no more than 24")
    datetime.fromisoformat(date)

    user_id = _user_id(ctx)
    job = await _db.jobs.find_one({"job_id": job_id, "user_id": user_id}, {"_id": 0})
    if not job:
        raise ValueError("Job not found")

    log = {
        "log_id": f"log_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "job_id": job_id,
        "job_name": job["job_name"],
        "hourly_rate": float(job["hourly_rate"]),
        "date": date,
        "hours_worked": float(hours_worked),
        "calculated_pay": float(hours_worked) * float(job["hourly_rate"]),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await _db.hours_logs.insert_one(log.copy())
    log.pop("user_id", None)
    return log


@mcp.tool()
async def add_payment(
    ctx: Context,
    amount: float,
    date: str,
    job_id: Optional[str] = None,
    notes: Optional[str] = None,
) -> dict:
    """Record a payment received by the authenticated user."""
    if amount <= 0:
        raise ValueError("amount must be greater than 0")
    datetime.fromisoformat(date)

    user_id = _user_id(ctx)
    job_name = None
    if job_id:
        job = await _db.jobs.find_one({"job_id": job_id, "user_id": user_id}, {"_id": 0})
        if not job:
            raise ValueError("Job not found")
        job_name = job["job_name"]

    payment = {
        "payment_id": f"payment_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "job_id": job_id,
        "job_name": job_name,
        "amount": float(amount),
        "date": date,
        "notes": notes,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await _db.payments.insert_one(payment.copy())
    payment.pop("user_id", None)
    return payment


# The parent FastAPI app mounts this at /mcp. Moving the transport path to '/'
# keeps the public endpoint exactly https://trackyourbucks.fun/mcp.
mcp_http_app = mcp.streamable_http_app(
    streamable_http_path="/",
    json_response=True,
    stateless_http=True,
    transport_security=TransportSecuritySettings(
        allowed_hosts=["trackyourbucks.fun", "www.trackyourbucks.fun", "localhost:*", "127.0.0.1:*"],
        allowed_origins=["https://trackyourbucks.fun", "https://www.trackyourbucks.fun", "http://localhost:*", "http://127.0.0.1:*"],
    ),
)
