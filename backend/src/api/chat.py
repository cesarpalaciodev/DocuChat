import json
import uuid

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from src.core import database as db
from src.models.schemas import ChatRequest, ChatResponse, SourceDocument
from src.rag.chain import query, query_stream
from src.utils.exceptions import DocuChatError, RepoNotFoundError, LLMError
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
async def chat_stream(body: ChatRequest):
    conv_id = body.conversation_id or uuid.uuid4().hex[:16]
    _validate_repo(body.repo_id)

    if not body.conversation_id:
        db.conversation_create(conv_id, body.repo_id)
    db.message_add(conv_id, "user", body.question)

    async def generate():
        full_answer = ""
        try:
            gen = query_stream(body.question, body.repo_id)
            for token in gen:
                if token.startswith('{"__done__":'):
                    try:
                        done_data = json.loads(token)
                        sources = done_data.get("sources", [])
                        db.message_add(conv_id, "assistant", full_answer, sources)
                        yield f"data: {json.dumps({'done': True, 'conv_id': conv_id, 'repo_name': done_data.get('repo_name'), 'sources': sources})}\n\n"
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
async def list_conversations(repo_id: str | None = None) -> list[dict]:
    return db.conversation_list(repo_id)


@router.get("/conversations/{conv_id}")
async def get_conversation(conv_id: str) -> dict:
    messages = db.messages_list(conv_id)
    if not messages:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"id": conv_id, "messages": messages}
