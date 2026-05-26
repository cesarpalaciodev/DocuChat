import time
from collections import defaultdict, deque
from collections.abc import Callable
from typing import Any
from fastapi import Request, Response
from fastapi.responses import JSONResponse


_BUCKETS: dict[str, deque[float]] = defaultdict(lambda: deque())


def _cleanup_stale_buckets(now: float, window: float) -> None:
    stale = [k for k, b in list(_BUCKETS.items()) if not b or b[-1] < now - window * 3]
    for k in stale:
        del _BUCKETS[k]


class RateLimiter:
    def __init__(self, requests: int = 30, window: int = 60) -> None:
        self.requests = requests
        self.window = window

    async def __call__(self, request: Request, call_next: Callable[..., Any]) -> Response:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            key = forwarded.split(",")[0].strip()
        elif request.client:
            key = request.client.host
        else:
            key = "unknown"

        now = time.monotonic()
        bucket = _BUCKETS[key]

        while bucket and bucket[0] < now - self.window:
            bucket.popleft()

        remaining = max(0, self.requests - len(bucket))
        reset_at = int(bucket[0] + self.window) if bucket else int(now + self.window)

        if len(bucket) >= self.requests:
            return JSONResponse(
                status_code=429,
                content={"detail": f"Rate limit exceeded ({self.requests}/{self.window}s)"},
                headers={
                    "Retry-After": str(max(1, int(reset_at - now))),
                    "X-RateLimit-Limit": str(self.requests),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(reset_at),
                },
            )

        bucket.append(now)
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(self.requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining - 1)
        response.headers["X-RateLimit-Reset"] = str(reset_at)
        return response


_RATE_MAP: dict[str, str] = {
    "/api/health": "light",
    "/api/stats": "light",
    "/api/repos/": "medium",
    "/api/chat/": "heavy",
    "/api/chat/stream": "heavy",
    "/api/chat/conversations": "medium",
    "/api/search/": "heavy",
}


class TieredRateLimiter:
    def __init__(
        self,
        light_rpm: int = 300,
        medium_rpm: int = 60,
        heavy_rpm: int = 20,
        expense_rpm: int = 5,
        window: int = 60,
    ) -> None:
        self.limiters = {
            "light": RateLimiter(light_rpm, window),
            "medium": RateLimiter(medium_rpm, window),
            "heavy": RateLimiter(heavy_rpm, window),
            "expense": RateLimiter(expense_rpm, window),
        }

    async def __call__(self, request: Request, call_next: Callable[..., Any]) -> Response:
        path = request.url.path

        tier = "medium"
        if path in ("/api/health", "/api/stats"):
            tier = "light"
        elif path in ("/api/chat/", "/api/chat/stream", "/api/search/"):
            tier = "heavy"
        elif path.startswith("/api/repos/") and request.method in ("POST", "DELETE"):
            tier = "expense"
        elif path.startswith("/api/chat/"):
            tier = "medium"

        limiter = self.limiters[tier]
        return await limiter(request, call_next)
