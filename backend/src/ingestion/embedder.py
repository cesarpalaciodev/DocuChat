import re
import numpy as np
from collections import Counter


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


_embedder: TfidfEmbedder | None = None


def get_embeddings() -> TfidfEmbedder:
    global _embedder
    if _embedder is None:
        _embedder = TfidfEmbedder()
    return _embedder
