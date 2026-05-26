import pytest
from src.models.schemas import RepoRequest, ChatRequest


def test_repo_request_valid():
    req = RepoRequest(url="https://github.com/user/repo.git", branch="main")
    assert req.url == "https://github.com/user/repo.git"
    assert req.branch == "main"


def test_repo_request_default_branch():
    req = RepoRequest(url="https://github.com/user/repo.git")
    assert req.branch == "main"


def test_repo_request_invalid_url():
    with pytest.raises(ValueError, match="URL must start with"):
        RepoRequest(url="not-a-url")


def test_repo_request_sanitizes_branch():
    req = RepoRequest(url="https://github.com/user/repo.git", branch="feat/thing;rm -rf")
    assert ";" not in req.branch
    assert " " not in req.branch


def test_chat_request_valid():
    req = ChatRequest(question="How does middleware work?")
    assert req.question == "How does middleware work?"


def test_chat_request_empty_question():
    with pytest.raises(ValueError, match="Question cannot be empty"):
        ChatRequest(question="   ")


def test_chat_request_with_repo():
    req = ChatRequest(question="test", repo_id="abcdef1234567890", conversation_id="1234567890abcdef")
    assert req.repo_id == "abcdef1234567890"
    assert req.conversation_id == "1234567890abcdef"
