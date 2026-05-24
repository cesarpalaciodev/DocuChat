from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    llm_api_key: str = ""
    llm_base_url: str = "https://api.openai.com/v1"
    llm_model: str = "gpt-4o-mini"
    vector_store_dir: str = "data/vectors"
    clone_dir: str = "data/cloned_repos"
    chunk_size: int = 1000
    chunk_overlap: int = 200
    retrieval_k: int = 4
    host: str = "0.0.0.0"
    port: int = 8000

    allowed_hosts: str = "github.com,gitlab.com,bitbucket.org"
    max_total_chunks: int = 20000
    max_file_size: int = 500_000
    clone_timeout_seconds: int = 60
    max_concurrent_clones: int = 3

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @field_validator("llm_api_key")
    @classmethod
    def key_not_empty(cls, v: str) -> str:
        if not v or v.startswith("tu_key") or v.startswith("gsk_your") or v.startswith("sk-or-v1-PON"):
            raise ValueError("LLM_API_KEY must be a real API key")
        return v

    @field_validator("chunk_size")
    @classmethod
    def chunk_size_valid(cls, v: int) -> int:
        if v < 100 or v > 10000:
            raise ValueError("CHUNK_SIZE must be between 100 and 10000")
        return v

    @property
    def allowed_host_list(self) -> list[str]:
        return [h.strip().lower() for h in self.allowed_hosts.split(",") if h.strip()]

    @property
    def vector_store_path(self) -> Path:
        return Path(self.vector_store_dir)

    @property
    def clone_path(self) -> Path:
        return Path(self.clone_dir)


settings = Settings()
