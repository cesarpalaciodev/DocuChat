class DocuChatError(Exception):
    def __init__(self, message: str, status_code: int = 500) -> None:
        super().__init__(message)
        self.status_code = status_code


class RepoCloneError(DocuChatError):
    def __init__(self, url: str, detail: str = "") -> None:
        super().__init__(f"Failed to clone {url}: {detail}", 400)


class RepoNotFoundError(DocuChatError):
    def __init__(self, repo_id: str) -> None:
        super().__init__("Repository not found", 404)


class IndexingError(DocuChatError):
    def __init__(self, repo_id: str, detail: str = "") -> None:
        super().__init__(f"Indexing failed for {repo_id}: {detail}", 500)


class LLMError(DocuChatError):
    def __init__(self, detail: str = "") -> None:
        super().__init__(f"LLM API error: {detail}", 502)


class ValidationError(DocuChatError):
    def __init__(self, detail: str) -> None:
        super().__init__(detail, 422)
