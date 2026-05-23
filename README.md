# DocuChat - RAG Chatbot for Technical Documentation

Chatbot with Retrieval-Augmented Generation (RAG) for querying technical documentation from code repositories. Uses **TF-IDF** + **numpy** + **SQLite** with a **FastAPI** backend and **React + Tailwind** frontend. LLM via any OpenAI-compatible API (OpenRouter, GPT, DeepSeek, Groq).

## Features

- Clone and index code repositories (Markdown, source files, READMEs)
- TF-IDF semantic search with cosine similarity (no GPU needed)
- RAG-powered answers with source citations
- **SSE streaming** — answers appear token by token
- **Multi-repository** support with cross-repo search
- **Conversation history** persisted in SQLite
- **Dark/light mode** toggle
- **Keyboard shortcuts** (Ctrl+K focus input, Esc toggle)
- **Rate limiting**, input validation, anti-path-traversal security

## Tech Stack

| Layer | Technology |
|-------|-----------|
| LLM | Any OpenAI-compatible API (OpenRouter, GPT, DeepSeek, Groq) |
| Embeddings | TF-IDF (numpy, pure Python, no GPU) |
| Vector Store | Numpy `.npz` sharded by 2000 vectors |
| Database | SQLite (WAL mode) for repos + conversations |
| Backend | FastAPI + Uvicorn |
| Frontend | React 18 + Vite + Tailwind CSS |
| Code Clone | GitPython (--depth=1, timeout 60s) |

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+

### Setup

```bash
cd docu-chat

# 1. Configure environment
cp .env.example backend/.env
# Edit backend/.env and add your LLM_API_KEY

# 2. Install backend dependencies
cd backend
pip install -r requirements.txt

# 3. Build and install frontend
cd ../frontend
npm install
npm run build
mkdir ../backend/static
cp -r dist/* ../backend/static/

# 4. Start (single command, single port)
cd ../backend
uvicorn src.main:app --host 0.0.0.0 --port 8000
```

Open **http://localhost:8000**

### Using Docker

```bash
docker-compose up
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/repos/` | Index a repository (async) |
| GET | `/api/repos/` | List indexed repos |
| GET | `/api/repos/{id}/status` | Poll indexing progress |
| DELETE | `/api/repos/{id}` | Remove a repository |
| POST | `/api/chat/` | Ask a question (RAG) |
| POST | `/api/chat/stream` | Ask with SSE streaming |
| GET | `/api/chat/conversations` | List conversations |
| GET | `/api/chat/conversations/{id}` | Get conversation messages |
| GET | `/api/health` | Health check |

## Security

| Feature | Detail |
|---------|--------|
| URL allowlist | Only github.com, gitlab.com, bitbucket.org by default |
| Path traversal | Blocked in URLs and branch names |
| File size limit | Skip files > 500KB (configurable) |
| Chunk limit | Max 20000 total chunks per repo |
| Clone timeout | 60 seconds (configurable) |
| Concurrent clones | Max 3 simultaneous |
| Rate limiting | 60 requests/minute per IP |
| Input validation | Pydantic with sanitization |
| Body size limit | 10MB max POST body |

## Configuration (.env)

```env
LLM_API_KEY=sk-or-v1-...          # OpenRouter key (or any OpenAI-compatible)
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_MODEL=meta-llama/llama-3-8b-instruct

# Security
ALLOWED_HOSTS=github.com,gitlab.com,bitbucket.org
MAX_TOTAL_CHUNKS=20000
MAX_FILE_SIZE=500000
CLONE_TIMEOUT_SECONDS=60
MAX_CONCURRENT_CLONES=3
```

## Project Structure

```
docu-chat/
├── backend/
│   ├── src/
│   │   ├── api/              # FastAPI routes (chat, repos)
│   │   ├── core/             # Settings, database, config
│   │   ├── ingestion/        # Repo cloning, chunking, TF-IDF embedding
│   │   ├── rag/              # Search + LLM query + streaming
│   │   ├── models/           # Pydantic schemas with validation
│   │   ├── utils/            # Logging, exceptions, rate limit, cache
│   │   └── main.py           # Entry point with middleware
│   ├── tests/
│   │   ├── test_api.py       # Integration tests (FastAPI)
│   │   ├── test_security.py  # Security validation tests
│   │   ├── test_embedder.py  # TF-IDF unit tests
│   │   ├── test_rag.py       # RAG chain tests
│   │   └── ...
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── components/       # ChatWindow, Sidebar, Toast, ErrorBoundary
│   │   ├── hooks/            # useChat (SSE streaming, AbortController)
│   │   └── lib/              # API client + SSE stream parser
│   └── package.json
└── .env.example
```

## Running Tests

```bash
cd backend
python -m pytest tests/ -v
```
