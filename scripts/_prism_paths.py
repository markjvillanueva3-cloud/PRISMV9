"""
Shared PRISM path discovery.

Historical launchers hard-coded PRISM_ROOT = Path("C:/PRISM"). That breaks
the moment the drive letter changes — e.g. when the project lives on an
H: portable drive that moves between PCs. This module replaces the
hard-coded constant with auto-detection:

  1. Env var PRISM_ROOT (explicit override)
  2. Walk up from this file's location until we see known sentinels
     (mcp-server/ + state/) — the repo root
  3. Fallback: the directory containing scripts/

Import and use:

    from _prism_paths import PRISM_ROOT, STATE_DIR, MCP_SERVER_DIR, SCRIPTS_DIR

All paths are absolute and forward-slashed. Works on Windows regardless of
drive letter.
"""

from __future__ import annotations

import os
from pathlib import Path

_SENTINELS = ("mcp-server", "state", "scripts")


def _walk_up_to_root(start: Path) -> Path | None:
    for candidate in (start, *start.parents):
        try:
            hits = sum(1 for s in _SENTINELS if (candidate / s).is_dir())
        except (OSError, PermissionError):
            continue
        if hits >= 2:
            return candidate
    return None


def _detect_root() -> Path:
    env = os.environ.get("PRISM_ROOT")
    if env:
        p = Path(env).resolve()
        if p.is_dir():
            return p

    from_script = _walk_up_to_root(Path(__file__).resolve())
    if from_script is not None:
        return from_script

    # Last resort: the parent of this file's directory (scripts/..).
    return Path(__file__).resolve().parent.parent


PRISM_ROOT: Path = _detect_root()
SCRIPTS_DIR: Path = PRISM_ROOT / "scripts"
STATE_DIR: Path = PRISM_ROOT / "state"
DATA_DIR: Path = PRISM_ROOT / "mcp-server" / "data"
MCP_SERVER_DIR: Path = PRISM_ROOT / "mcp-server"
CONFIG_DIR: Path = PRISM_ROOT / "config"
SKILLS_DIR: Path = PRISM_ROOT / "skills-consolidated"
CORE_SCRIPTS_DIR: Path = SCRIPTS_DIR / "core"


def as_posix(p: Path) -> str:
    """Forward-slash string form, drive-letter preserved (for logs)."""
    return str(p).replace("\\", "/")


if __name__ == "__main__":
    for name, value in [
        ("PRISM_ROOT", PRISM_ROOT),
        ("SCRIPTS_DIR", SCRIPTS_DIR),
        ("STATE_DIR", STATE_DIR),
        ("DATA_DIR", DATA_DIR),
        ("MCP_SERVER_DIR", MCP_SERVER_DIR),
        ("CONFIG_DIR", CONFIG_DIR),
        ("SKILLS_DIR", SKILLS_DIR),
    ]:
        exists = "ok" if value.exists() else "MISSING"
        print(f"{name:16s} [{exists:7s}] {as_posix(value)}")
