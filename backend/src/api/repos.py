import re
import shutil
import uuid
from contextlib import suppress
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, HTTPException, Request

from src.core import database as db
from src.core.config import settings
from src.ingestion.indexer import vector_store
from src.ingestion.loader import _on_rm_error, ingest_repository
from src.ingestion.queue import indexing_queue
from src.models.schemas import RepoRequest, RepoResponse
from src.utils.exceptions import IndexingError, RepoNotFoundError
from src.utils.logging import setup_logger

logger = setup_logger(__name__)
router = APIRouter(prefix="/api/repos", tags=["repos"])

_ID_RE = re.compile(r"^[a-f0-9]{8,64}$")


def _sanitize_name(raw: str) -> str:
    return re.sub(r"[^\w\-.]", "_", raw).strip("_") or "repo"


def _validate_repo_id(repo_id: str) -> None:
    if not _ID_RE.match(repo_id):
        raise HTTPException(status_code=400, detail="Invalid repository ID format")


def _run_indexing(repo_id: str, repo_url: str, repo_branch: str, repo_name: str) -> None:
    try:
        logger.info("Indexing started: %s (active=%d)", repo_id, indexing_queue.active_count)
        result = ingest_repository(repo_url, repo_branch)
        indexed = vector_store.index(repo_id, repo_url, repo_name, result["chunks"])
        db.repo_update(repo_id, "ready", indexed)
        logger.info("Indexing done: %s (%d chunks)", repo_id, indexed)
    except Exception as e:
        logger.error("Indexing failed: %s - %s", repo_id, e, exc_info=True)
        error_text = type(e).__name__ if type(e).__name__ != "Exception" else "Indexing failed"
        db.repo_update(repo_id, "error", error=error_text[:200])
    finally:
        clone_dir = settings.clone_path / repo_id
        if clone_dir.exists():
            with suppress(Exception):
                shutil.rmtree(clone_dir, onerror=_on_rm_error)


@router.post("/", response_model=RepoResponse)
async def add_repository(body: RepoRequest, request: Request) -> RepoResponse:
    if indexing_queue.active_count >= indexing_queue.max_concurrent:
        raise IndexingError("system", f"Too many concurrent clones. Max: {indexing_queue.max_concurrent}")

    repo_id = uuid.uuid4().hex[:12]
    repo_name = _sanitize_name(body.url.rstrip("/").split("/")[-1].replace(".git", ""))
    user_id = getattr(request.state, "user_id", None)

    db.repo_create(repo_id, body.url, repo_name, body.branch, user_id)

    indexing_queue.submit(repo_id, _run_indexing, repo_id, body.url, body.branch, repo_name)

    return RepoResponse(
        id=repo_id,
        url=body.url,
        branch=body.branch,
        name=repo_name,
        indexed_documents=0,
        status="indexing",
        created_at=datetime.now(UTC).isoformat(),
    )


@router.get("/queue/status")
async def queue_status() -> dict[str, int]:
    return {
        "active": indexing_queue.active_count,
        "pending": indexing_queue.pending_count,
        "max": indexing_queue.max_concurrent,
    }


@router.get("/{repo_id}/status")
async def repo_status(repo_id: str) -> dict[str, Any]:
    _validate_repo_id(repo_id)
    repo = db.repo_get(repo_id)
    if repo is None:
        raise RepoNotFoundError(repo_id)
    return {
        "status": repo["status"],
        "indexed": repo["indexed_documents"],
        "error": repo.get("error"),
    }


@router.get("/")
async def list_repos(request: Request) -> list[dict[str, Any]]:
    user_id = getattr(request.state, "user_id", None)
    return db.repo_list(user_id)


@router.delete("/{repo_id}")
async def delete_repository(repo_id: str, request: Request) -> dict[str, str]:
    _validate_repo_id(repo_id)
    repo = db.repo_get(repo_id)
    if repo is None:
        raise RepoNotFoundError(repo_id)
    user_id = getattr(request.state, "user_id", None)
    if user_id and repo.get("user_id") and repo["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="You do not own this repository")
    deleted = vector_store.delete(repo_id)
    db_deleted = db.repo_delete(repo_id)
    if not deleted and not db_deleted:
        raise RepoNotFoundError(repo_id)
    logger.info("Repo deleted: %s", repo_id)
    return {"message": "Repository deleted successfully"}
