import io
from src.ingestion.loader import chunk_text, _sanitize_name


def test_chunk_text_small():
    chunks = chunk_text("short text", chunk_size=1000, overlap=200)
    assert len(chunks) == 1
    assert chunks[0] == "short text"


def test_chunk_text_large():
    text = "line1\n" * 600
    chunks = chunk_text(text, chunk_size=500, overlap=100, max_chunks=10)
    assert len(chunks) <= 10
    for c in chunks:
        assert len(c) <= 600


def test_chunk_text_exact_size():
    text = "a" * 100 + "\n" + "b" * 100
    chunks = chunk_text(text, chunk_size=50, overlap=0, max_chunks=5)
    assert all(len(c) >= 1 for c in chunks)


def test_sanitize_name_valid():
    assert _sanitize_name("express") == "express"
    assert _sanitize_name("my-repo_v2") == "my-repo_v2"


def test_sanitize_name_invalid():
    assert _sanitize_name("url:with:colons") == "url_with_colons"
    assert _sanitize_name("name with spaces") == "name_with_spaces"
    assert _sanitize_name("") == "repo"
