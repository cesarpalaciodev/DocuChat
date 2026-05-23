from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from src.api import api_router
from src.core.config import settings
from src.utils.exceptions import DocuChatError
from src.utils.logging import setup_logger
from src.utils.ratelimit import RateLimiter

logger = setup_logger("main")

STATIC_DIR = Path(__file__).parent.parent / "static"
STATIC_DIR.mkdir(exist_ok=True)

MAX_BODY_SIZE = 10 * 1024 * 1024


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.vector_store_path.mkdir(parents=True, exist_ok=True)
    settings.clone_path.mkdir(parents=True, exist_ok=True)
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
    allow_origins=["http://localhost:8000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)

app.middleware("http")(RateLimiter(requests=60, window=60))

app.include_router(api_router)


@app.middleware("http")
async def request_validation(request: Request, call_next):
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
    logger.warning("%s: %s", type(exc).__name__, exc)
    return JSONResponse(status_code=exc.status_code, content={"detail": str(exc)})


@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error("Unhandled error: %s", exc, exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}


if STATIC_DIR.exists() and list(STATIC_DIR.glob("index.html")):
    app.mount("/assets", StaticFiles(directory=str(STATIC_DIR / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = STATIC_DIR / full_path
        if full_path and file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(STATIC_DIR / "index.html"))
