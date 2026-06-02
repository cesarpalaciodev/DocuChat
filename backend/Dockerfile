FROM python:3.11-slim

WORKDIR /app

RUN groupadd -r appuser && useradd -r -g appuser -d /app appuser

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

COPY . .

RUN chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

ENV WORKERS=${WORKERS:-2}

CMD ["sh", "-c", "if [ \"$WORKERS\" = \"1\" ]; then exec uvicorn src.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips '*'; else exec gunicorn src.main:app --workers $WORKERS --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 --proxy-headers --forwarded-allow-ips '*'; fi"]
