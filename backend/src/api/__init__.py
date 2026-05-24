from fastapi import APIRouter

from src.api.chat import router as chat_router
from src.api.repos import router as repos_router
from src.api.search import router as search_router

api_router = APIRouter()
api_router.include_router(chat_router)
api_router.include_router(repos_router)
api_router.include_router(search_router)
