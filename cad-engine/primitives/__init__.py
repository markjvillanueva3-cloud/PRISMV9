"""Feature Primitive Library — CC-MS4.

20 foundational CAD primitives as parameterized CadQuery functions.
Each primitive is searchable by tag, parameter, manufacturing process, and tooling.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

from primitives.library import PRIMITIVES, PrimitiveDef

_INDEX_PATH = Path(__file__).parent / "index.json"
_INDEX: list[dict] | None = None


def _load_index() -> list[dict]:
    global _INDEX
    if _INDEX is None:
        _INDEX = json.loads(_INDEX_PATH.read_text(encoding="utf-8"))
    return _INDEX


def get_primitive(name: str) -> Optional[PrimitiveDef]:
    """Get a primitive definition by name."""
    return PRIMITIVES.get(name)


def list_primitives() -> list[str]:
    """List all available primitive names."""
    return sorted(PRIMITIVES.keys())


def search_by_tag(tag: str) -> list[PrimitiveDef]:
    """Find primitives matching a tag (case-insensitive)."""
    tag_lower = tag.lower()
    return [p for p in PRIMITIVES.values() if tag_lower in [t.lower() for t in p.tags]]


def search_by_param(param_name: str) -> list[PrimitiveDef]:
    """Find primitives that accept a given parameter name."""
    return [p for p in PRIMITIVES.values() if param_name in p.params]


def search_by_process(process: str) -> list[PrimitiveDef]:
    """Find primitives associated with a manufacturing process."""
    proc_lower = process.lower()
    return [
        p for p in PRIMITIVES.values()
        if proc_lower in [pr.lower() for pr in p.processes]
    ]


def search_by_tooling(tool: str) -> list[PrimitiveDef]:
    """Find primitives that require specific tooling."""
    tool_lower = tool.lower()
    return [
        p for p in PRIMITIVES.values()
        if tool_lower in [t.lower() for t in p.tooling]
    ]


def search(
    query: str,
    tags: Optional[list[str]] = None,
    processes: Optional[list[str]] = None,
    tooling: Optional[list[str]] = None,
) -> list[PrimitiveDef]:
    """Multi-criteria search across primitives."""
    results = list(PRIMITIVES.values())

    if query:
        q = query.lower()
        results = [
            p for p in results
            if q in p.name.lower()
            or q in p.description.lower()
            or any(q in t.lower() for t in p.tags)
        ]

    if tags:
        tag_set = {t.lower() for t in tags}
        results = [
            p for p in results
            if tag_set & {t.lower() for t in p.tags}
        ]

    if processes:
        proc_set = {pr.lower() for pr in processes}
        results = [
            p for p in results
            if proc_set & {pr.lower() for pr in p.processes}
        ]

    if tooling:
        tool_set = {t.lower() for t in tooling}
        results = [
            p for p in results
            if tool_set & {t.lower() for t in p.tooling}
        ]

    return results
