import time
from collections import defaultdict, deque
from collections.abc import Callable
from typing import Any

from fastapi import Request, Response

_BUCKETS: dict[str, deque[float]] = defaultdict(lambda: deque())


class RateLimiter:
    def __init__(self, requests: int = 30, window: int = 60) -> None:
        self.requests = requests
        self.window = window

    async def __call__(self, request: Request, call_next: Callable[..., Any]) -> Response:
        key = request.client.host if request.client else "unknown"
        now = time.monotonic()
        bucket = _BUCKETS[key]

        while bucket and bucket[0] < now - self.window:
            bucket.popleft()

        if len(bucket) >= self.requests:
            from fastapi.responses import JSONResponse
            return JSONResponse(
                status_code=429,
                content={"detail": f"Rate limit exceeded ({self.requests}/{self.window}s)"},
            )

        bucket.append(now)
        return await call_next(request)  # type: ignore[return-value]
