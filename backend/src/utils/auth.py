from typing import Any, cast

from fastapi import Request, Response
from fastapi.responses import JSONResponse

from src.core.config import settings

_PUBLIC_PATHS = {"/api/health", "/api/stats"}
_PUBLIC_PREFIXES = ("/assets/",)


class ApiKeyMiddleware:
    async def __call__(self, request: Request, call_next: Any) -> Response:  # type: ignore[override]
        if not settings.auth_enabled or not settings.api_key:
            return cast(Response, await call_next(request))

        path = request.url.path
        if path in _PUBLIC_PATHS or any(path.startswith(p) for p in _PUBLIC_PREFIXES):
            return cast(Response, await call_next(request))

        auth_header = request.headers.get("Authorization", "")
        api_key_header = request.headers.get("X-API-Key", "")

        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
        elif api_key_header:
            token = api_key_header
        else:
            token = ""

        if token != settings.api_key:
            return JSONResponse(
                status_code=401,
                content={"detail": "Unauthorized. Provide a valid Bearer token or X-API-Key header."},
            )

        return cast(Response, await call_next(request))
