"""Production ASGI entrypoint for the website API, OAuth, and MCP server."""

from contextlib import asynccontextmanager

from server import app, client
from mcp_server import mcp, mcp_http_app, _mongo_client
from oauth_server import router as oauth_router


@asynccontextmanager
async def lifespan(_app):
    async with mcp.session_manager.run():
        try:
            yield
        finally:
            client.close()
            _mongo_client.close()


app.router.lifespan_context = lifespan
# OAuth discovery must live at the public origin, not below /api.
app.include_router(oauth_router)
# Keep MCP below /api so the existing Nginx /api/ reverse proxy forwards it.
app.mount("/api/mcp", mcp_http_app)
