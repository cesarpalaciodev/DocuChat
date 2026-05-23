import pytest
from src.models.schemas import _validate_url, RepoRequest


def test_valid_github_url():
    assert _validate_url("https://github.com/user/repo.git")


def test_valid_gitlab_url():
    assert _validate_url("https://gitlab.com/user/repo.git")


def test_valid_bitbucket_url():
    assert _validate_url("https://bitbucket.org/user/repo.git")


def test_rejects_unknown_host():
    with pytest.raises(ValueError, match="not allowed"):
        _validate_url("https://evil.com/user/repo.git")


def test_rejects_internal_host():
    with pytest.raises(ValueError, match="not allowed"):
        _validate_url("https://localhost/repo.git")


def test_rejects_path_traversal():
    with pytest.raises(ValueError, match="forbidden"):
        _validate_url("https://github.com/../../etc/passwd.git")


def test_rejects_url_with_null_byte():
    with pytest.raises(ValueError, match="forbidden"):
        _validate_url("https://github.com/repo\x00.git")


def test_rejects_file_protocol():
    with pytest.raises(ValueError, match="forbidden"):
        _validate_url("file:///etc/passwd")


def test_rejects_empty_url():
    with pytest.raises(ValueError):
        _validate_url("")


def test_rejects_too_long_url():
    with pytest.raises(ValueError, match="between 1 and"):
        _validate_url("https://github.com/" + "a" * 500)


def test_branch_rejects_path_traversal():
    with pytest.raises(ValueError, match="path traversal"):
        RepoRequest(url="https://github.com/user/repo.git", branch="../../etc")


def test_branch_sanitizes_special_chars():
    req = RepoRequest(url="https://github.com/user/repo.git", branch="feat;rm -rf")
    assert ";" not in req.branch
    assert " " not in req.branch
