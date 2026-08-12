"""Model Context Protocol server for Track Your Bucks."""
import os, uuid
from datetime import datetime, timezone
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import AnyHttpUrl
from mcp.server import MCPServer
from mcp.server.mcpserver import Context
from mcp.server.auth.provider import AccessToken, TokenVerifier
from mcp.server.auth.settings import AuthSettings
from mcp.server.transport_security import TransportSecuritySettings

_mongo_client=AsyncIOMotorClient(os.environ["MONGO_URL"]); _db=_mongo_client[os.environ["DB_NAME"]]
def _expiry(v):
    if isinstance(v,str): v=datetime.fromisoformat(v)
    if v is not None and v.tzinfo is None: v=v.replace(tzinfo=timezone.utc)
    return v

class TrackYourBucksTokenVerifier(TokenVerifier):
    async def verify_token(self, token:str)->AccessToken|None:
        rec=await _db.oauth_access_tokens.find_one({"access_token":token},{"_id":0})
        if rec:
            exp=_expiry(rec.get("expires_at"))
            if exp and exp>datetime.now(timezone.utc) and rec.get("user_id"):
                return AccessToken(token=token,client_id=rec.get("client_id","mcp-client"),scopes=rec.get("scopes",["trackyourbucks:read"]),expires_at=int(exp.timestamp()),subject=rec["user_id"],claims={"iss":"https://trackyourbucks.fun"})
        rec=await _db.user_sessions.find_one({"session_token":token},{"_id":0})
        if not rec:return None
        exp=_expiry(rec.get("expires_at"))
        if not exp or exp<=datetime.now(timezone.utc) or not rec.get("user_id"):return None
        return AccessToken(token=token,client_id="trackyourbucks-web-session",scopes=["trackyourbucks:read","trackyourbucks:write"],expires_at=int(exp.timestamp()),subject=rec["user_id"],claims={"iss":"https://trackyourbucks.fun"})

mcp=MCPServer("Track Your Bucks",description="Read and update the authenticated user's jobs, work hours, payments, and earnings.",website_url="https://trackyourbucks.fun",token_verifier=TrackYourBucksTokenVerifier(),auth=AuthSettings(issuer_url=AnyHttpUrl("https://trackyourbucks.fun"),resource_server_url=AnyHttpUrl("https://trackyourbucks.fun/api/mcp"),required_scopes=["trackyourbucks:read"]))

def _user_id(ctx:Context)->str:
    request=ctx.request_context.request
    if request is None or not getattr(request,"user",None):raise ValueError("Authenticated MCP request required")
    uid=getattr(getattr(request.user,"access_token",None),"subject",None)
    if not uid:raise ValueError("Authenticated user identity is missing")
    return uid

def _date_query(start_date,end_date):
    q={}
    if start_date:q["$gte"]=start_date
    if end_date:q["$lte"]=end_date
    return q

@mcp.tool()
async def get_earnings_summary(ctx:Context)->dict:
    uid=_user_id(ctx); hours=await _db.hours_logs.find({"user_id":uid},{"_id":0}).to_list(10000); payments=await _db.payments.find({"user_id":uid},{"_id":0}).to_list(10000); jobs=await _db.jobs.count_documents({"user_id":uid,"is_active":True}); earnings=sum(float(x.get("calculated_pay",0)) for x in hours); paid=sum(float(x.get("amount",0)) for x in payments)
    return {"total_earnings":earnings,"total_payments":paid,"balance":earnings-paid,"total_hours":sum(float(x.get("hours_worked",0)) for x in hours),"active_jobs":jobs}
@mcp.tool()
async def list_jobs(ctx:Context,active_only:bool=False)->list[dict]:
    q={"user_id":_user_id(ctx)}
    if active_only:q["is_active"]=True
    return await _db.jobs.find(q,{"_id":0,"user_id":0}).sort("created_at",-1).to_list(1000)
@mcp.tool()
async def get_hours(ctx:Context,start_date:Optional[str]=None,end_date:Optional[str]=None,job_id:Optional[str]=None)->list[dict]:
    q={"user_id":_user_id(ctx)}
    if job_id:q["job_id"]=job_id
    d=_date_query(start_date,end_date)
    if d:q["date"]=d
    return await _db.hours_logs.find(q,{"_id":0,"user_id":0}).sort("date",-1).to_list(1000)
@mcp.tool()
async def get_payments(ctx:Context,start_date:Optional[str]=None,end_date:Optional[str]=None,job_id:Optional[str]=None)->list[dict]:
    q={"user_id":_user_id(ctx)}
    if job_id:q["job_id"]=job_id
    d=_date_query(start_date,end_date)
    if d:q["date"]=d
    return await _db.payments.find(q,{"_id":0,"user_id":0}).sort("date",-1).to_list(1000)
@mcp.tool()
async def add_hours(ctx:Context,job_id:str,date:str,hours_worked:float)->dict:
    if hours_worked<=0 or hours_worked>24:raise ValueError("hours_worked must be greater than 0 and no more than 24")
    datetime.fromisoformat(date); uid=_user_id(ctx); job=await _db.jobs.find_one({"job_id":job_id,"user_id":uid},{"_id":0})
    if not job:raise ValueError("Job not found")
    x={"log_id":f"log_{uuid.uuid4().hex[:12]}","user_id":uid,"job_id":job_id,"job_name":job["job_name"],"hourly_rate":float(job["hourly_rate"]),"date":date,"hours_worked":float(hours_worked),"calculated_pay":float(hours_worked)*float(job["hourly_rate"]),"created_at":datetime.now(timezone.utc).isoformat()}; await _db.hours_logs.insert_one(x.copy());x.pop("user_id",None);return x
@mcp.tool()
async def add_payment(ctx:Context,amount:float,date:str,job_id:Optional[str]=None,notes:Optional[str]=None)->dict:
    if amount<=0:raise ValueError("amount must be greater than 0")
    datetime.fromisoformat(date);uid=_user_id(ctx);name=None
    if job_id:
        job=await _db.jobs.find_one({"job_id":job_id,"user_id":uid},{"_id":0})
        if not job:raise ValueError("Job not found")
        name=job["job_name"]
    x={"payment_id":f"payment_{uuid.uuid4().hex[:12]}","user_id":uid,"job_id":job_id,"job_name":name,"amount":float(amount),"date":date,"notes":notes,"created_at":datetime.now(timezone.utc).isoformat()};await _db.payments.insert_one(x.copy());x.pop("user_id",None);return x

mcp_http_app=mcp.streamable_http_app(streamable_http_path="/",json_response=True,stateless_http=True,transport_security=TransportSecuritySettings(allowed_hosts=["trackyourbucks.fun","www.trackyourbucks.fun","localhost:*","127.0.0.1:*"],allowed_origins=["https://trackyourbucks.fun","https://www.trackyourbucks.fun","http://localhost:*","http://127.0.0.1:*"]))
