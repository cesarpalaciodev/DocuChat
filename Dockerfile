FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/package.json .
RUN npm install
COPY frontend/ .
RUN npm run build

FROM python:3.11-slim

RUN apt-get update -qq && apt-get install -y -qq git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN groupadd -r appuser && useradd -r -g appuser -d /app appuser

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

COPY backend/ .

COPY --from=frontend-build /app/frontend/dist /app/static

RUN pip install --no-cache-dir gunicorn
RUN chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

ENV WORKERS=${WORKERS:-1}
ENV PORT=${PORT:-8000}

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:${PORT}/api/health')"

CMD ["sh", "-c", "if [ \"$WORKERS\" = \"1\" ]; then exec uvicorn src.main:app --host 0.0.0.0 --port $PORT --proxy-headers --forwarded-allow-ips '*'; else exec gunicorn src.main:app --workers $WORKERS --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --proxy-headers --forwarded-allow-ips '*'; fi"]
