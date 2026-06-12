# DocuChat — RAG Chatbot for Technical Documentation

[![Python](https://img.shields.io/badge/python-3.11+-blue)](https://www.python.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.6-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/react-18-61DAFB)](https://react.dev/)
[![Tests](https://img.shields.io/badge/tests-39%20passing-green)](./backend/tests/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](./LICENSE)
[![CI](https://github.com/cesarpalaciodev/DocuChat/actions/workflows/test.yml/badge.svg)](https://github.com/cesarpalaciodev/DocuChat/actions/workflows/test.yml)
[![Lint](https://github.com/cesarpalaciodev/DocuChat/actions/workflows/lint.yml/badge.svg)](https://github.com/cesarpalaciodev/DocuChat/actions/workflows/lint.yml)
[![Docker](https://github.com/cesarpalaciodev/DocuChat/actions/workflows/docker.yml/badge.svg)](https://github.com/cesarpalaciodev/DocuChat/actions/workflows/docker.yml)
[![FastAPI](https://img.shields.io/badge/fastapi-0.115-009688)](https://fastapi.tiangolo.com/)
[![Docker](https://img.shields.io/badge/docker-ready-2496ED)](./Dockerfile)

Chatbot with Retrieval-Augmented Generation (RAG) for querying technical documentation from code repositories. Clone any GitHub/GitLab repo, index its docs, and ask questions in natural language — with **source citations** in every answer.

**How it works:**
1. **Register** — create an account (each user has private repos and conversations)
2. **Settings** — connect your own LLM API key (OpenRouter, Groq, or OpenAI)
3. **Clone a repo** via the sidebar
4. **Ask questions** — answers stream token by token with source file citations

**You bring your own API key** — the server owner pays nothing for LLM usage. Your key is never stored on the server.

## Features

### Core

- **Clone & index repos** — paste any Git URL, DocuChat clones it, chunks all text files, and builds a vector index
- **Dual search**: TF-IDF (offline, no GPU) or semantic API embeddings (`text-embedding-3-small`)
- **RAG answers with citations** — every response links to the exact files used as context
- **SSE streaming** — answers arrive token by token, with cancel button
- **Multi-repo search** — query across all indexed repos or filter by one

### Multi-tenant

- **User accounts** — register/login with JWT authentication
- **Bring your own API key** — each user configures their own LLM key in Settings (Ctrl+\). Never stored on the server
- **Per-user isolation** — repos, conversations, and messages are private per account
- **Server key optional** — LLM_API_KEY only needed for health check monitoring

### UI/UX

- **Terminal cyberpunk aesthetic** — glass morphism, neon borders, glitch text, particle background, CRT scanlines
- **Command Palette** (Ctrl+K) — search repos, conversations, and actions instantly
- **Chat tabs** — multiple conversation threads like terminal tabs
- **Source panel** — click a file path to see the full source code
- **Dark/Light mode** — toggle in the status bar
- **Keyboard shortcuts** — Ctrl+K palette, Ctrl+B sidebar, ? help, Ctrl+\ settings, Ctrl+Shift+Z zen mode
- **Drag & drop** — drag a GitHub URL onto the sidebar to clone
- **Help modal** — in-app documentation, API key guide, feature list, shortcuts reference
- **Resizable sidebar** — horizontal and vertical resize handles
- **Mobile responsive** — sidebar slides as a drawer on small screens. Full-screen modals. Compact touch-friendly input.
- **Zen mode** — hide everything except the chat for deep focus

### Technical

- **Prompt injection defense** — blocks 20+ attack patterns, context wrapped in XML tags
- **Rate limiting** — 4 tiers per endpoint (light/medium/heavy/expense), per-IP and per-key
- **Security headers** — CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- **Circuit breaker** — LLM and embedding APIs with exponential backoff retry
- **Job queue** — bounded semaphore for concurrent repository indexing
- **Graceful shutdown** — SIGINT/SIGTERM handlers, proper cleanup
- **Health checks** — database, vector store, LLM connectivity, disk space

## Quick Start

### Online (Railway)

1. Open the app URL (e.g. `https://docuchat.up.railway.app`)
2. **Register** — create an account with username and password
3. Press **Ctrl+\** (or click the gear icon) to open Settings
4. **Paste your API key** from OpenRouter, Groq, or OpenAI
5. Click **Test** — once validated, click **Save**
6. **Clone a repo** — paste a GitHub/GitLab URL in the sidebar
7. **Ask a question** — type in the chat input and press Enter

### Local Development

```bash
cd docu-chat

# 1. Configure environment
cp .env.example .env
# Edit .env — LLM_API_KEY is only for admin health check

# 2. Install backend
cd backend
pip install -r requirements.txt

# 3. Build frontend
cd ../frontend
npm install
npm run build
mkdir -p ../backend/static
cp -r dist/* ../backend/static/

# 4. Run
cd ../backend
uvicorn src.main:app --host 0.0.0.0 --port 8000
```

Open **http://localhost:8000**

### Docker

```bash
docker build -t docuchat .
docker run -p 8000:8000 --env-file .env -v docuchat_data:/app/data docuchat
```

## Deploy to Railway

1. Fork/push to GitHub
2. Create project at [railway.app](https://railway.app) → "Deploy from GitHub repo"
3. Add environment variables (see `.env.production`)
4. Create a volume mounted at `/app/data` for persistent SQLite
5. Done — public HTTPS URL in 2 minutes

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | Public | Create account |
| POST | `/api/auth/login` | Public | Login, returns JWT |
| GET | `/api/auth/me` | Required | Current user info |
| POST | `/api/repos/` | Required | Clone and index a repo |
| GET | `/api/repos/` | Required | List indexed repos |
| GET | `/api/repos/{id}/status` | Required | Poll indexing progress |
| GET | `/api/repos/queue/status` | Required | Job queue state |
| DELETE | `/api/repos/{id}` | Required | Remove a repo |
| POST | `/api/chat/` | Required | Ask a question (RAG) |
| POST | `/api/chat/stream` | Required | Ask with SSE streaming |
| GET | `/api/chat/conversations` | Required | List conversations |
| GET | `/api/chat/conversations/{id}` | Required | Get conversation |
| DELETE | `/api/chat/conversations/{id}` | Required | Delete conversation |
| GET | `/api/chat/conversations/{id}/export` | Required | Export as markdown |
| POST | `/api/search/` | Required | Raw search without LLM |
| GET | `/api/stats` | Public | System statistics |
| GET | `/api/health` | Public | Health check |
| POST | `/api/validate-key` | Public | Test an API key |

Authentication: `Authorization: Bearer <jwt-token>` header.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | **Yes** | — | HMAC key for JWT tokens. Generate with `secrets.token_hex(32)` |
| `AUTH_ENABLED` | No | `false` | Enable user registration/login |
| `LLM_API_KEY` | No | — | Server key (only used for health check, not user requests) |
| `LLM_BASE_URL` | No | `https://openrouter.ai/api/v1` | Default LLM API endpoint |
| `LLM_MODEL` | No | `meta-llama/llama-3-8b-instruct` | Default model |
| `CORS_ORIGINS` | No | `localhost:8000,localhost:5173` | Allowed origins |
| `ALLOWED_HOSTS` | No | `github.com,gitlab.com,bitbucket.org` | Git hosts allowed for cloning |
| `RATE_LIMIT_ENABLED` | No | `true` | Enable rate limiting |
| `WORKERS` | No | `1` | Gunicorn workers. Keep at 1 for in-memory rate limiting |
| `PORT` | No | `8000` | Server port |

### Security

| Category | Measure |
|----------|---------|
| **Prompt Injection** | Blocks 20+ injection patterns (`"ignore all instructions"`, `"<|im_start|>"`, role redefinition). Context wrapped in XML tags. |
| **Input Validation** | All IDs validated (`[a-f0-9]{8,64}`). URL allowlist. Path traversal blocked (12 patterns). Body size limit 10MB. |
| **Rate Limiting** | 4 tiers per endpoint. `Retry-After` + `X-RateLimit-*` headers. Stale bucket cleanup. |
| **Error Handling** | Sanitized errors — no stack traces, no internal paths, no raw LLM errors. |
| **HTTP Headers** | CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`. |
| **Git Clone** | Disabled hooks. Symlink detection. Binary file detection. Cleanup in `finally`. |
| **Logging** | Rotating files. Secrets redaction (`sk-*`, `Bearer`, `api_key`). |
| **LLM** | Exponential backoff retry. Connection pooling. Circuit breaker (3 failures/30s). |
| **Database** | Parameterized queries. WAL mode. Foreign keys. |
| **Docker** | Non-root `appuser`. `--proxy-headers` enabled. Healthcheck. |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11+ · FastAPI · Uvicorn · SQLite · NumPy · httpx |
| Frontend | React 18 · TypeScript 5.6 · Tailwind CSS 3 · Vite 6 |
| LLM | Any OpenAI-compatible API (OpenRouter, Groq, DeepSeek, GPT) |
| Vector Store | Numpy `.npz` sharded by 2000 vectors |
| Auth | JWT (HMAC-SHA256, no external dependencies) |
| Deploy | Docker multi-stage · Railway-ready |
| CI | GitHub Actions (test + lint + Docker build) |

## Project Structure

```
docu-chat/
├── backend/
│   ├── src/
│   │   ├── api/             # FastAPI routes (chat, repos, auth)
│   │   ├── core/            # Settings, database, config
│   │   ├── ingestion/       # Cloning, chunking, embedding, job queue
│   │   ├── rag/             # Search + LLM query + streaming + key validation
│   │   ├── models/          # Pydantic schemas
│   │   ├── utils/           # Logging, auth middleware, rate limit, cache, headers
│   │   └── main.py          # Entry point
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── components/      # ChatWindow, Sidebar, CommandPalette, AuthModal, ...
│   │   ├── hooks/           # useChat (SSE streaming)
│   │   └── lib/             # API client, auth, user keys
│   └── tests/               # Vitest setup
├── Dockerfile               # Multi-stage production build
├── .env.example
└── .env.production          # Railway-ready environment template
```

## Running Tests

```bash
cd backend
python -m pytest tests/ -v --ignore=tests/test_api.py

# Frontend
cd frontend
npx vitest run
```

## License

MIT — see [LICENSE](LICENSE).
