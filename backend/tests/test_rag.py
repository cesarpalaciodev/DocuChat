import numpy as np
from unittest.mock import patch, MagicMock
from src.rag.chain import query, _build_context


def test_build_context_empty():
    result = _build_context([])
    assert result == ""


def test_build_context_with_docs():
    docs = [
        {"content": "middleware code here", "metadata": {"file_path": "lib/middleware.js"}},
        {"content": "router code here", "metadata": {"file_path": "lib/router.js"}},
    ]
    result = _build_context(docs)
    assert "lib/middleware.js" in result
    assert "middleware code here" in result
    assert "lib/router.js" in result


@patch("src.rag.chain.vector_store")
@patch("src.rag.chain.httpx.Client")
def test_query_returns_answer(mock_client_cls, mock_store):
    mock_store.search.return_value = [
        {"content": "middleware code", "metadata": {"file_path": "lib/mw.js", "repo_name": "test"}},
    ]

    mock_client = MagicMock()
    mock_client.__enter__.return_value = mock_client
    mock_client.post.return_value.status_code = 200
    mock_client.post.return_value.json.return_value = {
        "choices": [{"message": {"content": "middleware is a function"}}],
    }
    mock_client_cls.return_value = mock_client

    result = query("what is middleware", "repo1")

    assert result["answer"] == "middleware is a function"
    assert len(result["sources"]) == 1
    assert result["sources"][0]["file_path"] == "lib/mw.js"
    assert result["repo_name"] == "test"


@patch("src.rag.chain.vector_store")
@patch("src.rag.chain.httpx.Client")
def test_query_no_results(mock_client_cls, mock_store):
    mock_store.search.return_value = []

    mock_client = MagicMock()
    mock_client.__enter__.return_value = mock_client
    mock_client.post.return_value.status_code = 200
    mock_client.post.return_value.json.return_value = {
        "choices": [{"message": {"content": "no info"}}],
    }
    mock_client_cls.return_value = mock_client

    result = query("unknown", None)

    assert result["answer"] == "no info"
    assert result["sources"] == []
    assert result["repo_name"] is None
