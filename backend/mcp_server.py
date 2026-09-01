"""Authenticated Model Context Protocol server for Income Tracker.

The MCP tools mirror the website data operations. Report tools return structured
content, which is useful to MCP clients without sending binary PDF downloads.
"""

import calendar
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from motor.motor_asyncio import AsyncIOMotorClient
from mcp.server import MCPServer
from mcp.server.auth.provider import AccessToken, TokenVerifier
from mcp.server.auth.settings import AuthSettings
from mcp.server.mcpserver import Context
from mcp.server.transport_security import TransportSecuritySettings
from pydantic import AnyHttpUrl, Field

READ_SCOPE = "trackyourbucks:read"
WRITE_SCOPE = "trackyourbucks:write"
_mongo_client = AsyncIOMotorClient(os.environ["MONGO_URL"])
_db = _mongo_client[os.environ["DB_NAME"]]


def _expiry(value: Any) -> Optional[datetime]:
    if isinstance(value, str):
        value = datetime.fromisoformat(value)
    if value is not None and value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value


def _serialize(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return {key: _serialize(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_serialize(item) for item in value]
    return value


class IncomeTrackerTokenVerifier(TokenVerifier):
    """Validate OAuth access tokens and first-party browser sessions."""

    async def verify_token(self, token: str) -> AccessToken | None:
        record = await _db.oauth_access_tokens.find_one({"access_token": token}, {"_id": 0})
        if record:
            expires_at = _expiry(record.get("expires_at"))
            if expires_at and expires_at > datetime.now(timezone.utc) and record.get("user_id"):
                return AccessToken(token=token, client_id=record.get("client_id", "mcp-client"), scopes=record.get("scopes", [READ_SCOPE]), expires_at=int(expires_at.timestamp()), subject=record["user_id"], claims={"iss": "https://trackyourbucks.fun"})
        record = await _db.user_sessions.find_one({"session_token": token}, {"_id": 0})
        if not record:
            return None
        expires_at = _expiry(record.get("expires_at"))
        if not expires_at or expires_at <= datetime.now(timezone.utc) or not record.get("user_id"):
            return None
        scopes = record.get("oauth_scopes") or [READ_SCOPE, WRITE_SCOPE]
        return AccessToken(token=token, client_id=record.get("oauth_client_id", "trackyourbucks-web-session"), scopes=scopes, expires_at=int(expires_at.timestamp()), subject=record["user_id"], claims={"iss": "https://trackyourbucks.fun"})


mcp = MCPServer(
    "Income Tracker",
    description="Read and update the authenticated user's jobs, work hours, payments, and reports.",
    website_url="https://trackyourbucks.fun",
    token_verifier=IncomeTrackerTokenVerifier(),
    auth=AuthSettings(issuer_url=AnyHttpUrl("https://trackyourbucks.fun"), resource_server_url=AnyHttpUrl("https://trackyourbucks.fun/api/mcp/"), required_scopes=[READ_SCOPE]),
)


def _token(ctx: Context) -> AccessToken:
    request = ctx.request_context.request
    token = getattr(getattr(request, "user", None), "access_token", None) if request else None
    if not token or not token.subject:
        raise ValueError("Authenticated MCP request required")
    return token


def _user_id(ctx: Context, required_scope: str = READ_SCOPE) -> str:
    token = _token(ctx)
    if required_scope not in token.scopes:
        raise ValueError(f"This operation requires the {required_scope} scope")
    return token.subject


def _date_query(start_date: Optional[str], end_date: Optional[str]) -> dict[str, str]:
    if start_date:
        datetime.fromisoformat(start_date)
    if end_date:
        datetime.fromisoformat(end_date)
    if start_date and end_date and start_date > end_date:
        raise ValueError("start_date must not be after end_date")
    query: dict[str, str] = {}
    if start_date:
        query["$gte"] = start_date
    if end_date:
        query["$lte"] = end_date
    return query


async def _job_for_user(user_id: str, job_id: str) -> dict:
    job = await _db.jobs.find_one({"job_id": job_id, "user_id": user_id}, {"_id": 0})
    if not job:
        raise ValueError("Job not found")
    return job


async def _summary(user_id: str) -> dict:
    hours = await _db.hours_logs.find({"user_id": user_id}, {"_id": 0}).to_list(10000)
    payments = await _db.payments.find({"user_id": user_id}, {"_id": 0}).to_list(10000)
    active_jobs = await _db.jobs.count_documents({"user_id": user_id, "is_active": True})
    earnings = sum(float(item.get("calculated_pay", 0)) for item in hours)
    paid = sum(float(item.get("amount", 0)) for item in payments)
    breakdown: dict[str, dict] = {}
    for item in hours:
        entry = breakdown.setdefault(item["job_id"], {"job_id": item["job_id"], "job_name": item["job_name"], "hourly_rate": float(item["hourly_rate"]), "earnings": 0.0, "hours": 0.0})
        entry["earnings"] += float(item.get("calculated_pay", 0))
        entry["hours"] += float(item.get("hours_worked", 0))
    return {"total_earnings": earnings, "total_payments": paid, "balance": earnings - paid, "total_hours": sum(float(item.get("hours_worked", 0)) for item in hours), "active_jobs": active_jobs, "job_breakdown": sorted(breakdown.values(), key=lambda item: item["earnings"], reverse=True)}


@mcp.tool()
async def get_earnings_summary(ctx: Context) -> dict:
    """Return dashboard totals and the earnings breakdown by job."""
    return await _summary(_user_id(ctx))


@mcp.tool()
async def get_profile(ctx: Context) -> dict:
    """Return the authenticated user's Income Tracker profile."""
    user = await _db.users.find_one({"user_id": _user_id(ctx)}, {"_id": 0})
    if not user:
        raise ValueError("User not found")
    return _serialize(user)


@mcp.tool()
async def list_jobs(ctx: Context, active_only: bool = False) -> list[dict]:
    """List the current user's jobs, optionally only active jobs."""
    query = {"user_id": _user_id(ctx)}
    if active_only:
        query["is_active"] = True
    return _serialize(await _db.jobs.find(query, {"_id": 0, "user_id": 0}).sort("created_at", -1).to_list(1000))


@mcp.tool()
async def create_job(ctx: Context, job_name: str = Field(min_length=1, max_length=200), hourly_rate: float = Field(gt=0, le=1_000_000)) -> dict:
    """Create a job with its hourly rate."""
    user_id = _user_id(ctx, WRITE_SCOPE)
    job = {"job_id": f"job_{uuid.uuid4().hex[:12]}", "user_id": user_id, "job_name": job_name.strip(), "hourly_rate": float(hourly_rate), "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()}
    await _db.jobs.insert_one(job)
    job.pop("user_id")
    return job


@mcp.tool()
async def update_job(ctx: Context, job_id: str, job_name: Optional[str] = Field(default=None, min_length=1, max_length=200), hourly_rate: Optional[float] = Field(default=None, gt=0, le=1_000_000), is_active: Optional[bool] = None) -> dict:
    """Update a job's name, hourly rate, or active status."""
    user_id = _user_id(ctx, WRITE_SCOPE)
    await _job_for_user(user_id, job_id)
    changes = {key: value for key, value in {"job_name": job_name.strip() if job_name else None, "hourly_rate": float(hourly_rate) if hourly_rate is not None else None, "is_active": is_active}.items() if value is not None}
    if not changes:
        raise ValueError("Provide at least one field to update")
    await _db.jobs.update_one({"job_id": job_id, "user_id": user_id}, {"$set": changes})
    job = await _job_for_user(user_id, job_id)
    job.pop("user_id", None)
    return _serialize(job)


@mcp.tool()
async def delete_job(ctx: Context, job_id: str) -> dict:
    """Delete one of the current user's jobs."""
    result = await _db.jobs.delete_one({"job_id": job_id, "user_id": _user_id(ctx, WRITE_SCOPE)})
    if not result.deleted_count:
        raise ValueError("Job not found")
    return {"deleted": True, "job_id": job_id}


@mcp.tool()
async def get_hours(ctx: Context, start_date: Optional[str] = None, end_date: Optional[str] = None, job_id: Optional[str] = None) -> list[dict]:
    """List logged work hours, optionally filtered by job or inclusive date range."""
    query: dict = {"user_id": _user_id(ctx)}
    if job_id:
        query["job_id"] = job_id
    dates = _date_query(start_date, end_date)
    if dates:
        query["date"] = dates
    return _serialize(await _db.hours_logs.find(query, {"_id": 0, "user_id": 0}).sort("date", -1).to_list(1000))


@mcp.tool()
async def add_hours(ctx: Context, job_id: str, date: str, hours_worked: float = Field(gt=0, le=24)) -> dict:
    """Log hours worked against an existing job."""
    datetime.fromisoformat(date)
    user_id = _user_id(ctx, WRITE_SCOPE)
    job = await _job_for_user(user_id, job_id)
    log = {"log_id": f"log_{uuid.uuid4().hex[:12]}", "user_id": user_id, "job_id": job_id, "job_name": job["job_name"], "hourly_rate": float(job["hourly_rate"]), "date": date, "hours_worked": float(hours_worked), "calculated_pay": float(hours_worked) * float(job["hourly_rate"]), "created_at": datetime.now(timezone.utc).isoformat()}
    await _db.hours_logs.insert_one(log)
    log.pop("user_id")
    return log


@mcp.tool()
async def delete_hours(ctx: Context, log_id: str) -> dict:
    """Delete one logged-hours entry."""
    result = await _db.hours_logs.delete_one({"log_id": log_id, "user_id": _user_id(ctx, WRITE_SCOPE)})
    if not result.deleted_count:
        raise ValueError("Hours log not found")
    return {"deleted": True, "log_id": log_id}


@mcp.tool()
async def get_payments(ctx: Context, start_date: Optional[str] = None, end_date: Optional[str] = None, job_id: Optional[str] = None) -> list[dict]:
    """List payments, optionally filtered by job or inclusive date range."""
    query: dict = {"user_id": _user_id(ctx)}
    if job_id:
        query["job_id"] = job_id
    dates = _date_query(start_date, end_date)
    if dates:
        query["date"] = dates
    return _serialize(await _db.payments.find(query, {"_id": 0, "user_id": 0}).sort("date", -1).to_list(1000))


@mcp.tool()
async def add_payment(ctx: Context, date: str = Field(min_length=10, max_length=10), amount: float = Field(gt=0, le=1_000_000_000), job_id: Optional[str] = None, notes: Optional[str] = Field(default=None, max_length=2000)) -> dict:
    """Record a payment, optionally tying it to an existing job."""
    datetime.fromisoformat(date)
    user_id = _user_id(ctx, WRITE_SCOPE)
    job_name = None
    if job_id:
        job_name = (await _job_for_user(user_id, job_id))["job_name"]
    payment = {"payment_id": f"payment_{uuid.uuid4().hex[:12]}", "user_id": user_id, "job_id": job_id, "job_name": job_name, "amount": float(amount), "date": date, "notes": notes, "created_at": datetime.now(timezone.utc).isoformat()}
    await _db.payments.insert_one(payment)
    payment.pop("user_id")
    return payment


@mcp.tool()
async def delete_payment(ctx: Context, payment_id: str) -> dict:
    """Delete one payment."""
    result = await _db.payments.delete_one({"payment_id": payment_id, "user_id": _user_id(ctx, WRITE_SCOPE)})
    if not result.deleted_count:
        raise ValueError("Payment not found")
    return {"deleted": True, "payment_id": payment_id}


@mcp.tool()
async def generate_invoice(ctx: Context, job_id: Optional[str] = None, start_date: Optional[str] = None, end_date: Optional[str] = None, invoice_number: Optional[str] = Field(default=None, max_length=100), notes: Optional[str] = Field(default=None, max_length=2000)) -> dict:
    """Build the data used by the website's invoice PDF for selected work."""
    user_id = _user_id(ctx)
    query: dict = {"user_id": user_id}
    if job_id:
        await _job_for_user(user_id, job_id)
        query["job_id"] = job_id
    dates = _date_query(start_date, end_date)
    if dates:
        query["date"] = dates
    lines = await _db.hours_logs.find(query, {"_id": 0, "user_id": 0}).sort("date", 1).to_list(10000)
    if not lines:
        raise ValueError("No hours logs found for the specified criteria")
    return {"document_type": "invoice", "invoice_number": invoice_number or f"INV-{datetime.now().strftime('%Y%m%d')}", "notes": notes, "line_items": _serialize(lines), "total_amount": sum(float(line["calculated_pay"]) for line in lines)}


@mcp.tool()
async def get_earnings_statement(ctx: Context) -> dict:
    """Build the data used by the website's earnings-statement PDF."""
    user_id = _user_id(ctx)
    return {"document_type": "earnings_statement", "summary": await _summary(user_id), "payments": await get_payments(ctx), "jobs": await list_jobs(ctx)}


@mcp.tool()
async def generate_balance_sheet(ctx: Context, month: Optional[str] = None, start_date: Optional[str] = None, end_date: Optional[str] = None) -> dict:
    """Build the data used by the website's monthly/date-range balance-sheet PDF."""
    if bool(month) == bool(start_date or end_date):
        raise ValueError("Provide either month or both start_date and end_date")
    if month:
        try:
            datetime.strptime(month, "%Y-%m")
        except ValueError as error:
            raise ValueError("month must use YYYY-MM format") from error
        year, month_number = map(int, month.split("-"))
        start_date, end_date = f"{month}-01", f"{month}-{calendar.monthrange(year, month_number)[1]:02d}"
    elif not start_date or not end_date:
        raise ValueError("Both start_date and end_date are required")
    _date_query(start_date, end_date)
    hours = await get_hours(ctx, start_date, end_date)
    payments = await get_payments(ctx, start_date, end_date)
    earned = sum(float(item["calculated_pay"]) for item in hours)
    paid = sum(float(item["amount"]) for item in payments)
    if not hours and not payments:
        raise ValueError("No activity found for this period")
    return {"document_type": "balance_sheet", "period": {"start_date": start_date, "end_date": end_date}, "hours": hours, "payments": payments, "total_hours": sum(float(item["hours_worked"]) for item in hours), "total_earned": earned, "total_paid": paid, "balance": earned - paid}


mcp_http_app = mcp.streamable_http_app(
    streamable_http_path="/", json_response=True, stateless_http=True,
    transport_security=TransportSecuritySettings(
        allowed_hosts=["trackyourbucks.fun", "www.trackyourbucks.fun", "localhost:*", "127.0.0.1:*"],
        allowed_origins=["https://trackyourbucks.fun", "https://www.trackyourbucks.fun", "http://localhost:*", "http://127.0.0.1:*"],
    ),
)
