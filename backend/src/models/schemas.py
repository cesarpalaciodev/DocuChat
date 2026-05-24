import re
from urllib.parse import urlparse

from pydantic import BaseModel, field_validator

from src.core.config import settings

_MAX_URL_LENGTH = 500
_BLOCKED_PATTERNS = [
    r"\.\./", r"\.\.\\", r"%2e%2e", r"%252e",
    r"\/etc\/", r"C:", r"file://", r"\\x", r"\x00",
]
_BLOCKED_RE = re.compile("|".join(_BLOCKED_PATTERNS), re.IGNORECASE)


def _validate_url(url: str) -> str:
    url = url.strip()

    if not url or len(url) > _MAX_URL_LENGTH:
        raise ValueError(f"URL must be between 1 and {_MAX_URL_LENGTH} characters")

    if _BLOCKED_RE.search(url):
        raise ValueError("URL contains forbidden patterns")

    if not (url.startswith("https://") or url.startswith("http://")):
        raise ValueError("URL must start with https:// or http://")

    try:
        parsed = urlparse(url)
        host = (parsed.hostname or "").lower()
        if not host:
            raise ValueError("URL has no valid hostname")
        if host not in settings.allowed_host_list:
            raise ValueError(f"Host '{host}' is not allowed. Allowed: {', '.join(settings.allowed_host_list)}")
    except ValueError as e:
        if "Host" in str(e):
            raise
        raise ValueError("Invalid URL format") from None

    if not url.rstrip("/").endswith(".git") and "/" in parsed.path:
        pass

    return url


class RepoRequest(BaseModel):
    url: str
    branch: str = "main"

    @field_validator("url")
    @classmethod
    def url_validate(cls, v: str) -> str:
        return _validate_url(v)

    @field_validator("branch")
    @classmethod
    def branch_sanitize(cls, v: str) -> str:
        sanitized = re.sub(r"[^\w\-./]", "", v)[:100]
        if re.search(r"\.\./|\.\.\\", sanitized):
            raise ValueError("Branch name contains path traversal")
        return sanitized or "main"


class ChatRequest(BaseModel):
    question: str
    repo_id: str | None = None
    conversation_id: str | None = None

    @field_validator("question")
    @classmethod
    def question_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Question cannot be empty")
        return v.strip()[:5000]


class SourceDocument(BaseModel):
    file_path: str
    content_snippet: str


class ChatResponse(BaseModel):
    answer: str
    sources: list[SourceDocument]
    repo_name: str | None = None
    conversation_id: str | None = None


class SearchRequest(BaseModel):
    query: str
    repo_id: str | None = None
    top_k: int = 4

    @field_validator("query")
    @classmethod
    def query_not_empty_search(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Query cannot be empty")
        return v.strip()[:5000]

    @field_validator("top_k")
    @classmethod
    def top_k_valid(cls, v: int) -> int:
        if v < 1 or v > 20:
            raise ValueError("top_k must be between 1 and 20")
        return v


class SearchResult(BaseModel):
    content: str
    file_path: str
    repo_name: str
    score: float
    chunk_index: int


class RepoResponse(BaseModel):
    id: str
    url: str
    branch: str
    name: str
    indexed_documents: int
    status: str
    created_at: str
    error: str | None = None
