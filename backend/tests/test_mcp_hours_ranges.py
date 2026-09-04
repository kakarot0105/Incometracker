"""Unit coverage for aggregate MCP hour logs without a live MongoDB server."""

import asyncio
import os
import sys
from copy import deepcopy
from pathlib import Path

import pytest

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "incometracker_test")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import mcp_server  # noqa: E402


def _matches(document, query):
    for key, expected in query.items():
        if key == "$or":
            if not any(_matches(document, alternative) for alternative in expected):
                return False
            continue
        actual = document.get(key)
        if isinstance(expected, dict):
            for operator, value in expected.items():
                if operator == "$ne" and actual == value:
                    return False
                if operator == "$gte" and (actual is None or actual < value):
                    return False
                if operator == "$lte" and (actual is None or actual > value):
                    return False
        elif actual != expected:
            return False
    return True


class Cursor:
    def __init__(self, documents):
        self.documents = documents

    def sort(self, field, direction):
        self.documents.sort(key=lambda document: document.get(field, ""), reverse=direction < 0)
        return self

    async def to_list(self, _limit):
        return deepcopy(self.documents)


class Collection:
    def __init__(self, documents=()):
        self.documents = list(documents)

    async def find_one(self, query, _projection=None):
        return next((deepcopy(document) for document in self.documents if _matches(document, query)), None)

    async def insert_one(self, document):
        self.documents.append(deepcopy(document))

    def find(self, query, _projection=None):
        return Cursor([document for document in self.documents if _matches(document, query)])

    async def count_documents(self, query):
        return sum(_matches(document, query) for document in self.documents)


class FakeDatabase:
    def __init__(self):
        self.jobs = Collection([
            {"job_id": "job_lpl", "user_id": "user_a", "job_name": "LPL", "hourly_rate": 58, "is_active": True},
            {"job_id": "job_other", "user_id": "user_b", "job_name": "Other", "hourly_rate": 10, "is_active": True},
        ])
        self.hours_logs = Collection()
        self.payments = Collection([{"user_id": "user_a", "amount": 1_000, "date": "2026-08-20"}])


class FakeContext:
    """The minimal authenticated MCP request shape consumed by _user_id."""
    def __init__(self, user_id="user_a", scopes=None):
        token = type("Token", (), {"subject": user_id, "scopes": scopes or [mcp_server.READ_SCOPE, mcp_server.WRITE_SCOPE]})()
        request = type("Request", (), {"user": type("User", (), {"access_token": token})()})()
        self.request_context = type("RequestContext", (), {"request": request})()


@pytest.fixture
def fake_db(monkeypatch):
    database = FakeDatabase()
    monkeypatch.setattr(mcp_server, "_db", database)
    return database


def run(coroutine):
    return asyncio.run(coroutine)


def test_range_log_stores_one_record_and_calculates_pay(fake_db):
    log = run(mcp_server._add_hours_range("user_a", "job_lpl", "2026-08-01", "2026-08-31", 168, "August 2026 hours"))

    assert len(fake_db.hours_logs.documents) == 1
    assert log["entry_type"] == "range"
    assert log["start_date"] == "2026-08-01"
    assert log["end_date"] == "2026-08-31"
    assert log["hours_worked"] == 168
    assert log["calculated_pay"] == 9744
    assert log["notes"] == "August 2026 hours"


@pytest.mark.parametrize("start_date,end_date,total_hours", [
    ("2026-08-31", "2026-08-01", 168),
    ("2026-08-01", "2026-08-31", 0),
    ("2026-08-01", "2026-08-31", -1),
])
def test_range_log_rejects_bad_dates_or_nonpositive_hours(fake_db, start_date, end_date, total_hours):
    with pytest.raises(ValueError):
        run(mcp_server._add_hours_range("user_a", "job_lpl", start_date, end_date, total_hours, None))
    assert fake_db.hours_logs.documents == []


def test_range_log_rejects_missing_or_other_users_job(fake_db):
    for job_id in ("missing", "job_other"):
        with pytest.raises(ValueError, match="Job not found"):
            run(mcp_server._add_hours_range("user_a", job_id, "2026-08-01", "2026-08-31", 168, None))
    assert fake_db.hours_logs.documents == []


def test_month_resolver_and_summary_count_daily_and_range_once(fake_db):
    assert mcp_server._validated_month_range("2024-02") == ("2024-02-01", "2024-02-29")
    run(mcp_server._add_hours_range("user_a", "job_lpl", "2026-08-01", "2026-08-31", 168, None))
    daily_log = run(mcp_server.add_hours(FakeContext(), "job_lpl", "2026-08-15", 8))

    august_query = mcp_server._hours_query("user_a", "2026-08-01", "2026-08-31")
    august_logs = run(fake_db.hours_logs.find(august_query).to_list(100))
    summary = run(mcp_server._summary("user_a"))

    assert len(august_logs) == 2
    assert daily_log["date"] == "2026-08-15"
    assert daily_log["hours_worked"] == 8
    assert summary["total_hours"] == 176
    assert summary["total_earnings"] == 10208
    assert summary["balance"] == 9208
    assert summary["job_breakdown"] == [{"job_id": "job_lpl", "job_name": "LPL", "hourly_rate": 58.0, "earnings": 10208.0, "hours": 176.0}]


def test_public_range_and_monthly_tools_feed_hours_invoice_and_balance_sheet_once(fake_db):
    context = FakeContext()
    range_log = run(mcp_server.add_hours_range(context, "job_lpl", "2026-08-01", "2026-08-31", 168, "August 2026 hours"))
    monthly_log = run(mcp_server.add_monthly_hours(context, "job_lpl", "2026-09", 160, None))
    daily_log = run(mcp_server.add_hours(context, "job_lpl", "2026-08-15", 8))

    august_hours = run(mcp_server.get_hours(context, "2026-08-01", "2026-08-31"))
    invoice = run(mcp_server.generate_invoice(context, start_date="2026-08-01", end_date="2026-08-31"))
    balance_sheet = run(mcp_server.generate_balance_sheet(context, month="2026-08"))

    assert monthly_log["start_date"] == "2026-09-01"
    assert monthly_log["end_date"] == "2026-09-30"
    assert {log["log_id"] for log in august_hours} == {range_log["log_id"], daily_log["log_id"]}
    assert len(invoice["line_items"]) == 2
    assert invoice["total_amount"] == 10208
    assert balance_sheet["total_hours"] == 176
    assert balance_sheet["total_earned"] == 10208
    assert balance_sheet["total_paid"] == 1000
    assert balance_sheet["balance"] == 9208


def test_tool_descriptions_expose_daily_range_and_monthly_semantics():
    tools = {tool.name: tool.description for tool in run(mcp_server.mcp.list_tools())}
    assert "one day" in tools["add_hours"].lower()
    assert "aggregate" in tools["add_hours_range"].lower()
    assert "calendar month" in tools["add_monthly_hours"].lower()
