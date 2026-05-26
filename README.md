# DocuChat - RAG Chatbot for Technical Documentation

[![Python](https://img.shields.io/badge/python-3.11+-blue)](https://www.python.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.6-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/react-18-61DAFB)](https://react.dev/)
[![Tests](https://img.shields.io/badge/tests-43%20passing-green)](./backend/tests/)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)
[![CI](https://github.com/cesarpalaciodev/DocuChat/actions/workflows/test.yml/badge.svg)](https://github.com/cesarpalaciodev/DocuChat/actions/workflows/test.yml)

Chatbot with Retrieval-Augmented Generation (RAG) for querying technical documentation from code repositories. Supports both **TF-IDF** (local, no GPU) and **API embeddings** (semantic, via OpenAI-compatible API) with a **FastAPI** backend and **React + Tailwind** frontend. LLM via any OpenAI-compatible API (OpenRouter, GPT, DeepSeek, Groq).

## Features

- Clone and index code repositories (Markdown, source files, READMEs)
- **Dual search**: TF-IDF (offline) or semantic API embeddings (`EMBEDDING_ENABLED=true`)
- RAG-powered answers with source citations
- **SSE streaming** â€” answers appear token by token, with **Stop** button
- **Multi-repository** support with cross-repo search
- **Conversation history** persisted in SQLite
- **Regenerate** last response
- **Copy code** button on all code blocks
- **Dark/light mode** with animated toggle
- **Keyboard shortcuts** (âŒ˜K focus input, Esc toggle)
- **Sidebar resizable** (240px - 500px)
- **Mobile responsive** with slide-over drawer
- **Rate limiting** by IP and API key, input validation, anti-path-traversal
- **API key auth** (configurable via `AUTH_ENABLED=true`)
- **Circuit breaker** for LLM and embedding APIs

## Tech Stack

| Layer | Technology |
|-------|-----------|
| LLM | Any OpenAI-compatible API (OpenRouter, GPT, DeepSeek, Groq) |
| Embeddings | TF-IDF (numpy) or API embeddings (text-embedding-3-small) |
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

| Category | Measure |
|----------|---------|
| **Prompt Injection** | Blocks 20+ injection patterns (`"ignore all instructions"`, `"<\|im_start\|>"`, role redefinition). Context wrapped in XML tags to isolate from system prompt. |
| **Input Validation** | All IDs validated with regex (`[a-f0-9]{8,64}`). URL allowlist. Path traversal blocked (12 patterns). Body size limit 10MB. |
| **Rate Limiting** | 4 tiers per endpoint: light (health 300rpm), medium (list 60rpm), heavy (chat/search 20rpm), expense (clone 5rpm). `Retry-After` and `X-RateLimit-*` headers. Stale bucket cleanup. |
| **Error Handling** | Sanitized errors â€” no stack traces, no raw LLM errors, no internal paths leaked to client. Full tracebacks logged server-side only. |
| **Security Headers** | CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`. |
| **Git Clone** | Disabled hooks (`GIT_TERMINAL_PROMPT=0`, `GIT_ASKPASS=echo`). Symlink detection. Binary file detection. Cleanup in `finally` block. |
| **Logging** | Rotating 10MB/5 backup files. Secrets redaction filter (`sk-*`, `Bearer`, `api_key`). No secrets exposed in logs. |
| **LLM API** | Exponential backoff retry (1s/2s/4s) on 429/502/503/504. Connection pooling with `httpx.Client`. Circuit breaker (opens after 3 failures/30s). Configurable timeouts. |
| **Markdown** | Frontend validates link protocols (`http:`, `https:`, `mailto:` only). `javascript:` and dangerous URLs blocked. |
| **Database** | Parameterized queries (SQL injection immune). WAL mode. Connection timeout. Foreign keys enforced. |
| **Docker** | Non-root `appuser`. `--proxy-headers` enabled. Multi-worker via gunicorn (configurable `WORKERS` env). |
| **CORS** | Configurable via `CORS_ORIGINS` env var. Methods restricted to GET/POST/DELETE. Headers restricted. |
| **API Key Auth** | Optional middleware. Supports `Authorization: Bearer <key>` or `X-API-Key: <key>`. Public paths (health, assets) excluded. |

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

# CORS
CORS_ORIGINS=http://localhost:8000,http://localhost:5173

# Rate limiting (per endpoint tier)
RATE_LIMIT_ENABLED=true
RATE_LIGHT_RPM=300
RATE_MEDIUM_RPM=60
RATE_HEAVY_RPM=20
RATE_EXPENSE_RPM=5
RATE_WINDOW_SECONDS=60

# LLM
LLM_TIMEOUT_SECONDS=60
LLM_STREAM_TIMEOUT_SECONDS=90
LLM_MAX_RETRIES=2
```

## Project Structure

```
docu-chat/
â”œâ”€â”€ backend/
â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”œâ”€â”€ api/              # FastAPI routes (chat, repos)
â”‚   â”‚   â”œâ”€â”€ core/             # Settings, database, config
â”‚   â”‚   â”œâ”€â”€ ingestion/        # Repo cloning, chunking, TF-IDF embedding
â”‚   â”‚   â”œâ”€â”€ rag/              # Search + LLM query + streaming
â”‚   â”‚   â”œâ”€â”€ models/           # Pydantic schemas with validation
â”‚   â”‚   â”œâ”€â”€ utils/            # Logging, exceptions, rate limit, cache
â”‚   â”‚   â””â”€â”€ main.py           # Entry point with middleware
â”‚   â”œâ”€â”€ tests/
â”‚   â”‚   â”œâ”€â”€ test_api.py       # Integration tests (FastAPI)
â”‚   â”‚   â”œâ”€â”€ test_security.py  # Security validation tests
â”‚   â”‚   â”œâ”€â”€ test_embedder.py  # TF-IDF unit tests
â”‚   â”‚   â”œâ”€â”€ test_rag.py       # RAG chain tests
â”‚   â”‚   â””â”€â”€ ...
â”‚   â””â”€â”€ pyproject.toml
â”œâ”€â”€ frontend/
â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”œâ”€â”€ components/       # ChatWindow, Sidebar, Toast, ErrorBoundary
â”‚   â”‚   â”œâ”€â”€ hooks/            # useChat (SSE streaming, AbortController)
â”‚   â”‚   â””â”€â”€ lib/              # API client + SSE stream parser
â”‚   â””â”€â”€ package.json
â””â”€â”€ .env.example
```

## Running Tests

```bash
cd backend
python -m pytest tests/ -v
```

## Roadmap â€” Lo que mÃ¡s subirÃ­a el proyecto

### 1. Demo pÃºblica â­â­â­â­â­
Una demo en vivo (Vercel/Railway) con 1-2 repos pre-indexados para que cualquiera pruebe sin instalar nada. Impacto inmediato en adopciÃ³n.

### 2. Streaming tipo ChatGPT â­â­â­â­â­
Ya implementado (SSE vÃ­a `/api/chat/stream`). Mejora pendiente: abortar generaciÃ³n a mitad de stream, reanudar conversaciones interrumpidas.

### 3. Multi-user + Auth â­â­â­â­
JWT o Clerk/Auth.js. Cada usuario con sus propios repos, conversaciones, y rate limits. Esto lo acerca a SaaS.

### 4. Vector DB seria â­â­â­â­
Migrar de TF-IDF + numpy a Qdrant, Pinecone, Weaviate o pgvector. Ventajas: bÃºsqueda semÃ¡ntica real, filtros avanzados, escalabilidad, multi-tenant nativo.

### 5. Observabilidad â­â­â­
MÃ©tricas (Prometheus), tracing (OpenTelemetry), logs estructurados, dashboard de uso. Esencial para producciÃ³n con mÃºltiples usuarios.
