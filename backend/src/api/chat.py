import json
import uuid
from collections.abc import AsyncGenerator
from typing import Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from src.core import database as db
from src.models.schemas import ChatRequest, ChatResponse, SourceDocument
from src.rag.chain import query, query_stream
from src.utils.exceptions import DocuChatError, LLMError, RepoNotFoundError
from src.utils.logging import setup_logger

logger = setup_logger(__name__)
router = APIRouter(prefix="/api/chat", tags=["chat"])


def _validate_repo(repo_id: str | None) -> None:
    if repo_id:
        repo = db.repo_get(repo_id)
        if repo is None:
            raise RepoNotFoundError(repo_id)
        if repo["status"] != "ready":
            raise DocuChatError(f"Repository {repo_id} is not ready (status: {repo['status']})", 400)


@router.post("/", response_model=ChatResponse)
async def chat(body: ChatRequest) -> ChatResponse:
    conv_id = body.conversation_id or uuid.uuid4().hex[:16]
    _validate_repo(body.repo_id)

    if not body.conversation_id:
        db.conversation_create(conv_id, body.repo_id)
    db.message_add(conv_id, "user", body.question)

    try:
        result = query(body.question, body.repo_id)
    except Exception as e:
        logger.error("LLM query failed: %s", e)
        raise LLMError(str(e)) from e

    sources = [SourceDocument(**s) for s in result["sources"]]
    db.message_add(conv_id, "assistant", result["answer"], [s.model_dump() for s in sources])

    return ChatResponse(
        answer=result["answer"],
        sources=sources,
        repo_name=result["repo_name"],
        conversation_id=conv_id,
    )


@router.post("/stream")
async def chat_stream(body: ChatRequest) -> StreamingResponse:
    conv_id = body.conversation_id or uuid.uuid4().hex[:16]
    _validate_repo(body.repo_id)

    if not body.conversation_id:
        db.conversation_create(conv_id, body.repo_id)
    db.message_add(conv_id, "user", body.question)

    async def generate() -> AsyncGenerator[str, None]:
        full_answer = ""
        try:
            gen = query_stream(body.question, body.repo_id)
            for token in gen:
                if token.startswith('{"__done__":'):
                    try:
                        done_data = json.loads(token)
                        sources = done_data.get("sources", [])
                        db.message_add(conv_id, "assistant", full_answer, sources)
                        done_payload = json.dumps({
                            "done": True, "conv_id": conv_id,
                            "repo_name": done_data.get("repo_name"),
                            "sources": sources,
                        })
                        yield f"data: {done_payload}\n\n"
                    except Exception:
                        pass
                    break
                full_answer += token
                yield f"data: {json.dumps({'token': token, 'conv_id': conv_id})}\n\n"

        except Exception as e:
            logger.error("Stream failed: %s", e)
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.get("/conversations")
async def list_conversations(repo_id: str | None = None) -> list[dict[str, Any]]:
    return db.conversation_list(repo_id)


@router.get("/conversations/{conv_id}")
async def get_conversation(conv_id: str) -> dict[str, Any]:
    messages = db.messages_list(conv_id)
    if not messages:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"id": conv_id, "messages": messages}


@router.delete("/conversations/{conv_id}")
async def delete_conversation(conv_id: str) -> dict[str, str]:
    deleted = db.conversation_delete(conv_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Conversation not found")
    logger.info("Conversation deleted: %s", conv_id)
    return {"message": "Conversation deleted successfully"}


@router.get("/conversations/{conv_id}/export")
async def export_conversation(conv_id: str) -> dict[str, str]:
    messages = db.messages_list(conv_id)
    if not messages:
        raise HTTPException(status_code=404, detail="Conversation not found")

    md_lines = ["# DocuChat Conversation\n\n"]
    for m in messages:
        role = m["role"]
        content = m["content"]
        sources_raw = m.get("sources", "[]")
        sources: list[dict[str, Any]] = []
        if isinstance(sources_raw, str):
            try:
                sources = json.loads(sources_raw)
            except Exception:
                sources = []
        elif isinstance(sources_raw, list):
            sources = sources_raw

        prefix = "**You**" if role == "user" else "**DocuChat**"
        md_lines.append(f"### {prefix}\n\n{content}\n\n")

        if role == "assistant" and sources:
            md_lines.append("**Sources:**\n")
            for s in sources:
                md_lines.append(f"- `{s.get('file_path', 'unknown')}`\n")
            md_lines.append("\n")

        md_lines.append("---\n\n")

    return {"markdown": "".join(md_lines), "conversation_id": conv_id}
