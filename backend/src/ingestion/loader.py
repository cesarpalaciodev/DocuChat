import os
import re
import shutil
import stat
import threading
import uuid
from pathlib import Path
from typing import Any

from git import Repo

from src.core.config import settings
from src.utils.exceptions import RepoCloneError
from src.utils.logging import setup_logger

logger = setup_logger(__name__)


def _sanitize_name(name: str) -> str:
    cleaned = re.sub(r"[^\w\-.]", "_", name).strip("_")
    cleaned = re.sub(r"_+", "_", cleaned)
    return cleaned[:100] or "repo"


_TEXT_EXTENSIONS = {
    ".md", ".rst", ".txt", ".py", ".js", ".ts", ".tsx", ".jsx",
    ".html", ".css", ".scss", ".java", ".go", ".rs", ".rb",
    ".php", ".c", ".cpp", ".h", ".hpp", ".yaml", ".yml",
    ".toml", ".json", ".xml", ".cfg", ".conf", ".ini",
    ".sh", ".bat", ".ps1", ".sql", ".graphql", ".proto",
}

_SKIP_DIRS = {".git", "node_modules", "__pycache__", ".mypy_cache",
              ".pytest_cache", ".ruff_cache", "dist", "build",
              ".next", "coverage", ".nyc_output", "vendor", "target"}

_MAX_CHUNKS_PER_FILE = 50
_MAX_TOTAL_FILES = 5000

_PATH_TRAVERSAL_RE = re.compile(r"\.\./|\.\.\\|%2e%2e|%252e|/etc/|^[A-Z]:", re.IGNORECASE)


def _on_rm_error(func: Any, path: str, exc_info: Any) -> None:
    os.chmod(path, stat.S_IWRITE)
    func(path)


def _clone_with_timeout(repo_url: str, clone_path: Path, branch: str | None = None) -> None:
    result: list[Exception | None] = [None]

    def _clone() -> None:
        try:
            if branch:
                Repo.clone_from(repo_url, str(clone_path), branch=branch, depth=1)
            else:
                Repo.clone_from(repo_url, str(clone_path), depth=1)
        except Exception as e:
            result[0] = e

    t = threading.Thread(target=_clone, daemon=True)
    t.start()
    t.join(timeout=settings.clone_timeout_seconds)

    if t.is_alive():
        raise RepoCloneError(repo_url, f"Clone timed out after {settings.clone_timeout_seconds}s")

    if result[0] is not None:
        raise result[0]


def _clone_repo(repo_url: str, branch: str = "main") -> tuple[str, str, str]:
    repo_uuid = uuid.uuid4().hex[:12]
    raw_name = repo_url.rstrip("/").split("/")[-1].replace(".git", "")
    repo_name = _sanitize_name(raw_name)

    if _PATH_TRAVERSAL_RE.search(repo_name):
        raise RepoCloneError(repo_url, "Repo name contains path traversal patterns")

    clone_path = settings.clone_path / repo_uuid / repo_name

    if ".." in str(clone_path):
        raise RepoCloneError(repo_url, "Resolved path contains parent traversal")

    clone_path = clone_path.resolve()
    if not str(clone_path).startswith(str(settings.clone_path.resolve())):
        raise RepoCloneError(repo_url, "Clone path escapes base directory")

    clone_path.mkdir(parents=True, exist_ok=True)

    try:
        _clone_with_timeout(repo_url, clone_path, branch)
    except RepoCloneError:
        raise
    except Exception:
        try:
            _clone_with_timeout(repo_url, clone_path, None)
        except RepoCloneError:
            raise
        except Exception as e:
            raise RepoCloneError(repo_url, str(e)) from e

    return repo_uuid, repo_name, str(clone_path)


def _load_documents(clone_path: str) -> list[dict[str, Any]]:
    docs: list[dict[str, Any]] = []
    file_count = 0
    for root, dirs, files in os.walk(clone_path):
        dirs[:] = [d for d in dirs if d not in _SKIP_DIRS]
        for filename in files:
            file_count += 1
            if file_count > _MAX_TOTAL_FILES:
                logger.warning("Reached max file limit (%d), stopping", _MAX_TOTAL_FILES)
                return docs

            filepath = os.path.join(root, filename)
            if Path(filename).suffix.lower() not in _TEXT_EXTENSIONS:
                continue

            try:
                fsize = os.path.getsize(filepath)
                if fsize > settings.max_file_size:
                    continue
            except OSError:
                continue

            try:
                with open(filepath, encoding="utf-8", errors="ignore") as f:
                    content = f.read()
            except Exception:
                continue
            if not content.strip():
                continue

            relative_path = os.path.relpath(filepath, clone_path)
            docs.append({
                "content": content,
                "metadata": {"file_path": relative_path, "file_name": filename},
            })
    return docs


def chunk_text(text: str, chunk_size: int, overlap: int, max_chunks: int = _MAX_CHUNKS_PER_FILE) -> list[str]:
    if len(text) <= chunk_size:
        return [text]
    chunks: list[str] = []
    start = 0
    while start < len(text) and len(chunks) < max_chunks:
        end = min(start + chunk_size, len(text))
        chunk = text[start:end]
        if end < len(text):
            last_newline = chunk.rfind("\n")
            if last_newline > chunk_size // 2:
                end = start + last_newline
                chunk = text[start:end]
        chunks.append(chunk)
        start = end - overlap
    return chunks


def ingest_repository(repo_url: str, branch: str = "main") -> dict[str, Any]:
    repo_uuid, repo_name, clone_path = _clone_repo(repo_url, branch)
    documents = _load_documents(clone_path)

    total_chunks = 0
    chunks: list[dict[str, Any]] = []
    for doc in documents:
        doc_chunks = chunk_text(doc["content"], settings.chunk_size, settings.chunk_overlap)
        for i, c in enumerate(doc_chunks):
            if total_chunks >= settings.max_total_chunks:
                logger.warning("Max total chunks reached (%d)", settings.max_total_chunks)
                return {
                    "id": repo_uuid,
                    "url": repo_url,
                    "branch": branch,
                    "name": repo_name,
                    "chunks": chunks,
                }
            chunks.append({
                "content": c,
                "metadata": {**doc["metadata"], "chunk_index": i},
            })
            total_chunks += 1

    from contextlib import suppress
    with suppress(Exception):
        shutil.rmtree(clone_path, onerror=_on_rm_error)

    return {
        "id": repo_uuid,
        "url": repo_url,
        "branch": branch,
        "name": repo_name,
        "chunks": chunks,
    }
