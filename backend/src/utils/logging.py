import logging
import re
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path

LOG_DIR = Path("logs")
LOG_DIR.mkdir(exist_ok=True)

_MAX_BYTES = 10 * 1024 * 1024
_BACKUP_COUNT = 5

_SECRET_PATTERNS = re.compile(
    r"(sk-[a-zA-Z0-9_-]{20,})"
    r"|(Bearer\s+[a-zA-Z0-9_\-.+/=]{20,})"
    r"|(token[=:]\s*[a-zA-Z0-9_\-.+/=]{10,})"
    r"|(api[_-]?key[=:]\s*[a-zA-Z0-9_\-.+/=]{10,})",
    re.IGNORECASE,
)


class SecretsRedactionFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.msg = _SECRET_PATTERNS.sub("***REDACTED***", str(record.msg))
        if record.args:
            record.args = tuple(
                _SECRET_PATTERNS.sub("***REDACTED***", str(a)) for a in record.args
            )
        return True


def setup_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)

    if logger.handlers:
        return logger

    logger.setLevel(logging.DEBUG)

    fmt = logging.Formatter(
        "%(asctime)s | %(levelname)-7s | %(name)-20s | %(message)s",
        datefmt="%H:%M:%S",
    )

    console = logging.StreamHandler(sys.stdout)
    console.setLevel(logging.INFO)
    console.setFormatter(fmt)
    logger.addHandler(console)

    file_handler = RotatingFileHandler(
        LOG_DIR / "docu-chat.log",
        encoding="utf-8",
        maxBytes=_MAX_BYTES,
        backupCount=_BACKUP_COUNT,
    )
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(fmt)
    logger.addHandler(file_handler)

    redaction_filter = SecretsRedactionFilter()
    logger.addFilter(redaction_filter)

    return logger
