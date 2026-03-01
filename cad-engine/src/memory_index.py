"""Memory Index — CC-MS7.

SQLite FTS5 search index for all PRISM knowledge (CAD, CAM, SHOP domains).
Supports full-text search, tag/domain/material/machine/confidence filtering.
"""

from __future__ import annotations

import json
import os
import sqlite3
import time
from dataclasses import dataclass, field
from typing import Optional


# ---------------------------------------------------------------------------
# Data paths
# ---------------------------------------------------------------------------

_CAD_ENGINE_ROOT = os.path.dirname(os.path.dirname(__file__))
_MEMORY_DIR = os.path.join(_CAD_ENGINE_ROOT, "data", "memory")
_DEFAULT_DB = os.path.join(_MEMORY_DIR, "knowledge.db")

# Domain constants
DOMAINS = ["cad", "cam", "shop"]


# ---------------------------------------------------------------------------
# Dataclass
# ---------------------------------------------------------------------------

@dataclass
class MemoryEntry:
    """A single knowledge entry in the memory index."""

    entry_id: str
    domain: str  # "cad", "cam", "shop"
    category: str  # e.g. "cutting_practices", "material_tips", "trouble_trees"
    title: str
    content: str
    tags: list[str] = field(default_factory=list)
    materials: list[str] = field(default_factory=list)
    machines: list[str] = field(default_factory=list)
    confidence: float = 0.5
    source_id: str = ""
    source_type: str = ""  # "video", "document", "manual", "computed"
    version: int = 1
    created_at: str = ""
    updated_at: str = ""
    archived: bool = False

    def to_dict(self) -> dict:
        return {
            "entry_id": self.entry_id,
            "domain": self.domain,
            "category": self.category,
            "title": self.title,
            "content": self.content,
            "tags": self.tags,
            "materials": self.materials,
            "machines": self.machines,
            "confidence": self.confidence,
            "source_id": self.source_id,
            "source_type": self.source_type,
            "version": self.version,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "archived": self.archived,
        }

    @classmethod
    def from_dict(cls, d: dict) -> MemoryEntry:
        return cls(
            entry_id=d["entry_id"],
            domain=d["domain"],
            category=d["category"],
            title=d["title"],
            content=d["content"],
            tags=d.get("tags", []),
            materials=d.get("materials", []),
            machines=d.get("machines", []),
            confidence=d.get("confidence", 0.5),
            source_id=d.get("source_id", ""),
            source_type=d.get("source_type", ""),
            version=d.get("version", 1),
            created_at=d.get("created_at", ""),
            updated_at=d.get("updated_at", ""),
            archived=d.get("archived", False),
        )

    @classmethod
    def from_row(cls, row: sqlite3.Row) -> MemoryEntry:
        return cls(
            entry_id=row["entry_id"],
            domain=row["domain"],
            category=row["category"],
            title=row["title"],
            content=row["content"],
            tags=json.loads(row["tags"]) if row["tags"] else [],
            materials=json.loads(row["materials"]) if row["materials"] else [],
            machines=json.loads(row["machines"]) if row["machines"] else [],
            confidence=row["confidence"],
            source_id=row["source_id"] or "",
            source_type=row["source_type"] or "",
            version=row["version"],
            created_at=row["created_at"] or "",
            updated_at=row["updated_at"] or "",
            archived=bool(row["archived"]),
        )


# ---------------------------------------------------------------------------
# MemoryIndex
# ---------------------------------------------------------------------------

# SQL for creating tables
_CREATE_ENTRIES = """
CREATE TABLE IF NOT EXISTS entries (
    entry_id   TEXT PRIMARY KEY,
    domain     TEXT NOT NULL,
    category   TEXT NOT NULL,
    title      TEXT NOT NULL,
    content    TEXT NOT NULL,
    tags       TEXT DEFAULT '[]',
    materials  TEXT DEFAULT '[]',
    machines   TEXT DEFAULT '[]',
    confidence REAL DEFAULT 0.5,
    source_id  TEXT DEFAULT '',
    source_type TEXT DEFAULT '',
    version    INTEGER DEFAULT 1,
    created_at TEXT DEFAULT '',
    updated_at TEXT DEFAULT '',
    archived   INTEGER DEFAULT 0
)
"""

_CREATE_FTS = """
CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(
    entry_id,
    title,
    content,
    tags,
    materials,
    machines,
    domain,
    category,
    content='entries',
    content_rowid='rowid',
    tokenize='porter unicode61'
)
"""

_CREATE_FTS_TRIGGERS = """
CREATE TRIGGER IF NOT EXISTS entries_ai AFTER INSERT ON entries BEGIN
    INSERT INTO entries_fts(rowid, entry_id, title, content, tags, materials, machines, domain, category)
    VALUES (new.rowid, new.entry_id, new.title, new.content, new.tags, new.materials, new.machines, new.domain, new.category);
END;

CREATE TRIGGER IF NOT EXISTS entries_ad AFTER DELETE ON entries BEGIN
    INSERT INTO entries_fts(entries_fts, rowid, entry_id, title, content, tags, materials, machines, domain, category)
    VALUES ('delete', old.rowid, old.entry_id, old.title, old.content, old.tags, old.materials, old.machines, old.domain, old.category);
END;

CREATE TRIGGER IF NOT EXISTS entries_au AFTER UPDATE ON entries BEGIN
    INSERT INTO entries_fts(entries_fts, rowid, entry_id, title, content, tags, materials, machines, domain, category)
    VALUES ('delete', old.rowid, old.entry_id, old.title, old.content, old.tags, old.materials, old.machines, old.domain, old.category);
    INSERT INTO entries_fts(rowid, entry_id, title, content, tags, materials, machines, domain, category)
    VALUES (new.rowid, new.entry_id, new.title, new.content, new.tags, new.materials, new.machines, new.domain, new.category);
END;
"""

_CREATE_HISTORY = """
CREATE TABLE IF NOT EXISTS entry_history (
    history_id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id   TEXT NOT NULL,
    version    INTEGER NOT NULL,
    content    TEXT NOT NULL,
    changed_at TEXT NOT NULL,
    change_type TEXT NOT NULL
)
"""


class MemoryIndex:
    """SQLite FTS5-backed knowledge memory index."""

    def __init__(self, db_path: str = _DEFAULT_DB):
        self._db_path = db_path
        self._conn: Optional[sqlite3.Connection] = None

    def open(self) -> None:
        """Open or create the database."""
        os.makedirs(os.path.dirname(self._db_path), exist_ok=True)
        self._conn = sqlite3.connect(self._db_path)
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA journal_mode=WAL")
        self._conn.execute("PRAGMA synchronous=NORMAL")
        self._init_schema()

    def close(self) -> None:
        """Close the database connection."""
        if self._conn:
            self._conn.close()
            self._conn = None

    @property
    def conn(self) -> sqlite3.Connection:
        if self._conn is None:
            raise RuntimeError("MemoryIndex not opened. Call open() first.")
        return self._conn

    def _init_schema(self) -> None:
        """Create tables and FTS index if they don't exist."""
        c = self.conn
        c.execute(_CREATE_ENTRIES)
        c.execute(_CREATE_FTS)
        c.executescript(_CREATE_FTS_TRIGGERS)
        c.execute(_CREATE_HISTORY)
        c.commit()

    # -------------------------------------------------------------------
    # Insert / Update
    # -------------------------------------------------------------------

    def upsert(self, entry: MemoryEntry) -> None:
        """Insert or update an entry. Keeps history on update."""
        c = self.conn
        existing = c.execute(
            "SELECT rowid, version, content FROM entries WHERE entry_id = ?",
            (entry.entry_id,),
        ).fetchone()

        if existing:
            # Archive old version
            from datetime import datetime, timezone
            c.execute(
                "INSERT INTO entry_history (entry_id, version, content, changed_at, change_type) VALUES (?, ?, ?, ?, ?)",
                (entry.entry_id, existing["version"], existing["content"],
                 datetime.now(timezone.utc).isoformat(), "update"),
            )
            entry.version = existing["version"] + 1

            c.execute("""
                UPDATE entries SET
                    domain=?, category=?, title=?, content=?,
                    tags=?, materials=?, machines=?,
                    confidence=?, source_id=?, source_type=?,
                    version=?, updated_at=?, archived=?
                WHERE entry_id=?
            """, (
                entry.domain, entry.category, entry.title, entry.content,
                json.dumps(entry.tags), json.dumps(entry.materials),
                json.dumps(entry.machines),
                entry.confidence, entry.source_id, entry.source_type,
                entry.version, entry.updated_at, int(entry.archived),
                entry.entry_id,
            ))
        else:
            c.execute("""
                INSERT INTO entries (entry_id, domain, category, title, content,
                    tags, materials, machines, confidence, source_id, source_type,
                    version, created_at, updated_at, archived)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                entry.entry_id, entry.domain, entry.category,
                entry.title, entry.content,
                json.dumps(entry.tags), json.dumps(entry.materials),
                json.dumps(entry.machines),
                entry.confidence, entry.source_id, entry.source_type,
                entry.version, entry.created_at, entry.updated_at,
                int(entry.archived),
            ))
        c.commit()

    def bulk_upsert(self, entries: list[MemoryEntry]) -> int:
        """Bulk insert/update entries. Returns count processed."""
        for entry in entries:
            self.upsert(entry)
        return len(entries)

    # -------------------------------------------------------------------
    # Search (FTS5)
    # -------------------------------------------------------------------

    def search(
        self,
        query: str,
        domain: str | None = None,
        category: str | None = None,
        materials: list[str] | None = None,
        machines: list[str] | None = None,
        tags: list[str] | None = None,
        min_confidence: float = 0.0,
        limit: int = 50,
        include_archived: bool = False,
    ) -> list[MemoryEntry]:
        """Full-text search with optional filters.

        Args:
            query: FTS5 search query (supports AND, OR, NOT, prefix*).
            domain: Filter by domain.
            category: Filter by category.
            materials: Filter entries containing any of these materials.
            machines: Filter entries containing any of these machines.
            tags: Filter entries containing any of these tags.
            min_confidence: Minimum confidence threshold.
            limit: Maximum results.
            include_archived: Include archived entries.

        Returns:
            List of matching MemoryEntry objects ranked by relevance.
        """
        # Build FTS match query
        fts_query = self._build_fts_query(query)

        # Wildcard-only query: fall back to non-FTS listing
        if fts_query == "*" or not fts_query.strip():
            return self._search_fallback(
                domain=domain, category=category,
                materials=materials, machines=machines, tags=tags,
                min_confidence=min_confidence, limit=limit,
                include_archived=include_archived,
            )

        sql = """
            SELECT e.*, rank
            FROM entries_fts fts
            JOIN entries e ON e.rowid = fts.rowid
            WHERE entries_fts MATCH ?
        """
        params: list = [fts_query]

        if not include_archived:
            sql += " AND e.archived = 0"

        if domain:
            sql += " AND e.domain = ?"
            params.append(domain)

        if category:
            sql += " AND e.category = ?"
            params.append(category)

        if min_confidence > 0:
            sql += " AND e.confidence >= ?"
            params.append(min_confidence)

        sql += " ORDER BY rank LIMIT ?"
        params.append(limit)

        rows = self.conn.execute(sql, params).fetchall()
        results = [MemoryEntry.from_row(row) for row in rows]

        # Post-filter by materials/machines/tags (JSON array contains)
        if materials:
            mat_set = set(m.lower() for m in materials)
            results = [r for r in results
                       if mat_set & set(m.lower() for m in r.materials)]

        if machines:
            mach_set = set(m.lower() for m in machines)
            results = [r for r in results
                       if mach_set & set(m.lower() for m in r.machines)]

        if tags:
            tag_set = set(t.lower() for t in tags)
            results = [r for r in results
                       if tag_set & set(t.lower() for t in r.tags)]

        return results

    def get(self, entry_id: str) -> MemoryEntry | None:
        """Get a single entry by ID."""
        row = self.conn.execute(
            "SELECT * FROM entries WHERE entry_id = ?", (entry_id,)
        ).fetchone()
        return MemoryEntry.from_row(row) if row else None

    def get_all(
        self,
        domain: str | None = None,
        include_archived: bool = False,
    ) -> list[MemoryEntry]:
        """Get all entries, optionally filtered by domain."""
        sql = "SELECT * FROM entries WHERE 1=1"
        params: list = []

        if not include_archived:
            sql += " AND archived = 0"

        if domain:
            sql += " AND domain = ?"
            params.append(domain)

        sql += " ORDER BY confidence DESC"

        rows = self.conn.execute(sql, params).fetchall()
        return [MemoryEntry.from_row(row) for row in rows]

    def count(self, domain: str | None = None) -> int:
        """Count entries, optionally by domain."""
        if domain:
            row = self.conn.execute(
                "SELECT COUNT(*) FROM entries WHERE domain = ? AND archived = 0",
                (domain,),
            ).fetchone()
        else:
            row = self.conn.execute(
                "SELECT COUNT(*) FROM entries WHERE archived = 0"
            ).fetchone()
        return row[0] if row else 0

    def domain_counts(self) -> dict[str, int]:
        """Return entry count per domain."""
        rows = self.conn.execute(
            "SELECT domain, COUNT(*) as cnt FROM entries WHERE archived = 0 GROUP BY domain"
        ).fetchall()
        return {row["domain"]: row["cnt"] for row in rows}

    def category_counts(self, domain: str | None = None) -> dict[str, int]:
        """Return entry count per category."""
        sql = "SELECT category, COUNT(*) as cnt FROM entries WHERE archived = 0"
        params: list = []
        if domain:
            sql += " AND domain = ?"
            params.append(domain)
        sql += " GROUP BY category"

        rows = self.conn.execute(sql, params).fetchall()
        return {row["category"]: row["cnt"] for row in rows}

    def get_history(self, entry_id: str) -> list[dict]:
        """Get version history for an entry."""
        rows = self.conn.execute(
            "SELECT * FROM entry_history WHERE entry_id = ? ORDER BY version DESC",
            (entry_id,),
        ).fetchall()
        return [dict(row) for row in rows]

    def delete(self, entry_id: str) -> bool:
        """Permanently delete an entry."""
        c = self.conn
        result = c.execute("DELETE FROM entries WHERE entry_id = ?", (entry_id,))
        c.commit()
        return result.rowcount > 0

    def archive(self, entry_id: str) -> bool:
        """Soft-delete by archiving."""
        c = self.conn
        result = c.execute(
            "UPDATE entries SET archived = 1 WHERE entry_id = ?", (entry_id,)
        )
        c.commit()
        return result.rowcount > 0

    # -------------------------------------------------------------------
    # Internal
    # -------------------------------------------------------------------

    def _search_fallback(
        self,
        domain: str | None = None,
        category: str | None = None,
        materials: list[str] | None = None,
        machines: list[str] | None = None,
        tags: list[str] | None = None,
        min_confidence: float = 0.0,
        limit: int = 50,
        include_archived: bool = False,
    ) -> list[MemoryEntry]:
        """Fallback search without FTS (for wildcard/empty queries)."""
        results = self.get_all(domain=domain, include_archived=include_archived)

        if category:
            results = [r for r in results if r.category == category]
        if min_confidence > 0:
            results = [r for r in results if r.confidence >= min_confidence]
        if materials:
            mat_set = set(m.lower() for m in materials)
            results = [r for r in results
                       if mat_set & set(m.lower() for m in r.materials)]
        if machines:
            mach_set = set(m.lower() for m in machines)
            results = [r for r in results
                       if mach_set & set(m.lower() for m in r.machines)]
        if tags:
            tag_set = set(t.lower() for t in tags)
            results = [r for r in results
                       if tag_set & set(t.lower() for t in r.tags)]

        return results[:limit]

    @staticmethod
    def _build_fts_query(query: str) -> str:
        """Convert user query to FTS5 match expression.

        Simple approach: split words and OR them with prefix matching.
        Preserves explicit AND/OR/NOT operators.
        """
        operators = {"AND", "OR", "NOT"}
        words = query.strip().split()
        if not words:
            return "*"

        # If query contains operators, pass through
        if any(w in operators for w in words):
            return query

        # Otherwise: each word becomes a prefix match, joined with AND
        terms = []
        for w in words:
            clean = w.strip('"\'')
            if clean:
                terms.append(f"{clean}*" if not clean.endswith("*") else clean)
        return " AND ".join(terms) if terms else "*"
