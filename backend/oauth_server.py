"""OAuth 2.1 endpoints used by MCP clients such as ChatGPT."""
import base64, hashlib, os, secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode, urlparse
from fastapi import APIRouter, Form, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from motor.motor_asyncio import AsyncIOMotorClient
ISSUER="https://trackyourbucks.fun"; SCOPES=["trackyourbucks:read","trackyourbucks:write"]
router=APIRouter(prefix="/api/oauth"); _client=AsyncIOMotorClient(os.environ["MONGO_URL"]); _db=_client[os.environ["DB_NAME"]]
def _now(): return datetime.now(timezone.utc)
def _safe_redirect(uri): p=urlparse(uri); return p.scheme=="https" and bool(p.netloc)
def _pkce_ok(v,c): return secrets.compare_digest(base64.urlsafe_b64encode(hashlib.sha256(v.encode()).digest()).decode().rstrip("="),c)
async def _issue_access(user_id,client_id,scopes):
    access=secrets.token_urlsafe(48); expires=_now()+timedelta(hours=1)
    await _db.oauth_access_tokens.insert_one({"access_token":access,"user_id":user_id,"client_id":client_id,"scopes":scopes,"expires_at":expires})
    # MCP already validates user_sessions; mirror the OAuth access token there so one verifier protects both web and MCP traffic.
    await _db.user_sessions.insert_one({"session_token":access,"user_id":user_id,"expires_at":expires,"oauth_client_id":client_id,"oauth_scopes":scopes})
    return access
@router.post("/register")
async def register_client(request:Request):
    body=await request.json(); redirects=body.get("redirect_uris") or []
    if not redirects or any(not _safe_redirect(x) for x in redirects): raise HTTPException(400,"Valid HTTPS redirect_uris are required")
    client_id="mcp_"+secrets.token_urlsafe(24); name=body.get("client_name","MCP Client")
    await _db.oauth_clients.insert_one({"client_id":client_id,"redirect_uris":redirects,"client_name":name,"created_at":_now()})
    return {"client_id":client_id,"redirect_uris":redirects,"client_name":name,"token_endpoint_auth_method":"none"}
async def _session_user(request):
    token=request.cookies.get("session_token")
    if not token:
        auth=request.headers.get("authorization",""); token=auth[7:] if auth.lower().startswith("bearer ") else None
    if not token:return None
    s=await _db.user_sessions.find_one({"session_token":token},{"_id":0})
    if not s:return None
    exp=s.get("expires_at"); exp=datetime.fromisoformat(exp) if isinstance(exp,str) else exp
    if exp and exp.tzinfo is None:exp=exp.replace(tzinfo=timezone.utc)
    return s.get("user_id") if exp and exp>_now() else None
@router.get("/authorize",response_class=HTMLResponse)
async def authorize(request:Request,response_type:str,client_id:str,redirect_uri:str,state:str,code_challenge:str,code_challenge_method:str="S256",scope:str="trackyourbucks:read"):
    if response_type!="code" or code_challenge_method!="S256":raise HTTPException(400,"Authorization code with PKCE S256 is required")
    client=await _db.oauth_clients.find_one({"client_id":client_id},{"_id":0})
    if not client or redirect_uri not in client.get("redirect_uris",[]):raise HTTPException(400,"Invalid OAuth client or redirect URI")
    user_id=await _session_user(request)
    if not user_id:return HTMLResponse("<!doctype html><html><body style='font-family:system-ui;max-width:620px;margin:60px auto'><h2>Sign in to Track Your Bucks</h2><p>Sign in to Track Your Bucks in this browser, then return to ChatGPT and press Connect again.</p><p><a href='/login'>Open Track Your Bucks sign in</a></p></body></html>",status_code=401)
    requested=[s for s in scope.split() if s in SCOPES] or [SCOPES[0]]; code=secrets.token_urlsafe(40)
    await _db.oauth_codes.insert_one({"code":code,"client_id":client_id,"redirect_uri":redirect_uri,"code_challenge":code_challenge,"user_id":user_id,"scopes":requested,"expires_at":_now()+timedelta(minutes=5),"used":False})
    return RedirectResponse(redirect_uri+("&" if "?" in redirect_uri else "?")+urlencode({"code":code,"state":state}),302)
@router.post("/token")
async def token(grant_type:str=Form(...),code:str|None=Form(None),redirect_uri:str|None=Form(None),client_id:str|None=Form(None),code_verifier:str|None=Form(None),refresh_token:str|None=Form(None)):
    if grant_type=="authorization_code":
        rec=await _db.oauth_codes.find_one({"code":code,"used":False})
        if not rec or rec["expires_at"]<=_now() or rec["client_id"]!=client_id or rec["redirect_uri"]!=redirect_uri:return JSONResponse({"error":"invalid_grant"},400)
        if not code_verifier or not _pkce_ok(code_verifier,rec["code_challenge"]):return JSONResponse({"error":"invalid_grant","error_description":"PKCE verification failed"},400)
        await _db.oauth_codes.update_one({"_id":rec["_id"]},{"$set":{"used":True}}); access=await _issue_access(rec["user_id"],client_id,rec["scopes"]); refresh=secrets.token_urlsafe(48)
        await _db.oauth_refresh_tokens.insert_one({"refresh_token":refresh,"user_id":rec["user_id"],"client_id":client_id,"scopes":rec["scopes"],"expires_at":_now()+timedelta(days=30)})
        return {"access_token":access,"token_type":"Bearer","expires_in":3600,"refresh_token":refresh,"scope":" ".join(rec["scopes"])}
    if grant_type=="refresh_token":
        rec=await _db.oauth_refresh_tokens.find_one({"refresh_token":refresh_token,"client_id":client_id})
        if not rec or rec["expires_at"]<=_now():return JSONResponse({"error":"invalid_grant"},400)
        access=await _issue_access(rec["user_id"],client_id,rec["scopes"]); return {"access_token":access,"token_type":"Bearer","expires_in":3600,"scope":" ".join(rec["scopes"])}
    return JSONResponse({"error":"unsupported_grant_type"},400)
