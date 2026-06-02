import re
from collections import Counter

import httpx
import numpy as np

from src.core.config import settings
from src.utils.logging import setup_logger

logger = setup_logger(__name__)


class TfidfEmbedder:
    def __init__(self) -> None:
        self._word_to_idx: dict[str, int] = {}
        self._idf: np.ndarray | None = None

    def _tokenize(self, text: str) -> list[str]:
        return re.findall(r"[a-zA-Z_]\w{2,}", text.lower())

    def fit(self, texts: list[str]) -> None:
        doc_count = len(texts)
        df: Counter[str] = Counter()
        for text in texts:
            tokens = set(self._tokenize(text))
            for token in tokens:
                df[token] += 1
        self._word_to_idx = {w: i for i, w in enumerate(sorted(df))}
        self._idf = np.zeros(len(self._word_to_idx), dtype=np.float32)
        for word, idx in self._word_to_idx.items():
            self._idf[idx] = np.log((doc_count + 1) / (df[word] + 1)) + 1.0

    def _vectorize(self, text: str) -> np.ndarray:
        if self._idf is None or len(self._word_to_idx) == 0:
            return np.zeros(1, dtype=np.float32)
        vec = np.zeros(len(self._word_to_idx), dtype=np.float32)
        tokens = self._tokenize(text)
        counts = Counter(tokens)
        for word, count in counts.items():
            idx = self._word_to_idx.get(word)
            if idx is not None:
                vec[idx] = count * self._idf[idx]
        norm = np.linalg.norm(vec)
        return (vec / norm) if norm > 0 else vec

    def embed(self, texts: str | list[str]) -> list[list[float]]:
        if isinstance(texts, str):
            texts = [texts]
        return [self._vectorize(t).tolist() for t in texts]


class ApiEmbedder:
    def __init__(self) -> None:
        self._url = f"{settings.llm_base_url.rstrip('/')}/embeddings"
        self._client: httpx.Client | None = None
        self._dim: int | None = None

    def _get_client(self) -> httpx.Client:
        if self._client is None or self._client.is_closed:
            self._client = httpx.Client(
                timeout=httpx.Timeout(30, connect=10),
                limits=httpx.Limits(max_keepalive_connections=5, max_connections=10),
            )
        return self._client

    def embed(self, texts: str | list[str]) -> list[list[float]]:
        if isinstance(texts, str):
            texts = [texts]

        payload = {
            "model": settings.embedding_model,
            "input": texts,
        }
        client = self._get_client()
        resp = client.post(
            self._url,
            headers={
                "Authorization": f"Bearer {settings.llm_api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
        )

        if resp.status_code != 200:
            logger.error("Embedding API error %s: %s", resp.status_code, resp.text[:200])
            raise RuntimeError(f"Embedding API returned {resp.status_code}")

        data = resp.json()
        vectors = [item["embedding"] for item in data["data"]]
        if self._dim is None and vectors:
            self._dim = len(vectors[0])
        return vectors

    @property
    def dim(self) -> int | None:
        return self._dim


_embedder: TfidfEmbedder | None = None
_api_embedder: ApiEmbedder | None = None


def get_embeddings() -> TfidfEmbedder:
    global _embedder
    if _embedder is None:
        _embedder = TfidfEmbedder()
    return _embedder


def get_api_embeddings() -> ApiEmbedder:
    global _api_embedder
    if _api_embedder is None:
        _api_embedder = ApiEmbedder()
    return _api_embedder
