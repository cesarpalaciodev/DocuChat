import numpy as np
import pytest
from src.ingestion.embedder import TfidfEmbedder


def test_tokenize():
    e = TfidfEmbedder()
    tokens = e._tokenize("def hello_world(): return 42")
    assert "hello_world" in tokens
    assert "return" in tokens


def test_fit_and_vectorize():
    e = TfidfEmbedder()
    texts = [
        "middleware functions are functions that have access to the request object",
        "routing refers to how an application endpoints respond to client requests",
        "the app object denotes the Express application",
    ]
    e.fit(texts)
    assert len(e._word_to_idx) > 0
    assert e._idf is not None

    v = e._vectorize("how does middleware work")
    assert len(v) == len(e._word_to_idx)
    assert 0.9 < np.linalg.norm(v) < 1.1


def test_embed_single():
    e = TfidfEmbedder()
    e.fit(["hello world", "foo bar"])
    result = e.embed("hello world")
    assert len(result) == 1
    assert len(result[0]) == len(e._word_to_idx)


def test_embed_list():
    e = TfidfEmbedder()
    e.fit(["hello world", "foo bar", "baz qux"])
    result = e.embed(["hello", "world"])
    assert len(result) == 2


def test_unfit_returns_zero():
    e = TfidfEmbedder()
    result = e.embed("hello")
    assert result == [[0.0]]


def test_empty_fit():
    e = TfidfEmbedder()
    e.fit([])
    result = e.embed("hello")
    assert result == [[0.0]]
