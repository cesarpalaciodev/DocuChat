import pytest
from src.utils.exceptions import DocuChatError, RepoCloneError, RepoNotFoundError, IndexingError, LLMError, ValidationError


def test_docuchat_error_default_status():
    err = DocuChatError("test")
    assert err.status_code == 500


def test_repo_clone_error():
    err = RepoCloneError("http://x", "timeout")
    assert err.status_code == 400
    assert "http://x" in str(err)


def test_repo_not_found_error():
    err = RepoNotFoundError("abc123")
    assert err.status_code == 404


def test_indexing_error():
    err = IndexingError("abc123", "OOM")
    assert err.status_code == 500


def test_llm_error():
    err = LLMError("rate limit")
    assert err.status_code == 502


def test_validation_error():
    err = ValidationError("bad input")
    assert err.status_code == 422
