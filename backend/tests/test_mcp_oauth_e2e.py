"""Manual end-to-end regression test for the remote MCP OAuth handshake.

Run with a local MongoDB and API server, for example:
MCP_E2E_BASE_URL=http://127.0.0.1:8001 MCP_E2E_MONGO_URL=mongodb://127.0.0.1:27018 pytest tests/test_mcp_oauth_e2e.py
"""

import base64
import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qs, urlparse

import pytest
import requests
from pymongo import MongoClient


BASE_URL = os.getenv("MCP_E2E_BASE_URL")
MONGO_URL = os.getenv("MCP_E2E_MONGO_URL")
pytestmark = pytest.mark.skipif(
    not BASE_URL or not MONGO_URL,
    reason="Set MCP_E2E_BASE_URL and MCP_E2E_MONGO_URL to run the real integration test.",
)


def test_oauth_pkce_then_authenticated_mcp_tool_discovery():
    db = MongoClient(MONGO_URL).incometracker_mcp_e2e
    db.client.drop_database("incometracker_mcp_e2e")
    session_token = "session_e2e"
    db.users.insert_one(
        {
            "user_id": "user_e2e",
            "email": "e2e@example.test",
            "name": "E2E User",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    db.user_sessions.insert_one(
        {
            "user_id": "user_e2e",
            "session_token": session_token,
            "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
        }
    )

    browser = requests.Session()
    browser.cookies.set("session_token", session_token, domain="127.0.0.1", path="/")
    registration = browser.post(
        f"{BASE_URL}/api/oauth/register",
        json={"client_name": "E2E Client", "redirect_uris": ["https://example.com/callback"]},
        timeout=10,
    )
    registration.raise_for_status()
    client_id = registration.json()["client_id"]

    verifier = secrets.token_urlsafe(64)
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip("=")
    authorization = browser.get(
        f"{BASE_URL}/api/oauth/authorize",
        params={
            "response_type": "code",
            "client_id": client_id,
            "redirect_uri": "https://example.com/callback",
            "state": "e2e-state",
            "code_challenge": challenge,
            "code_challenge_method": "S256",
            "scope": "trackyourbucks:read offline_access",
        },
        allow_redirects=False,
        timeout=10,
    )
    assert authorization.status_code == 302
    callback = parse_qs(urlparse(authorization.headers["location"]).query)
    assert callback["state"] == ["e2e-state"]
    assert callback["iss"] == ["https://trackyourbucks.fun"]

    token = browser.post(
        f"{BASE_URL}/api/oauth/token",
        data={
            "grant_type": "authorization_code",
            "code": callback["code"][0],
            "redirect_uri": "https://example.com/callback",
            "client_id": client_id,
            "code_verifier": verifier,
        },
        timeout=10,
    )
    token.raise_for_status()
    token_data = token.json()
    assert token_data["token_type"] == "Bearer"
    assert token_data["refresh_token"]

    headers = {
        "Authorization": f"Bearer {token_data['access_token']}",
        "Accept": "application/json, text/event-stream",
        "Content-Type": "application/json",
        "MCP-Protocol-Version": "2025-06-18",
    }
    initialize = requests.post(
        f"{BASE_URL}/api/mcp/",
        headers=headers,
        json={
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {"protocolVersion": "2025-06-18", "capabilities": {}, "clientInfo": {"name": "e2e", "version": "1"}},
        },
        timeout=10,
    )
    initialize.raise_for_status()
    tool_list = requests.post(
        f"{BASE_URL}/api/mcp/",
        headers=headers,
        json={"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}},
        timeout=10,
    )
    tool_list.raise_for_status()
    names = {tool["name"] for tool in tool_list.json()["result"]["tools"]}
    assert {
        "get_earnings_summary", "create_job", "generate_invoice",
        "add_hours_range", "add_monthly_hours",
    } <= names

    summary = requests.post(
        f"{BASE_URL}/api/mcp/",
        headers=headers,
        json={"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "get_earnings_summary", "arguments": {}}},
        timeout=10,
    )
    summary.raise_for_status()
    assert not summary.json()["result"].get("isError")

    refreshed = browser.post(
        f"{BASE_URL}/api/oauth/token",
        data={"grant_type": "refresh_token", "refresh_token": token_data["refresh_token"], "client_id": client_id},
        timeout=10,
    )
    refreshed.raise_for_status()
    assert refreshed.json()["access_token"]

    write_verifier = secrets.token_urlsafe(64)
    write_challenge = base64.urlsafe_b64encode(hashlib.sha256(write_verifier.encode()).digest()).decode().rstrip("=")
    write_authorization = browser.get(
        f"{BASE_URL}/api/oauth/authorize",
        params={
            "response_type": "code",
            "client_id": client_id,
            "redirect_uri": "https://example.com/callback",
            "state": "e2e-write",
            "code_challenge": write_challenge,
            "code_challenge_method": "S256",
            "scope": "trackyourbucks:read trackyourbucks:write offline_access",
        },
        allow_redirects=False,
        timeout=10,
    )
    write_callback = parse_qs(urlparse(write_authorization.headers["location"]).query)
    write_token = browser.post(
        f"{BASE_URL}/api/oauth/token",
        data={
            "grant_type": "authorization_code",
            "code": write_callback["code"][0],
            "redirect_uri": "https://example.com/callback",
            "client_id": client_id,
            "code_verifier": write_verifier,
        },
        timeout=10,
    )
    write_token.raise_for_status()
    write_headers = {**headers, "Authorization": f"Bearer {write_token.json()['access_token']}"}
    create_job = requests.post(
        f"{BASE_URL}/api/mcp/",
        headers=write_headers,
        json={"jsonrpc": "2.0", "id": 4, "method": "tools/call", "params": {"name": "create_job", "arguments": {"job_name": "E2E Client", "hourly_rate": 125}}},
        timeout=10,
    )
    create_job.raise_for_status()
    assert not create_job.json()["result"].get("isError")
