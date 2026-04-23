#!/usr/bin/env python3
"""
ENFORCEMENT HOOK: Cross-tree reference reminder
Fires on UserPromptSubmit.

For audit/build/review-style prompts, injects a reminder that PRISM work must
consult both the active tree and the archive tree, plus the latest merged
inventory snapshot. If the inventory is missing or stale, it triggers a
background refresh without blocking the user prompt.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path


ACTIVE_ROOT = Path(r"H:\prism")
ARCHIVE_ROOT = Path(r"H:\prism_ARCHIVE_2026-02-01")
INVENTORY_PATH = ACTIVE_ROOT / "audits" / "cross_tree_reference_inventory.json"
INVENTORY_SCRIPT = ACTIVE_ROOT / "scripts" / "audit" / "cross_tree_reference_inventory.py"
REFRESH_MARKER = ACTIVE_ROOT / "state" / "cross-tree-inventory-refresh.json"
STALE_AFTER = timedelta(hours=12)

PROMPT_TERMS = (
    "audit",
    "review",
    "inspect",
    "analyze",
    "check",
    "search",
    "lookup",
    "reference",
    "compare",
    "build",
    "implement",
    "fix",
    "patch",
    "refactor",
    "harden",
    "validate",
    "verify",
    "engine",
    "algorithm",
    "dispatcher",
    "route",
    "hook",
    "script",
    "toolpath",
    "milling",
    "lathe",
    "turning",
    "edm",
    "laser",
    "waterjet",
    "quote",
    "erp",
    "roadmap",
    "mcp-server",
    "capability",
    "wiring",
    "context retention",
    "token",
    "memory",
)


def load_prompt() -> str:
    try:
        payload = json.loads(sys.stdin.read())
    except Exception:
        return ""
    return str(payload.get("prompt", "") or "").strip()


def is_relevant(prompt: str) -> bool:
    lower = prompt.lower()
    return any(term in lower for term in PROMPT_TERMS)


def parse_inventory() -> tuple[str, dict[str, int] | None]:
    if not INVENTORY_PATH.exists():
        return "missing", None

    try:
        data = json.loads(INVENTORY_PATH.read_text(encoding="utf-8"))
        generated_at = data["summary"]["generated_at"]
        generated = datetime.fromisoformat(generated_at)
        if generated.tzinfo is None:
            generated = generated.replace(tzinfo=timezone.utc)
        age = datetime.now(timezone.utc) - generated
        counts = data["summary"]["counts"]
        missing = data.get("artifacts_missing_from_active_mcp", [])
        info = {
            "engines": int(counts["engine"]["merged"]),
            "algorithms": int(counts["algorithm"]["merged"]),
            "dispatchers": int(counts["dispatcher"]["merged"]),
            "missing_from_active_mcp": int(len(missing)),
            "age_hours": int(age.total_seconds() // 3600),
        }
        return ("stale" if age > STALE_AFTER else "fresh"), info
    except Exception:
        return "invalid", None


def should_refresh() -> bool:
    now = datetime.now(timezone.utc)
    try:
        if REFRESH_MARKER.exists():
            data = json.loads(REFRESH_MARKER.read_text(encoding="utf-8"))
            last = datetime.fromisoformat(data.get("started_at", ""))
            if last.tzinfo is None:
                last = last.replace(tzinfo=timezone.utc)
            if now - last < timedelta(minutes=20):
                return False
    except Exception:
        pass
    return True


def launch_refresh() -> bool:
    if not INVENTORY_SCRIPT.exists() or not should_refresh():
        return False

    try:
        REFRESH_MARKER.parent.mkdir(parents=True, exist_ok=True)
        REFRESH_MARKER.write_text(
            json.dumps({"started_at": datetime.now(timezone.utc).isoformat()}),
            encoding="utf-8",
        )

        creationflags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
        subprocess.Popen(
            [sys.executable, str(INVENTORY_SCRIPT)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            cwd=str(ACTIVE_ROOT),
            creationflags=creationflags,
        )
        return True
    except Exception:
        return False


def build_message(status: str, counts: dict[str, int] | None, refresh_started: bool) -> str:
    prefix = (
        f"CROSS-TREE REFERENCE REQUIRED: consult {ACTIVE_ROOT} and "
        f"{ARCHIVE_ROOT} before audit/build conclusions."
    )

    if counts is None:
        suffix = f" Inventory: {INVENTORY_PATH}."
        if refresh_started:
            suffix += " Refresh started in background."
        return prefix + suffix

    suffix = (
        f" Latest inventory: {counts['engines']} engines, {counts['algorithms']} algorithms, "
        f"{counts['dispatchers']} dispatchers; {counts['missing_from_active_mcp']} artifacts "
        f"outside active MCP. Inventory: {INVENTORY_PATH}."
    )

    if status == "stale":
        suffix += f" Snapshot is ~{counts['age_hours']}h old."
        if refresh_started:
            suffix += " Refresh started in background."
    return prefix + suffix


def main() -> None:
    prompt = load_prompt()
    if not prompt or not is_relevant(prompt):
        print(json.dumps({"continue": True}))
        return

    status, counts = parse_inventory()
    refresh_started = False
    if status in {"missing", "invalid", "stale"}:
        refresh_started = launch_refresh()

    print(
        json.dumps(
            {
                "additionalContext": build_message(status, counts, refresh_started),
            }
        )
    )


if __name__ == "__main__":
    main()
