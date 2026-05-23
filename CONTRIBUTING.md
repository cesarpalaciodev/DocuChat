# Contributing to DocuChat

## Setup

```bash
# Clone
git clone https://github.com/cesarpalaciodev/DocuChat.git
cd DocuChat

# Backend
cd backend
pip install -r requirements.txt
cp ../.env.example .env
# Edit .env with your LLM_API_KEY

# Frontend
cd ../frontend
npm install
npm run build
cp -r dist/* ../backend/static/

# Run
cd ../backend
uvicorn src.main:app --host 0.0.0.0 --port 8000
```

## Running Tests

```bash
cd backend
python -m pytest tests/ -v
```

## Code Quality

```bash
cd backend
ruff check src/
mypy src/ --ignore-missing-imports
```

## Pull Requests

1. Create a feature branch
2. Make your changes
3. Ensure tests pass (`pytest tests/`)
4. Ensure linting passes (`ruff check src/`)
5. Open a PR against `main`
