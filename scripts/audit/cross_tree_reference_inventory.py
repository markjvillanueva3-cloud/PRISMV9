"""
Cross-tree reference inventory for PRISM audits.

Scans the active PRISM tree plus the archive tree and summarizes engine /
algorithm / dispatcher artifacts so future audits do not rely on one folder.

Usage:
  py C:\\PRISM\\scripts\\audit\\cross_tree_reference_inventory.py
"""

from __future__ import annotations

import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path


ACTIVE_ROOT = Path(r"C:\PRISM")
ARCHIVE_ROOT = Path(r"C:\PRISM_ARCHIVE_2026-02-01")
OUTPUT_PATH = ACTIVE_ROOT / "audits" / "cross_tree_reference_inventory.json"

SKIP_PARTS = {
    ".git",
    "node_modules",
    "__pycache__",
    ".pytest_cache",
    ".venv",
    "dist",
    "build",
    ".next",
    ".swarm",
    ".claude\\worktrees",
    ".claude/worktrees",
}

ROLE_PATTERNS = {
    "engine": ("*Engine.ts", "*Engine.js", "*engine.py", "*ENGINE.js", "*ENGINE.ts", "*ENGINE.py"),
    "algorithm": ("*Algorithm.ts", "*Algorithm.js", "*algorithm.py", "*ALGORITHM.js", "*ALGORITHM.ts", "*ALGORITHM.py"),
    "dispatcher": ("*Dispatcher.ts", "*Dispatcher.js", "*dispatcher.py"),
}

ROLE_DIR_MARKERS = {
    "engine": ("\\engines\\",),
    "algorithm": ("\\algorithms\\", "\\data\\algorithms\\"),
    "dispatcher": ("\\dispatchers\\",),
}


def should_skip(path: Path) -> bool:
    text = str(path).replace("/", "\\")
    return any(part in text for part in SKIP_PARTS)


def gather_role_files(root: Path, role: str) -> list[Path]:
    matches: list[Path] = []
    for pattern in ROLE_PATTERNS[role]:
        for path in root.rglob(pattern):
            if path.is_file() and not should_skip(path):
                matches.append(path)

    for path in root.rglob("*"):
        if not path.is_file() or should_skip(path):
            continue
        lower = str(path).replace("/", "\\").lower()
        if not lower.endswith((".ts", ".js", ".py")):
            continue
        if any(marker in lower for marker in ROLE_DIR_MARKERS[role]):
            matches.append(path)

    unique = sorted({path.resolve() for path in matches}, key=lambda p: str(p).lower())
    return unique


def classify_scope(path: Path) -> str:
    text = str(path).replace("/", "\\").lower()
    if "\\mcp-server\\src\\" in text:
        return "active_mcp"
    if "\\mcp-server\\dist\\" in text:
        return "built_mcp"
    if "\\extracted_modules\\" in text or "\\extracted\\" in text:
        return "extracted"
    if str(ARCHIVE_ROOT).lower() in text:
        return "archive"
    return "other"


def file_record(path: Path) -> dict[str, str]:
    return {
        "path": str(path),
        "scope": classify_scope(path),
        "name": path.name,
        "stem": path.stem,
    }


def collect_root_inventory(root: Path) -> dict[str, list[dict[str, str]]]:
    return {
        role: [file_record(path) for path in gather_role_files(root, role)]
        for role in ROLE_PATTERNS
    }


def active_mcp_names(paths: list[dict[str, str]]) -> set[str]:
    return {
        item["stem"].lower()
        for item in paths
        if item["scope"] == "active_mcp"
    }


def missing_from_active(
    inventory: dict[str, list[dict[str, str]]],
    active_names: set[str],
) -> list[dict[str, str]]:
    missing: list[dict[str, str]] = []
    seen: set[str] = set()
    for role, items in inventory.items():
        for item in items:
            key = f"{role}:{item['stem'].lower()}:{item['path']}"
            if item["scope"] == "active_mcp":
                continue
            if item["stem"].lower() in active_names:
                continue
            if key in seen:
                continue
            seen.add(key)
            missing.append({"role": role, **item})
    return sorted(missing, key=lambda row: (row["role"], row["stem"].lower(), row["path"].lower()))


def cross_tree_duplicates(
    inventory: dict[str, list[dict[str, str]]],
) -> dict[str, list[dict[str, str]]]:
    by_stem: dict[str, list[dict[str, str]]] = defaultdict(list)
    for role, items in inventory.items():
        for item in items:
            by_stem[f"{role}:{item['stem'].lower()}"].append({"role": role, **item})

    duplicates: dict[str, list[dict[str, str]]] = {}
    for key, items in by_stem.items():
        scopes = {item["scope"] for item in items}
        if len(items) > 1 and len(scopes) > 1:
            duplicates[key] = sorted(items, key=lambda row: row["path"].lower())
    return duplicates


def build_inventory() -> dict[str, object]:
    active_inventory = collect_root_inventory(ACTIVE_ROOT)
    archive_inventory = collect_root_inventory(ARCHIVE_ROOT)

    merged: dict[str, list[dict[str, str]]] = {
        role: sorted(
            active_inventory[role] + archive_inventory[role],
            key=lambda row: row["path"].lower(),
        )
        for role in ROLE_PATTERNS
    }

    active_names = active_mcp_names(merged["engine"])
    summary = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "roots": [str(ACTIVE_ROOT), str(ARCHIVE_ROOT)],
        "counts": {
            role: {
                "active_root": len(active_inventory[role]),
                "archive_root": len(archive_inventory[role]),
                "merged": len(merged[role]),
            }
            for role in ROLE_PATTERNS
        },
        "active_mcp_engine_count": len(active_names),
    }

    return {
        "summary": summary,
        "merged_inventory": merged,
        "duplicates_across_scopes": cross_tree_duplicates(merged),
        "artifacts_missing_from_active_mcp": missing_from_active(merged, active_names),
    }


def main() -> None:
    inventory = build_inventory()
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(inventory, indent=2), encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH}")
    counts = inventory["summary"]["counts"]  # type: ignore[index]
    for role in ROLE_PATTERNS:
        role_counts = counts[role]
        print(
            f"{role}: active={role_counts['active_root']} archive={role_counts['archive_root']} "
            f"merged={role_counts['merged']}"
        )
    missing = inventory["artifacts_missing_from_active_mcp"]  # type: ignore[index]
    print(f"missing_from_active_mcp={len(missing)}")


if __name__ == "__main__":
    main()
