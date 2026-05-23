import pytest
from httpx import ASGITransport, AsyncClient
from src.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_health(client):
    resp = await client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["version"] == "1.0.0"


@pytest.mark.asyncio
async def test_list_repos_empty(client):
    resp = await client.get("/api/repos/")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_chat_no_repos(client):
    resp = await client.post("/api/chat/", json={"question": "hello"})
    assert resp.status_code == 200
    data = resp.json()
    assert "answer" in data
    assert isinstance(data["sources"], list)


@pytest.mark.asyncio
async def test_add_repo_invalid_url(client):
    resp = await client.post("/api/repos/", json={"url": "not-a-url"})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_add_repo_valid_triggers_indexing(client):
    resp = await client.post(
        "/api/repos/",
        json={"url": "https://github.com/expressjs/express.git", "branch": "master"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "indexing"
    assert data["name"] == "express"
    assert len(data["id"]) == 12


@pytest.mark.asyncio
async def test_repo_status_404(client):
    resp = await client.get("/api/repos/nonexistent/status")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_chat_nonexistent_repo(client):
    resp = await client.post("/api/chat/", json={"question": "test", "repo_id": "nonexistent"})
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_conversations_returns_list(client):
    resp = await client.get("/api/chat/conversations")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_chat_empty_question_rejected(client):
    resp = await client.post("/api/chat/", json={"question": "   "})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_static_frontend(client):
    resp = await client.get("/")
    assert resp.status_code == 200
    assert "text/html" in resp.headers["content-type"]
