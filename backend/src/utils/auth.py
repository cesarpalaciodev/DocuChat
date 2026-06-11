from typing import Any, cast

from fastapi import Request, Response
from fastapi.responses import JSONResponse

from src.api.auth import verify_token
from src.core.config import settings
from src.utils.logging import setup_logger

logger = setup_logger(__name__)

_PUBLIC_PATHS = {"/api/health", "/api/stats", "/api/auth/login", "/api/auth/register"}
_PUBLIC_PREFIXES = ("/assets/",)

# All non-API paths are public (SPA, static files)
_NON_API_PREFIXES = ("/assets/", "/favicon", "/robots.txt", "/sitemap.xml")


class AuthMiddleware:
    async def __call__(self, request: Request, call_next: Any) -> Response:
        path = request.url.path
        request.state.user_id = None
        request.state.username = None

        is_static = not path.startswith("/api/")
        public = path in _PUBLIC_PATHS or any(path.startswith(p) for p in _PUBLIC_PREFIXES) or is_static

        auth_header = request.headers.get("Authorization", "")
        api_key_header = request.headers.get("X-API-Key", "")

        token = ""
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
        elif api_key_header:
            token = api_key_header

        payload = verify_token(token) if token else None
        if payload:
            request.state.user_id = payload["user_id"]
            request.state.username = payload["username"]
            return cast(Response, await call_next(request))

        if api_key_header and settings.api_key and api_key_header == settings.api_key:
            return cast(Response, await call_next(request))
        if auth_header.startswith("Bearer ") and settings.api_key and token == settings.api_key:
            return cast(Response, await call_next(request))

        if public or not settings.auth_enabled:
            return cast(Response, await call_next(request))

        logger.debug("Auth failed: token=%s payload=%s path=%s", bool(token), payload is not None, path)
        return JSONResponse(
            status_code=401,
            content={"detail": "Unauthorized. Provide a valid Bearer token or X-API-Key header."},
        )
