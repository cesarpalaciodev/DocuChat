import asyncio
import signal
import sqlite3
from collections.abc import AsyncGenerator, Callable
from contextlib import asynccontextmanager, suppress
from pathlib import Path
from typing import Any

import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from src.api import api_router
from src.api.auth import router as auth_router
from src.core import database as db
from src.core.config import settings
from src.utils.auth import AuthMiddleware
from src.utils.exceptions import DocuChatError
from src.utils.headers import SecurityHeadersMiddleware
from src.utils.logging import setup_logger
from src.utils.ratelimit import TieredRateLimiter

logger = setup_logger("main")

STATIC_DIR = Path(__file__).parent.parent / "static"
STATIC_DIR.mkdir(exist_ok=True)

MAX_BODY_SIZE = 10 * 1024 * 1024

_shutdown_event = asyncio.Event()

_LLM_CLIENT: httpx.AsyncClient | None = None


def _get_llm_health_client() -> httpx.AsyncClient:
    global _LLM_CLIENT
    if _LLM_CLIENT is None or _LLM_CLIENT.is_closed:
        _LLM_CLIENT = httpx.AsyncClient(timeout=httpx.Timeout(10.0, connect=5.0))
    return _LLM_CLIENT


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    settings.vector_store_path.mkdir(parents=True, exist_ok=True)
    settings.clone_path.mkdir(parents=True, exist_ok=True)
    import shutil
    for item in settings.clone_path.iterdir():
        with suppress(Exception):
            shutil.rmtree(item, ignore_errors=True)
    if not settings.llm_api_key or len(settings.llm_api_key) < 10:
        logger.warning("LLM_API_KEY not configured - users must provide their own API keys")
    else:
        logger.info("Server LLM API key configured")

    loop = asyncio.get_running_loop()
    stop_event = asyncio.Event()

    def _handle_sig(sig: int) -> None:
        logger.info("Received signal %s, initiating graceful shutdown", sig)
        _shutdown_event.set()
        stop_event.set()

    for sig in (signal.SIGINT, signal.SIGTERM):
        with suppress(NotImplementedError):
            loop.add_signal_handler(sig, _handle_sig, sig)

    logger.info("DocuChat starting on %s:%s", settings.host, settings.port)
    yield

    logger.info("DocuChat shutting down gracefully")
    await asyncio.sleep(1.0)
    if _LLM_CLIENT and not _LLM_CLIENT.is_closed:
        await _LLM_CLIENT.aclose()
    logger.info("DocuChat shutdown complete")


app = FastAPI(
    title="DocuChat API",
    description="RAG Chatbot for technical documentation from code repositories",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type", "Authorization", "X-User-API-Key", "X-User-Model", "X-User-Base-URL", "X-Auth-Token"],
)

if settings.rate_limit_enabled:
    app.middleware("http")(TieredRateLimiter(
        light_rpm=settings.rate_light_rpm,
        medium_rpm=settings.rate_medium_rpm,
        heavy_rpm=settings.rate_heavy_rpm,
        expense_rpm=settings.rate_expense_rpm,
        window=settings.rate_window_seconds,
    ))

app.middleware("http")(AuthMiddleware())

app.middleware("http")(SecurityHeadersMiddleware())

app.include_router(api_router)
app.include_router(auth_router)


@app.middleware("http")
async def request_validation(request: Request, call_next: Callable[[Request], Any]) -> Any:
    if request.method in ("POST", "PUT"):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > MAX_BODY_SIZE:
            return JSONResponse(status_code=413, content={"detail": "Request body too large"})
        content_type = request.headers.get("content-type", "")
        if "application/json" not in content_type and "text/event-stream" not in content_type:
            return JSONResponse(status_code=415, content={"detail": "Content-Type must be application/json"})
    return await call_next(request)


@app.exception_handler(DocuChatError)
async def docuchat_error_handler(request: Request, exc: DocuChatError) -> JSONResponse:
    logger.warning("%s: %s (path=%s)", type(exc).__name__, str(exc)[:200], request.url.path)
    return JSONResponse(status_code=exc.status_code, content={"detail": str(exc)})


@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error("Unhandled error on %s: %s", request.url.path, exc, exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


@app.get("/api/health")
async def health() -> dict[str, object]:
    checks: dict[str, str] = {}

    try:
        repos = db.repo_list()
        checks["database"] = "ok"
    except sqlite3.Error:
        repos = []
        checks["database"] = "error"

    try:
        vs_exists = settings.vector_store_path.exists()
        checks["vector_store"] = "ok" if vs_exists else "error"
    except Exception:
        checks["vector_store"] = "error"

    try:
        vs_path = settings.vector_store_path
        free_gb = 0.0
        if vs_path.exists():
            import shutil
            usage = shutil.disk_usage(vs_path)
            free_gb = usage.free / (1024**3)
        checks["disk_free_gb"] = f"{free_gb:.1f}"
    except Exception:
        checks["disk_free_gb"] = "unknown"

    if settings.llm_api_key and len(settings.llm_api_key) >= 10:
        try:
            client = _get_llm_health_client()
            llm_url = f"{settings.llm_base_url.rstrip('/')}/models"
            resp = await client.get(
                llm_url,
                headers={"Authorization": f"Bearer {settings.llm_api_key}"},
            )
            checks["llm_api"] = "ok" if 200 <= resp.status_code < 500 else f"status_{resp.status_code}"
        except Exception as e:
            checks["llm_api"] = f"error: {type(e).__name__}"
    else:
        checks["llm_api"] = "unconfigured"

    all_ok = all(v == "ok" for v in checks.values())
    return {
        "status": "ok" if all_ok else "degraded",
        "version": "1.0.0",
        "indexed_repos": len(repos),
        "ready_repos": sum(1 for r in repos if r.get("status") == "ready"),
        "checks": checks,
    }


@app.get("/api/stats")
async def stats() -> dict[str, object]:
    from src.core import database as db
    repos = db.repo_list()
    total_chunks = sum(r.get("indexed_documents", 0) for r in repos)
    total_convos = db.conversation_count()
    return {
        "total_repos": len(repos),
        "ready_repos": sum(1 for r in repos if r.get("status") == "ready"),
        "indexing_repos": sum(1 for r in repos if r.get("status") == "indexing"),
        "error_repos": sum(1 for r in repos if r.get("status") == "error"),
        "total_chunks": total_chunks,
        "total_conversations": total_convos,
    }


@app.post("/api/validate-key")
async def validate_key(request: Request) -> dict[str, object]:
    body = await request.json()
    api_key = (body.get("api_key") or "").strip()
    base_url = (body.get("base_url") or "").strip() or None
    if not api_key:
        return {"valid": False, "error": "API key is required"}
    from src.rag.chain import validate_api_key
    valid, detail = validate_api_key(api_key, base_url)
    return {"valid": valid, "error": None if valid else detail}


if STATIC_DIR.exists() and list(STATIC_DIR.glob("index.html")):
    app.mount("/assets", StaticFiles(directory=str(STATIC_DIR / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str) -> FileResponse:
        file_path = STATIC_DIR / full_path
        if full_path and file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(STATIC_DIR / "index.html"))
