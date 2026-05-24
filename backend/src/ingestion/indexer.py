import json
from pathlib import Path

import numpy as np

from src.core import database as db
from src.core.config import settings
from src.ingestion.embedder import TfidfEmbedder
from src.utils.cache import _search_cache
from src.utils.logging import setup_logger

logger = setup_logger(__name__)

_SHARD_SIZE = 2000


class NumpyVectorStore:
    def __init__(self) -> None:
        settings.vector_store_path.mkdir(parents=True, exist_ok=True)

    def _shard_path(self, repo_id: str, shard: int) -> Path:
        return settings.vector_store_path / f"repo_{repo_id}_{shard}.npz"

    def _shard_glob(self, repo_id: str) -> list[Path]:
        return sorted(settings.vector_store_path.glob(f"repo_{repo_id}_*.npz"))

    def _repo_exists(self, repo_id: str) -> bool:
        return len(self._shard_glob(repo_id)) > 0

    def _get_repo_ids(self) -> list[str]:
        repos = db.repo_list()
        return [r["id"] for r in repos if self._repo_exists(r["id"])]

    def index(self, repo_id: str, repo_url: str, repo_name: str, chunks: list[dict[str, object]]) -> int:
        texts = [c["content"] for c in chunks]

        embedder = TfidfEmbedder()
        embedder.fit(texts)

        all_vectors = [embedder._vectorize(t) for t in texts]

        metadatas = [
            {**c["metadata"], "repo_id": repo_id, "repo_name": repo_name}
            for c in chunks
        ]

        for shard_idx, i in enumerate(range(0, len(all_vectors), _SHARD_SIZE)):
            batch_vecs = all_vectors[i : i + _SHARD_SIZE]
            batch_texts = texts[i : i + _SHARD_SIZE]
            batch_metas = metadatas[i : i + _SHARD_SIZE]

            vectors = np.array(batch_vecs, dtype=np.float32)
            np.savez_compressed(
                self._shard_path(repo_id, shard_idx),
                vectors=vectors,
                texts=np.array(batch_texts, dtype=object),
                metadatas=np.array(batch_metas, dtype=object),
                word_to_idx=json.dumps(embedder._word_to_idx),
                idf=embedder._idf if embedder._idf is not None else np.zeros(1),
            )

        logger.info("Vectors saved: %s (%d chunks in %d shards)", repo_id, len(chunks), len(self._shard_glob(repo_id)))
        return len(chunks)

    def search(self, query_text: str, repo_id: str | None, top_k: int) -> list[dict[str, object]]:
        cache_key = f"{query_text}|{repo_id}|{top_k}"
        cached = _search_cache.get(cache_key)
        if cached is not None:
            return cached  # type: ignore[return-value]

        if repo_id and self._repo_exists(repo_id):
            result_list = self._search_in_repo(query_text, repo_id, top_k)
        else:
            result_list: list[dict[str, object]] = []
            for rid in self._get_repo_ids():
                result_list.extend(self._search_in_repo(query_text, rid, top_k))
            result_list.sort(key=lambda x: x["score"], reverse=True)
            result_list = result_list[:top_k]

        _search_cache.set(cache_key, result_list)
        return result_list

    def _search_in_repo(self, query_text: str, repo_id: str, top_k: int) -> list[dict[str, object]]:
        shards = self._shard_glob(repo_id)
        if not shards:
            return []

        data = np.load(shards[0], allow_pickle=True)
        word_to_idx: dict[str, int] = json.loads(str(data["word_to_idx"]))
        idf: np.ndarray = data["idf"]

        embedder = TfidfEmbedder()
        embedder._word_to_idx = word_to_idx
        embedder._idf = idf
        query_vec = embedder._vectorize(query_text)

        all_candidates: list[tuple[float, str, dict]] = []

        for shard_path in shards:
            try:
                data = np.load(shard_path, allow_pickle=True)
            except (FileNotFoundError, OSError):
                logger.warning("Shard file missing: %s", shard_path)
                continue
            vectors: np.ndarray = data["vectors"]
            texts: np.ndarray = data["texts"]
            metadatas: np.ndarray = data["metadatas"]

            scores = np.dot(vectors, query_vec) / (
                np.linalg.norm(vectors, axis=1) * np.linalg.norm(query_vec) + 1e-9
            )

            k = min(top_k, len(scores))
            top_indices = np.argpartition(-scores, k - 1)[:k]
            top_indices = top_indices[np.argsort(-scores[top_indices])]

            for idx in top_indices:
                if scores[idx] > 0:
                    all_candidates.append((
                        float(scores[idx]),
                        str(texts[idx]),
                        metadatas[idx],  # type: ignore[arg-type]
                    ))

        all_candidates.sort(key=lambda x: x[0], reverse=True)
        results = [
            {"content": c[1], "metadata": c[2], "score": c[0]}
            for c in all_candidates[:top_k]
        ]
        return results

    def delete(self, repo_id: str) -> bool:
        shards = self._shard_glob(repo_id)
        if not shards:
            return False
        for path in shards:
            path.unlink()
        _search_cache.clear()
        logger.info("Vectors deleted: %s (%d shards)", repo_id, len(shards))
        return True


vector_store = NumpyVectorStore()
