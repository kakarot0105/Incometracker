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


class _McpNoSlash:
    """Serve /api/mcp like /api/mcp/.

    The mount otherwise answers the slashless URL with a 307 to an http://
    location (the scheme is lost behind Nginx), which MCP clients such as
    claude.ai refuse to follow, so the connector cannot be added.
    """

    def __init__(self, app):
        # Starlette builds middleware as cls(app=...), so the name must be `app`.
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http" and scope.get("path") == "/api/mcp":
            scope = {**scope, "path": "/api/mcp/", "raw_path": b"/api/mcp/"}
        await self.app(scope, receive, send)


app.add_middleware(_McpNoSlash)
