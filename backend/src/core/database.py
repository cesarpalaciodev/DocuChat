import json
import sqlite3
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from src.utils.logging import setup_logger

logger = setup_logger(__name__)

DB_PATH = Path("data/docuchat.db")


def get_db() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    _init_tables(conn)
    return conn


def _init_tables(conn: sqlite3.Connection) -> None:
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS repos (
            id TEXT PRIMARY KEY,
            url TEXT NOT NULL,
            name TEXT NOT NULL,
            branch TEXT DEFAULT 'main',
            indexed_documents INTEGER DEFAULT 0,
            status TEXT DEFAULT 'indexing',
            error TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            repo_id TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (repo_id) REFERENCES repos(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
            content TEXT NOT NULL,
            sources TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_repos_status ON repos(status);
        CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);
    """)
    conn.commit()
    logger.debug("Database tables initialized")


def repo_create(repo_id: str, url: str, name: str, branch: str) -> None:
    conn = get_db()
    conn.execute(
        "INSERT INTO repos (id, url, name, branch, status, created_at) VALUES (?, ?, ?, ?, 'indexing', ?)",
        (repo_id, url, name, branch, datetime.now(UTC).isoformat()),
    )
    conn.commit()
    conn.close()
    logger.info("Repo created: %s (%s)", name, repo_id)


def repo_update(repo_id: str, status: str, indexed_documents: int = 0, error: str | None = None) -> None:
    conn = get_db()
    conn.execute(
        "UPDATE repos SET status = ?, indexed_documents = ?, error = ? WHERE id = ?",
        (status, indexed_documents, error, repo_id),
    )
    conn.commit()
    conn.close()
    logger.info("Repo updated: %s -> %s (%d chunks)", repo_id, status, indexed_documents)


def repo_list() -> list[dict[str, Any]]:
    conn = get_db()
    rows = conn.execute("SELECT * FROM repos ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def repo_get(repo_id: str) -> dict[str, Any] | None:
    conn = get_db()
    row = conn.execute("SELECT * FROM repos WHERE id = ?", (repo_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def repo_delete(repo_id: str) -> bool:
    conn = get_db()
    cursor = conn.execute("DELETE FROM repos WHERE id = ?", (repo_id,))
    conn.commit()
    deleted = cursor.rowcount > 0
    conn.close()
    return deleted


def conversation_create(conversation_id: str, repo_id: str | None) -> None:
    conn = get_db()
    conn.execute(
        "INSERT INTO conversations (id, repo_id, created_at) VALUES (?, ?, ?)",
        (conversation_id, repo_id, datetime.now(UTC).isoformat()),
    )
    conn.commit()
    conn.close()


def conversation_list(repo_id: str | None = None) -> list[dict[str, Any]]:
    conn = get_db()
    if repo_id:
        rows = conn.execute(
            "SELECT * FROM conversations WHERE repo_id = ? ORDER BY created_at DESC", (repo_id,)
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM conversations ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def message_add(conversation_id: str, role: str, content: str, sources: list[dict[str, object]] | None = None) -> int:
    conn = get_db()
    cursor = conn.execute(
        "INSERT INTO messages (conversation_id, role, content, sources, created_at) VALUES (?, ?, ?, ?, ?)",
        (conversation_id, role, content, json.dumps(sources or []), datetime.now(UTC).isoformat()),
    )
    conn.commit()
    msg_id = cursor.lastrowid
    conn.close()
    return msg_id or 0


def messages_list(conversation_id: str) -> list[dict[str, Any]]:
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM messages WHERE conversation_id = ? ORDER BY id ASC", (conversation_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]
