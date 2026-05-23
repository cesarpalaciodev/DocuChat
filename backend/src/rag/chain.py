import json
from typing import Any, Generator

import httpx

from src.core.config import settings
from src.ingestion.indexer import vector_store
from src.utils.exceptions import LLMError
from src.utils.logging import setup_logger

logger = setup_logger(__name__)

SYSTEM_PROMPT = """Eres un asistente experto en documentacion tecnica. Responde preguntas basandote
EXCLUSIVAMENTE en el contexto proporcionado de la documentacion del repositorio de codigo.

Reglas:
1. Si la respuesta no esta en el contexto, di claramente que no tienes esa informacion.
2. Cita las fuentes (archivo) cuando uses informacion especifica.
3. Se conciso y tecnico. Usa fragmentos de codigo cuando sea util.
4. Responde en el mismo idioma de la pregunta.
"""


def _build_context(docs: list[dict[str, Any]]) -> str:
    parts = []
    for i, doc in enumerate(docs):
        file_path = doc["metadata"].get("file_path", "unknown")
        parts.append(f"[Source {i + 1}: {file_path}]\n{doc['content']}")
    return "\n\n---\n\n".join(parts)


def _collect_sources(retrieved: list[dict[str, Any]]) -> list[dict[str, str]]:
    sources = []
    seen = set()
    for doc in retrieved:
        fp = doc["metadata"].get("file_path", "unknown")
        if fp not in seen:
            seen.add(fp)
            sources.append({
                "file_path": fp,
                "content_snippet": doc["content"][:200] + "...",
            })
    return sources


def query(question: str, repo_id: str | None = None) -> dict[str, Any]:
    retrieved = vector_store.search(question, repo_id, settings.retrieval_k)
    logger.info("Query: %s (repo=%s, results=%d)", question[:80], repo_id, len(retrieved))

    context = _build_context(retrieved)
    url = f"{settings.llm_base_url.rstrip('/')}/chat/completions"

    logger.debug("Calling LLM: %s", url)
    with httpx.Client(timeout=60) as client:
        resp = client.post(
            url,
            headers={
                "Authorization": f"Bearer {settings.llm_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.llm_model,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": f"Contexto:\n{context}\n\nPregunta: {question}"},
                ],
                "temperature": 0.2,
                "max_tokens": 2048,
            },
        )
        if resp.status_code != 200:
            err_detail = resp.text[:300]
            logger.error("LLM API error %s: %s", resp.status_code, err_detail)
            raise LLMError(f"HTTP {resp.status_code}: {err_detail}")
        data = resp.json()

    answer = data["choices"][0]["message"]["content"]
    logger.debug("LLM response: %d chars", len(answer))

    sources = _collect_sources(retrieved)
    repo_name = retrieved[0]["metadata"].get("repo_name") if retrieved else None

    return {"answer": answer, "sources": sources, "repo_name": repo_name}


def query_stream(question: str, repo_id: str | None = None) -> Generator[str, None, None]:
    retrieved = vector_store.search(question, repo_id, settings.retrieval_k)
    logger.info("Stream query: %s (repo=%s, results=%d)", question[:80], repo_id, len(retrieved))

    context = _build_context(retrieved)
    url = f"{settings.llm_base_url.rstrip('/')}/chat/completions"

    with httpx.Client(timeout=90) as client:
        with client.stream(
            "POST",
            url,
            headers={
                "Authorization": f"Bearer {settings.llm_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.llm_model,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": f"Contexto:\n{context}\n\nPregunta: {question}"},
                ],
                "temperature": 0.2,
                "max_tokens": 2048,
                "stream": True,
            },
        ) as resp:
            if resp.status_code != 200:
                err_detail = resp.text[:300]
                logger.error("LLM stream error %s: %s", resp.status_code, err_detail)
                raise LLMError(f"HTTP {resp.status_code}: {err_detail}")

            for line in resp.iter_lines():
                if line.startswith("data: "):
                    data_str = line[6:]
                    if data_str == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data_str)
                        delta = chunk.get("choices", [{}])[0].get("delta", {})
                        content = delta.get("content", "")
                        if content:
                            yield content
                    except Exception:
                        continue

    sources = _collect_sources(retrieved)
    repo_name = retrieved[0]["metadata"].get("repo_name") if retrieved else None

    yield json.dumps({"__done__": True, "sources": sources, "repo_name": repo_name})
