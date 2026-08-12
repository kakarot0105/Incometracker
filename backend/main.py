"""Production ASGI entrypoint for the website API and MCP server."""

from contextlib import asynccontextmanager

from server import app, client
from mcp_server import mcp, mcp_http_app, _mongo_client


@asynccontextmanager
async def lifespan(_app):
    # Mounted Starlette applications do not run their own lifespan, so the
    # parent application owns the MCP session manager lifecycle.
    async with mcp.session_manager.run():
        try:
            yield
        finally:
            client.close()
            _mongo_client.close()


app.router.lifespan_context = lifespan
# Keep MCP below /api so the existing Nginx /api/ reverse proxy forwards it.
app.mount("/api/mcp", mcp_http_app)
