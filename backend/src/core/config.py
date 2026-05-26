from pathlib import Path
from urllib.parse import urlparse

from pydantic import field_validator
from pydantic_settings import BaseSettings


def _validate_url(value: str) -> str:
    try:
        parsed = urlparse(value)
        if parsed.scheme not in ("http", "https"):
            raise ValueError("URL must use http or https scheme")
        if not parsed.hostname:
            raise ValueError("URL must have a valid hostname")
    except ValueError:
        raise
    except Exception:
        raise ValueError("Invalid URL format") from None
    return value.rstrip("/")


class Settings(BaseSettings):
    llm_api_key: str = ""
    llm_base_url: str = "https://api.openai.com/v1"
    llm_model: str = "gpt-4o-mini"
    embedding_model: str = "text-embedding-3-small"
    embedding_enabled: bool = False
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

    cors_origins: str = "http://localhost:8000,http://localhost:5173"

    auth_enabled: bool = False
    api_key: str = ""

    rate_limit_enabled: bool = True
    rate_light_rpm: int = 300
    rate_medium_rpm: int = 60
    rate_heavy_rpm: int = 20
    rate_expense_rpm: int = 5
    rate_window_seconds: int = 60

    llm_timeout_seconds: int = 60
    llm_stream_timeout_seconds: int = 90
    llm_max_retries: int = 2

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @field_validator("llm_api_key")
    @classmethod
    def key_not_empty(cls, v: str) -> str:
        placeholders = ("tu_key", "tu_api", "gsk_your", "sk-or-v1-PON", "sk-your")
        if not v or any(v.startswith(p) for p in placeholders):
            raise ValueError("LLM_API_KEY must be a real API key")
        return v

    @field_validator("llm_base_url")
    @classmethod
    def validate_llm_url(cls, v: str) -> str:
        return _validate_url(v)

    @field_validator("llm_model")
    @classmethod
    def model_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("LLM_MODEL must not be empty")
        return v.strip()

    @field_validator("chunk_size")
    @classmethod
    def chunk_size_valid(cls, v: int) -> int:
        if v < 100 or v > 10000:
            raise ValueError("CHUNK_SIZE must be between 100 and 10000")
        return v

    @field_validator("chunk_overlap")
    @classmethod
    def overlap_valid(cls, v: int) -> int:
        if v < 0:
            raise ValueError("CHUNK_OVERLAP must be >= 0")
        return v

    @field_validator("retrieval_k")
    @classmethod
    def retrieval_k_valid(cls, v: int) -> int:
        if v < 1 or v > 20:
            raise ValueError("RETRIEVAL_K must be between 1 and 20")
        return v

    @field_validator("host")
    @classmethod
    def host_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("HOST must not be empty")
        return v.strip()

    @field_validator("port")
    @classmethod
    def port_valid(cls, v: int) -> int:
        if v < 1 or v > 65535:
            raise ValueError("PORT must be between 1 and 65535")
        return v

    @field_validator("max_total_chunks")
    @classmethod
    def max_chunks_valid(cls, v: int) -> int:
        if v < 100 or v > 200_000:
            raise ValueError("MAX_TOTAL_CHUNKS must be between 100 and 200000")
        return v

    @field_validator("max_file_size")
    @classmethod
    def max_file_size_valid(cls, v: int) -> int:
        if v < 1000 or v > 10_000_000:
            raise ValueError("MAX_FILE_SIZE must be between 1000 and 10000000")
        return v

    @field_validator("clone_timeout_seconds")
    @classmethod
    def timeout_valid(cls, v: int) -> int:
        if v < 5 or v > 600:
            raise ValueError("CLONE_TIMEOUT_SECONDS must be between 5 and 600")
        return v

    @field_validator("max_concurrent_clones")
    @classmethod
    def concurrent_clones_valid(cls, v: int) -> int:
        if v < 1 or v > 10:
            raise ValueError("MAX_CONCURRENT_CLONES must be between 1 and 10")
        return v

    @field_validator("llm_timeout_seconds")
    @classmethod
    def llm_timeout_valid(cls, v: int) -> int:
        if v < 10 or v > 300:
            raise ValueError("LLM_TIMEOUT_SECONDS must be between 10 and 300")
        return v

    @field_validator("llm_max_retries")
    @classmethod
    def llm_retries_valid(cls, v: int) -> int:
        if v < 0 or v > 5:
            raise ValueError("LLM_MAX_RETRIES must be between 0 and 5")
        return v

    @property
    def allowed_host_list(self) -> list[str]:
        return [h.strip().lower() for h in self.allowed_hosts.split(",") if h.strip()]

    @property
    def cors_origin_list(self) -> list[str]:
        return [h.strip().lower() for h in self.cors_origins.split(",") if h.strip()]

    @property
    def vector_store_path(self) -> Path:
        return Path(self.vector_store_dir)

    @property
    def clone_path(self) -> Path:
        return Path(self.clone_dir)


settings = Settings()
