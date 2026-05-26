from collections.abc import AsyncGenerator, Callable
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from src.api import api_router
from src.core.config import settings
from src.utils.exceptions import DocuChatError
from src.utils.headers import SecurityHeadersMiddleware
from src.utils.logging import setup_logger
from src.utils.ratelimit import TieredRateLimiter

logger = setup_logger("main")

STATIC_DIR = Path(__file__).parent.parent / "static"
STATIC_DIR.mkdir(exist_ok=True)

MAX_BODY_SIZE = 10 * 1024 * 1024


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    settings.vector_store_path.mkdir(parents=True, exist_ok=True)
    settings.clone_path.mkdir(parents=True, exist_ok=True)
    import shutil
    from contextlib import suppress
    for item in settings.clone_path.iterdir():
        with suppress(Exception):
            shutil.rmtree(item, ignore_errors=True)
    if not settings.llm_api_key or len(settings.llm_api_key) < 10:
        logger.error("LLM_API_KEY not configured or too short")
        raise SystemExit("LLM_API_KEY must be a valid API key in .env")
    logger.info("DocuChat starting on %s:%s", settings.host, settings.port)
    yield
    logger.info("DocuChat shutting down")


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
    allow_headers=["Content-Type", "Authorization"],
)

if settings.rate_limit_enabled:
    app.middleware("http")(TieredRateLimiter(
        light_rpm=settings.rate_light_rpm,
        medium_rpm=settings.rate_medium_rpm,
        heavy_rpm=settings.rate_heavy_rpm,
        expense_rpm=settings.rate_expense_rpm,
        window=settings.rate_window_seconds,
    ))

app.middleware("http")(SecurityHeadersMiddleware())

app.include_router(api_router)


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
    from src.core import database as db
    repos = db.repo_list()
    return {
        "status": "ok",
        "version": "1.0.0",
        "indexed_repos": len(repos),
        "ready_repos": sum(1 for r in repos if r.get("status") == "ready"),
    }


@app.get("/api/stats")
async def stats() -> dict[str, object]:
    from src.core import database as db
    repos = db.repo_list()
    total_chunks = sum(r.get("indexed_documents", 0) for r in repos)
    conversations = db.conversation_list()
    return {
        "total_repos": len(repos),
        "ready_repos": sum(1 for r in repos if r.get("status") == "ready"),
        "indexing_repos": sum(1 for r in repos if r.get("status") == "indexing"),
        "error_repos": sum(1 for r in repos if r.get("status") == "error"),
        "total_chunks": total_chunks,
        "total_conversations": len(conversations),
    }


if STATIC_DIR.exists() and list(STATIC_DIR.glob("index.html")):
    app.mount("/assets", StaticFiles(directory=str(STATIC_DIR / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str) -> FileResponse:
        file_path = STATIC_DIR / full_path
        if full_path and file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(STATIC_DIR / "index.html"))
