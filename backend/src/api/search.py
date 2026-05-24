from fastapi import APIRouter

from src.core import database as db
from src.ingestion.indexer import vector_store
from src.models.schemas import SearchRequest, SearchResult
from src.utils.exceptions import RepoNotFoundError

router = APIRouter(prefix="/api/search", tags=["search"])


@router.post("/", response_model=list[SearchResult])
async def raw_search(body: SearchRequest) -> list[SearchResult]:
    if body.repo_id:
        repo = db.repo_get(body.repo_id)
        if repo is None:
            raise RepoNotFoundError(body.repo_id)

    results = vector_store.search(body.query, body.repo_id, body.top_k)

    return [
        SearchResult(
            content=r["content"][:300],
            file_path=str(r["metadata"].get("file_path", "unknown")),
            repo_name=str(r["metadata"].get("repo_name", "unknown")),
            score=r["score"],
            chunk_index=int(r["metadata"].get("chunk_index", 0)),
        )
        for r in results
    ]
