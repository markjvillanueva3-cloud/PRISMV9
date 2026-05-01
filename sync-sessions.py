#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PRISM Portable Sync — Full Environment Portability

Syncs ALL Claude Code and Codex Desktop state between the portable H: drive
and the local machine. Designed for seamless work across multiple computers.

Syncs:
  - Claude Code sessions (conversation history per project)
  - Claude Code global config (settings, keybindings, credentials, history)
  - Claude Code memory (auto-memory system at ~/.claude/projects/<project>/memory/)
  - Claude Code plans and scheduled tasks
  - MCP server settings (mcp-server/.claude/settings.json)
  - Codex Desktop sessions and config

Usage:
  python sync-sessions.py restore   # arriving at a new PC
  python sync-sessions.py save      # leaving a PC
  python sync-sessions.py auto      # two-way sync (default)
  python sync-sessions.py status    # show what's where
"""

import json
import os
import shutil
import sqlite3
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

# ─────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────

# Marker file to identify the PRISM drive
PRISM_MARKER = "mcp-server/package.json"

# Where to store portable sessions on the drive
SESSION_STORE = ".sessions"

# Log file
LOG_FILE = "sync-sessions-log.txt"

# Manifest file
MANIFEST_FILE = "SYNC_MANIFEST.json"

# Leave-event marker — written on "save", read on "restore" / "status"
LEAVE_EVENT_FILE = "LEAVE_EVENT.json"

# Staleness threshold — warn if last leave > this many days old
STALE_LEAVE_DAYS = 30

# Max age for Codex sessions to sync (days) — 0 = sync all
CODEX_SESSION_MAX_AGE_DAYS = 60

# Directories under ~/.claude/ to sync globally
CLAUDE_GLOBAL_DIRS = [
    "sessions",         # active session state
    "plans",            # user plans
    "scheduled-tasks",  # cron-style tasks
    "todos",            # todo lists
    "remote",           # remote triggers
    # User-authored content — H:\.claude is canonical master (2026-04-19)
    "commands",         # slash commands
    "agents",           # sub-agents
    "hooks",            # global hooks
    "skills",           # user skills
    "rules",            # user rules
]

# Files at ~/.claude/ root to sync
CLAUDE_GLOBAL_FILES = [
    "history.jsonl",
    "settings.json",
    "settings.local.json",
    ".credentials.json",
    "keybindings.json",
    # Added 2026-04-19: config files now kept in sync between C: and H:
    ".mcp.json",
    "CLAUDE.md",
    "ARCHITECTURE.json",
    "dashboard.json",
    "launch.json",
]

# Glob patterns for root-level files to sync (hookify rules, etc.)
CLAUDE_GLOBAL_GLOBS = [
    "hookify.*.local.md",
]

# Per-project directories to sync (inside ~/.claude/projects/<project>/)
CLAUDE_PROJECT_DIRS = [
    "memory",           # auto-memory system
]

# MCP server settings to sync (relative to prism root)
MCP_SETTINGS_FILES = [
    "mcp-server/.claude/settings.json",
    "mcp-server/.claude/settings.local.json",
]

# Directories inside ~/.claude/ to SKIP (local-only or machine-specific)
CLAUDE_SKIP_DIRS = {
    "cache", "debug", "backups", "session-env", "plugins",
    "shell-snapshots", "projects", "file-history", "paste-cache",
    "statsig", "telemetry"
}  # projects handled separately


# ─────────────────────────────────────────────
# Logging
# ─────────────────────────────────────────────

_log_lines: list[str] = []

def log(msg: str):
    ts = datetime.now().strftime("%H:%M:%S")
    line = f"[{ts}] {msg}"
    _log_lines.append(line)
    print(f"  {msg}")

def flush_log(prism_root: Path):
    log_path = prism_root / LOG_FILE
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(f"\n{'=' * 60}\n")
        f.write(f"Sync run: {datetime.now().isoformat()}\n")
        for line in _log_lines:
            f.write(line + "\n")


# ─────────────────────────────────────────────
# Drive & Path Discovery
# ─────────────────────────────────────────────

def find_prism_drive() -> Path | None:
    """Find the portable drive containing PRISM by scanning all drive letters."""
    candidates = []

    if sys.platform == "win32":
        import string
        for letter in string.ascii_uppercase:
            for name in ["prism", "PRISM"]:
                root = Path(f"{letter}:\\{name}")
                if (root / PRISM_MARKER).is_file():
                    candidates.append(root)
    else:
        for mount in ["/mnt", "/media", "/Volumes"]:
            mp = Path(mount)
            if mp.is_dir():
                for sub in mp.iterdir():
                    for name in ["prism", "PRISM"]:
                        root = sub / name
                        if (root / PRISM_MARKER).is_file():
                            candidates.append(root)

    # Deduplicate (case-insensitive on Windows)
    seen = set()
    unique = []
    for c in candidates:
        key = str(c).lower()
        if key not in seen:
            seen.add(key)
            unique.append(c)
    candidates = unique

    if not candidates:
        return None
    if len(candidates) == 1:
        return candidates[0]

    # Prefer the drive this script lives on
    script_drive = Path(__file__).resolve().drive[0].upper() if sys.platform == "win32" else ""
    for c in candidates:
        if c.drive[0].upper() == script_drive:
            return c

    # Prefer non-system drives
    non_system = [c for c in candidates if c.drive[0].upper() != "C"]
    if non_system:
        return non_system[0]

    return candidates[0]


def find_claude_home() -> Path:
    return Path.home() / ".claude"


def find_codex_home() -> Path:
    return Path.home() / ".codex"


def find_claude_project_dirs(claude_home: Path, prism_drive_letter: str) -> list[Path]:
    """Find all Claude Code project directories related to PRISM or this drive."""
    projects = claude_home / "projects"
    if not projects.is_dir():
        return []

    drive_upper = prism_drive_letter.upper()
    matches = []
    for d in projects.iterdir():
        if not d.is_dir():
            continue
        name = d.name
        name_lower = name.lower()

        # Match any of:
        # - Contains "prism" (e.g., H--PRISM, C--PRISM, H--prism)
        # - Starts with the portable drive letter (e.g., H--, H--anything)
        # - Is just a drive root like "H--" (the user runs claude from H:\)
        if "prism" in name_lower and "archive" not in name_lower:
            matches.append(d)
        elif name.startswith(f"{drive_upper}--") and d not in matches:
            matches.append(d)

    return matches


def encode_project_dir_name(path: Path) -> str:
    """Encode a filesystem path to a Claude project dir name (e.g. H:\\PRISM -> H--PRISM)."""
    drive_letter = path.drive[0].upper()
    rel = str(path.relative_to(path.anchor)).replace("\\", "-").replace("/", "-")
    if rel == ".":
        return f"{drive_letter}--"
    return f"{drive_letter}--{rel}"


# ─────────────────────────────────────────────
# File Operations
# ─────────────────────────────────────────────

def copy_file_if_newer(src: Path, dst: Path) -> bool:
    """Copy src to dst only if src is newer or dst doesn't exist."""
    if not src.is_file():
        return False
    if dst.is_file() and dst.stat().st_mtime >= src.stat().st_mtime:
        return False
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)
    return True


def copy_dir_if_newer(src: Path, dst: Path) -> int:
    """Recursively copy directory, only copying newer files. Returns count."""
    if not src.is_dir():
        return 0
    copied = 0
    for item in src.rglob("*"):
        if item.is_file():
            rel = item.relative_to(src)
            target = dst / rel
            if copy_file_if_newer(item, target):
                copied += 1
    return copied


def sync_directory_oneway(src: Path, dst: Path) -> int:
    """One-way sync: copy newer files from src to dst. Returns count."""
    if not src.is_dir():
        return 0
    dst.mkdir(parents=True, exist_ok=True)
    return copy_dir_if_newer(src, dst)


def sync_directory_twoway(src: Path, dst: Path) -> tuple[int, int]:
    """Two-way sync between src and dst. Returns (src->dst, dst->src) counts."""
    to_dst = 0
    to_src = 0

    src_files: dict[str, Path] = {}
    dst_files: dict[str, Path] = {}

    if src.is_dir():
        for f in src.rglob("*"):
            if f.is_file():
                src_files[str(f.relative_to(src))] = f

    if dst.is_dir():
        for f in dst.rglob("*"):
            if f.is_file():
                dst_files[str(f.relative_to(dst))] = f

    for rel in set(src_files) | set(dst_files):
        sf = src_files.get(rel)
        df = dst_files.get(rel)

        if sf and not df:
            target = dst / rel
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(sf, target)
            to_dst += 1
        elif df and not sf:
            target = src / rel
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(df, target)
            to_src += 1
        elif sf and df:
            if sf.stat().st_mtime > df.stat().st_mtime + 1:
                shutil.copy2(sf, df)
                to_dst += 1
            elif df.stat().st_mtime > sf.stat().st_mtime + 1:
                shutil.copy2(df, sf)
                to_src += 1

    return to_dst, to_src


# ─────────────────────────────────────────────
# Claude Code Sync
# ─────────────────────────────────────────────

def sync_claude(claude_home: Path, store: Path, prism_root: Path, mode: str) -> dict:
    """Sync Claude Code data between local machine and portable drive."""
    results = {
        "projects_saved": 0, "projects_restored": 0,
        "global_saved": 0, "global_restored": 0,
        "memory_saved": 0, "memory_restored": 0,
        "project_dirs": [],
    }

    drive_letter = prism_root.drive[0] if sys.platform == "win32" else ""

    # ── 1. Project directories (sessions + memory per project) ──
    store_projects = store / "claude" / "projects"
    store_projects.mkdir(parents=True, exist_ok=True)

    local_dirs = find_claude_project_dirs(claude_home, drive_letter)
    results["project_dirs"] = [d.name for d in local_dirs]

    if mode in ("save", "auto"):
        for pdir in local_dirs:
            dst = store_projects / pdir.name
            count = sync_directory_oneway(pdir, dst)
            results["projects_saved"] += count
            if count:
                log(f"Saved {count} files from {pdir.name}")

    if mode in ("restore", "auto"):
        # Restore ALL project dirs from the store — not just local ones.
        # This brings sessions from the other PC (e.g. C--PRISM from home).
        if store_projects.is_dir():
            for stored_dir in store_projects.iterdir():
                if not stored_dir.is_dir():
                    continue
                local_target = claude_home / "projects" / stored_dir.name
                local_target.mkdir(parents=True, exist_ok=True)
                count = sync_directory_oneway(stored_dir, local_target)
                results["projects_restored"] += count
                if count:
                    log(f"Restored {count} files to {stored_dir.name}")

        # ── Cross-bucket merge: copy H--prism sessions into H-- ──────────
        # Claude Code's /resume only shows sessions matching the CWD bucket.
        # Since the user always launches from H:\, H-- is the visible bucket.
        # Any session created from H:\prism (work PC) lands in H--prism and
        # would be invisible. Fix: merge .jsonl files from H--prism → H--.
        h_minus = claude_home / "projects" / "H--"
        h_minus_prism = claude_home / "projects" / "H--prism"
        if h_minus_prism.is_dir() and h_minus.is_dir():
            merged = 0
            for src_file in h_minus_prism.glob("*.jsonl"):
                dst_file = h_minus / src_file.name
                if copy_file_if_newer(src_file, dst_file):
                    merged += 1
            if merged:
                log(f"Cross-bucket merge: copied {merged} sessions from H--prism → H--")
                results["projects_restored"] += merged

    # ── 2. Per-project memory directories ──
    for pdir in local_dirs:
        for subdir in CLAUDE_PROJECT_DIRS:
            local_mem = pdir / subdir
            store_mem = store_projects / pdir.name / subdir

            if mode in ("save", "auto") and local_mem.is_dir():
                count = sync_directory_oneway(local_mem, store_mem)
                results["memory_saved"] += count
                if count:
                    log(f"Saved {count} memory files from {pdir.name}/{subdir}")

            if mode in ("restore", "auto") and store_mem.is_dir():
                local_mem.mkdir(parents=True, exist_ok=True)
                count = sync_directory_oneway(store_mem, local_mem)
                results["memory_restored"] += count
                if count:
                    log(f"Restored {count} memory files to {pdir.name}/{subdir}")

    # ── 3. Global directories (sessions, plans, scheduled-tasks) ──
    for dirname in CLAUDE_GLOBAL_DIRS:
        local_d = claude_home / dirname
        store_d = store / "claude" / "global" / dirname

        if mode in ("save", "auto") and local_d.is_dir():
            count = sync_directory_oneway(local_d, store_d)
            results["global_saved"] += count

        if mode in ("restore", "auto") and store_d.is_dir():
            local_d.mkdir(parents=True, exist_ok=True)
            count = sync_directory_oneway(store_d, local_d)
            results["global_restored"] += count

    # ── 4. Global files (history, settings, credentials) ──
    store_global = store / "claude" / "global"
    store_global.mkdir(parents=True, exist_ok=True)

    for fname in CLAUDE_GLOBAL_FILES:
        local_f = claude_home / fname
        store_f = store_global / fname

        if mode in ("save", "auto"):
            if copy_file_if_newer(local_f, store_f):
                results["global_saved"] += 1

        if mode in ("restore", "auto"):
            if copy_file_if_newer(store_f, local_f):
                results["global_restored"] += 1

    # ── 5. Root-level glob patterns (hookify rules, etc.) ──
    for pattern in CLAUDE_GLOBAL_GLOBS:
        # Save: local -> store
        if mode in ("save", "auto"):
            for f in claude_home.glob(pattern):
                if f.is_file():
                    if copy_file_if_newer(f, store_global / f.name):
                        results["global_saved"] += 1
        # Restore: store -> local
        if mode in ("restore", "auto"):
            for f in store_global.glob(pattern):
                if f.is_file():
                    if copy_file_if_newer(f, claude_home / f.name):
                        results["global_restored"] += 1

    return results


# ─────────────────────────────────────────────
# MCP Server Settings Sync
# ─────────────────────────────────────────────

def sync_mcp_settings(prism_root: Path, store: Path, mode: str) -> dict:
    """Sync MCP server settings between drive locations."""
    results = {"saved": 0, "restored": 0}

    store_mcp = store / "mcp-settings"
    store_mcp.mkdir(parents=True, exist_ok=True)

    for rel_path in MCP_SETTINGS_FILES:
        local_f = prism_root / rel_path
        store_f = store_mcp / Path(rel_path).name

        if mode in ("save", "auto"):
            if copy_file_if_newer(local_f, store_f):
                results["saved"] += 1
                log(f"Saved MCP setting: {rel_path}")

        if mode in ("restore", "auto"):
            if copy_file_if_newer(store_f, local_f):
                results["restored"] += 1
                log(f"Restored MCP setting: {rel_path}")

    return results


# ─────────────────────────────────────────────
# Codex Desktop Sync
# ─────────────────────────────────────────────

def safe_copy_sqlite(src: Path, dst: Path) -> bool:
    """Safely copy a SQLite database by checkpointing the WAL first."""
    if not src.is_file():
        return False
    if dst.is_file() and dst.stat().st_mtime >= src.stat().st_mtime:
        return False

    dst.parent.mkdir(parents=True, exist_ok=True)

    try:
        conn = sqlite3.connect(str(src))
        conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")
        conn.close()
    except Exception:
        pass

    shutil.copy2(src, dst)

    for ext in ["-wal", "-shm"]:
        wal = src.with_name(src.name + ext)
        if wal.is_file():
            shutil.copy2(wal, dst.with_name(dst.name + ext))

    return True


def paths_point_to_same_location(left: Path, right: Path) -> bool:
    try:
        return left.exists() and right.exists() and os.path.samefile(left, right)
    except Exception:
        return False


def estimate_restore_gap_bytes(src_dir: Path, dst_dir: Path) -> int:
    if not src_dir.is_dir():
        return 0

    dst_files: dict[str, Path] = {}
    if dst_dir.is_dir():
        for f in dst_dir.rglob("*"):
            if f.is_file():
                dst_files[str(f.relative_to(dst_dir))] = f

    total = 0
    for src_file in src_dir.rglob("*"):
        if not src_file.is_file():
            continue
        rel = str(src_file.relative_to(src_dir))
        dst_file = dst_files.get(rel)
        if dst_file is None or src_file.stat().st_mtime > dst_file.stat().st_mtime + 1:
            total += src_file.stat().st_size
    return total


def ensure_directory_junction(link_path: Path, target_path: Path) -> bool:
    target_path.mkdir(parents=True, exist_ok=True)

    if paths_point_to_same_location(link_path, target_path):
        return True

    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_path = link_path.with_name(f"{link_path.name}.prelink-backup-{timestamp}")

    if link_path.exists():
        link_path.rename(backup_path)

    try:
        subprocess.run(
            ["cmd", "/c", "mklink", "/J", str(link_path), str(target_path)],
            check=True,
            capture_output=True,
            text=True,
        )
        if backup_path.exists():
            shutil.rmtree(backup_path, ignore_errors=True)
        return True
    except Exception:
        try:
            if link_path.exists():
                if link_path.is_dir():
                    shutil.rmtree(link_path, ignore_errors=True)
                else:
                    link_path.unlink()
        except Exception:
            pass
        if backup_path.exists():
            backup_path.rename(link_path)
        return False


def sync_codex(codex_home: Path, store: Path, mode: str) -> dict:
    """Sync Codex Desktop sessions between local and drive."""
    results = {"db_synced": False, "sessions_synced": 0, "config_synced": False, "sessions_linked": False}

    codex_store = store / "codex"
    codex_store.mkdir(parents=True, exist_ok=True)

    # SQLite databases
    db_files = ["state_5.sqlite", "logs_1.sqlite"]
    for db in db_files:
        local_db = codex_home / db
        store_db = codex_store / db
        if mode in ("save", "auto"):
            if safe_copy_sqlite(local_db, store_db):
                results["db_synced"] = True
        if mode in ("restore", "auto"):
            if safe_copy_sqlite(store_db, local_db):
                results["db_synced"] = True

    # Session index
    idx = "session_index.jsonl"
    if mode in ("save", "auto"):
        copy_file_if_newer(codex_home / idx, codex_store / idx)
    if mode in ("restore", "auto"):
        copy_file_if_newer(codex_store / idx, codex_home / idx)

    # Session folders
    cutoff = time.time() - (CODEX_SESSION_MAX_AGE_DAYS * 86400)
    local_sessions = codex_home / "sessions"
    store_sessions = codex_store / "sessions"
    sessions_are_linked = paths_point_to_same_location(local_sessions, store_sessions)

    if mode in ("restore", "auto") and store_sessions.is_dir() and not sessions_are_linked:
        free_bytes = shutil.disk_usage(codex_home.anchor).free if codex_home.anchor else shutil.disk_usage(codex_home).free
        required_restore_bytes = estimate_restore_gap_bytes(store_sessions, local_sessions)
        reserve_bytes = 1 * 1024 * 1024 * 1024

        if required_restore_bytes > max(0, free_bytes - reserve_bytes):
            if local_sessions.is_dir():
                sync_directory_oneway(local_sessions, store_sessions)
            if ensure_directory_junction(local_sessions, store_sessions):
                sessions_are_linked = True
                results["sessions_linked"] = True
                log(
                    "Codex sessions linked to portable store to avoid low-disk restore failure "
                    f"({required_restore_bytes / 1_048_576:.1f} MB needed, {free_bytes / 1_048_576:.1f} MB free)"
                )
            else:
                log("WARNING: Low-disk Codex restore detected, but automatic session linking failed.")

    if sessions_are_linked:
        results["sessions_linked"] = True
        log("Codex sessions already point at the portable session store; skipping per-file session copy.")
    elif mode in ("save", "auto") and local_sessions.is_dir():
        store_sessions.mkdir(parents=True, exist_ok=True)
        for item in local_sessions.rglob("*"):
            if not item.is_file():
                continue
            if CODEX_SESSION_MAX_AGE_DAYS > 0 and item.stat().st_mtime <= cutoff:
                continue
            rel = item.relative_to(local_sessions)
            target = store_sessions / rel
            try:
                copied = copy_file_if_newer(item, target)
            except OSError as exc:
                log(f"WARNING: Skipped saving Codex session {rel} ({exc})")
                copied = False
            if copied:
                results["sessions_synced"] += 1

    if not sessions_are_linked and mode in ("restore", "auto") and store_sessions.is_dir():
        local_sessions.mkdir(parents=True, exist_ok=True)
        for item in store_sessions.rglob("*"):
            if item.is_file():
                rel = item.relative_to(store_sessions)
                target = local_sessions / rel
                try:
                    copied = copy_file_if_newer(item, target)
                except OSError as exc:
                    log(f"WARNING: Skipped restoring Codex session {rel} ({exc})")
                    copied = False
                if copied:
                    results["sessions_synced"] += 1

    # Config files
    config_files = [
        "config.toml", "AGENTS.md", ".codex-global-state.json", "models_cache.json",
    ]
    config_dirs = ["rules", "memories", "skills"]

    for f in config_files:
        if mode in ("save", "auto"):
            copy_file_if_newer(codex_home / f, codex_store / f)
        if mode in ("restore", "auto"):
            if copy_file_if_newer(codex_store / f, codex_home / f):
                results["config_synced"] = True

    for d in config_dirs:
        local_d = codex_home / d
        store_d = codex_store / d
        if mode in ("save", "auto") and local_d.is_dir():
            copy_dir_if_newer(local_d, store_d)
        if mode in ("restore", "auto") and store_d.is_dir():
            local_d.mkdir(parents=True, exist_ok=True)
            if copy_dir_if_newer(store_d, local_d):
                results["config_synced"] = True

    return results


# ─────────────────────────────────────────────
# User-level Claude Config Sync (for any PC)
# ─────────────────────────────────────────────

def sync_user_claude_config(claude_home: Path, store: Path, mode: str) -> dict:
    """Sync user-level Claude config that should follow the user everywhere."""
    results = {"saved": 0, "restored": 0}

    user_store = store / "claude" / "user-config"
    user_store.mkdir(parents=True, exist_ok=True)

    # These are user preferences that should be the same on every machine
    user_files = [
        "settings.json",        # global settings
        "keybindings.json",     # keyboard shortcuts
        ".credentials.json",    # API keys (encrypted)
    ]

    for fname in user_files:
        local_f = claude_home / fname
        store_f = user_store / fname

        if mode in ("save", "auto"):
            if copy_file_if_newer(local_f, store_f):
                results["saved"] += 1

        if mode in ("restore", "auto"):
            if copy_file_if_newer(store_f, local_f):
                results["restored"] += 1
                log(f"Restored user config: {fname}")

    return results


# ─────────────────────────────────────────────
# Manifest
# ─────────────────────────────────────────────

def write_manifest(store: Path, mode: str, claude_results: dict, codex_results: dict, mcp_results: dict):
    manifest = {
        "last_sync": datetime.now().isoformat(),
        "machine": os.environ.get("COMPUTERNAME", os.environ.get("HOSTNAME", "unknown")),
        "user": os.environ.get("USERNAME", os.environ.get("USER", "unknown")),
        "mode": mode,
        "claude": claude_results,
        "codex": codex_results,
        "mcp": mcp_results,
    }

    manifest_path = store / MANIFEST_FILE
    history = []
    if manifest_path.is_file():
        try:
            old = json.loads(manifest_path.read_text())
            history = old.get("history", [])
            history.append({
                "time": old.get("last_sync"),
                "machine": old.get("machine"),
                "mode": old.get("mode"),
            })
            history = history[-20:]
        except Exception:
            pass

    manifest["history"] = history
    manifest_path.write_text(json.dumps(manifest, indent=2))


# ─────────────────────────────────────────────
# Status
# ─────────────────────────────────────────────

def show_status(store: Path, claude_home: Path, codex_home: Path, prism_root: Path):
    drive_letter = prism_root.drive[0] if sys.platform == "win32" else ""

    print("\n=== CLAUDE CODE — PROJECT DIRS ===")
    local_dirs = find_claude_project_dirs(claude_home, drive_letter)
    for d in local_dirs:
        sessions = [f for f in d.iterdir() if f.suffix == ".jsonl"]
        total_mb = sum(f.stat().st_size for f in sessions) / 1_048_576
        memory_dir = d / "memory"
        mem_count = sum(1 for _ in memory_dir.rglob("*") if _.is_file()) if memory_dir.is_dir() else 0
        print(f"  Local [{d.name}]: {len(sessions)} sessions ({total_mb:.1f} MB), {mem_count} memory files")

    store_projects = store / "claude" / "projects"
    if store_projects.is_dir():
        for d in store_projects.iterdir():
            if d.is_dir():
                sessions = list(d.glob("*.jsonl"))
                total_mb = sum(f.stat().st_size for f in sessions) / 1_048_576
                memory_dir = d / "memory"
                mem_count = sum(1 for _ in memory_dir.rglob("*") if _.is_file()) if memory_dir.is_dir() else 0
                print(f"  Drive [{d.name}]: {len(sessions)} sessions ({total_mb:.1f} MB), {mem_count} memory files")

    print("\n=== CLAUDE CODE — GLOBAL ===")
    for dirname in CLAUDE_GLOBAL_DIRS:
        local_d = claude_home / dirname
        store_d = store / "claude" / "global" / dirname
        local_count = sum(1 for _ in local_d.rglob("*") if _.is_file()) if local_d.is_dir() else 0
        store_count = sum(1 for _ in store_d.rglob("*") if _.is_file()) if store_d.is_dir() else 0
        print(f"  {dirname}: {local_count} local, {store_count} on drive")

    for fname in CLAUDE_GLOBAL_FILES:
        local_f = claude_home / fname
        store_f = store / "claude" / "global" / fname
        local_exists = "yes" if local_f.is_file() else "no"
        store_exists = "yes" if store_f.is_file() else "no"
        print(f"  {fname}: local={local_exists}, drive={store_exists}")

    print("\n=== MCP SERVER SETTINGS ===")
    for rel_path in MCP_SETTINGS_FILES:
        local_f = prism_root / rel_path
        store_f = store / "mcp-settings" / Path(rel_path).name
        local_exists = "yes" if local_f.is_file() else "no"
        store_exists = "yes" if store_f.is_file() else "no"
        print(f"  {rel_path}: local={local_exists}, drive={store_exists}")

    print("\n=== CODEX ===")
    if codex_home.is_dir():
        sessions_dir = codex_home / "sessions"
        if sessions_dir.is_dir():
            count = sum(1 for _ in sessions_dir.rglob("*.jsonl"))
            size = sum(f.stat().st_size for f in sessions_dir.rglob("*") if f.is_file())
            print(f"  Local: {count} session files ({size / 1_048_576:.1f} MB)")

    codex_store = store / "codex" / "sessions"
    if codex_store.is_dir():
        count = sum(1 for _ in codex_store.rglob("*.jsonl"))
        size = sum(f.stat().st_size for f in codex_store.rglob("*") if f.is_file())
        print(f"  Drive: {count} session files ({size / 1_048_576:.1f} MB)")

    # Show manifest
    manifest_path = store / MANIFEST_FILE
    if manifest_path.is_file():
        m = json.loads(manifest_path.read_text())
        print(f"\n=== LAST SYNC ===")
        print(f"  Time:    {m.get('last_sync', '?')}")
        print(f"  Machine: {m.get('machine', '?')}")
        print(f"  Mode:    {m.get('mode', '?')}")
        if m.get("history"):
            print(f"\n=== RECENT HISTORY ===")
            for h in m["history"][-5:]:
                print(f"  {h.get('time', '?')} — {h.get('machine', '?')} ({h.get('mode', '?')})")
    print()


# ─────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────

def write_leave_event(store: Path, mode: str):
    """Record who left this PC and when, so the next machine knows."""
    if mode != "save":
        return
    ev = {
        "time": datetime.now().isoformat(),
        "machine": os.environ.get("COMPUTERNAME", os.environ.get("HOSTNAME", "unknown")),
        "user": os.environ.get("USERNAME", os.environ.get("USER", "unknown")),
        "platform": sys.platform,
    }
    (store / LEAVE_EVENT_FILE).write_text(json.dumps(ev, indent=2))


def read_leave_event(store: Path) -> dict | None:
    p = store / LEAVE_EVENT_FILE
    if not p.is_file():
        return None
    try:
        return json.loads(p.read_text())
    except Exception:
        return None


def show_leave_banner(store: Path):
    """On arrive, tell the user who last left and how long ago."""
    ev = read_leave_event(store)
    if not ev:
        print("\n  [leave-event] No prior leave recorded — this may be the first sync.")
        return
    try:
        last = datetime.fromisoformat(ev["time"])
        age_days = (datetime.now() - last).days
        age_hours = (datetime.now() - last).total_seconds() / 3600
    except Exception:
        age_days = -1
        age_hours = -1
    cur_machine = os.environ.get("COMPUTERNAME", os.environ.get("HOSTNAME", "?"))
    same_machine = ev.get("machine") == cur_machine
    print(f"\n  +-- Last leave ------------------------------------")
    print(f"  | From:    {ev.get('machine', '?')} ({ev.get('user', '?')})")
    print(f"  | At:      {ev.get('time', '?')}")
    if age_hours >= 0:
        if age_hours < 24:
            print(f"  | Age:     {age_hours:.1f} hours ago")
        else:
            print(f"  | Age:     {age_days} days ago")
    if same_machine:
        print(f"  | NOTE:    last leave was from THIS machine - no remote changes")
    if age_days > STALE_LEAVE_DAYS:
        print(f"  | WARNING: drive is >{STALE_LEAVE_DAYS} days stale - verify before proceeding")
    print(f"  +--------------------------------------------------\n")


def verify_restore(claude_home: Path) -> list[str]:
    """After restore, sanity-check that critical files are present + valid."""
    problems = []
    for f in ("settings.json", ".mcp.json", "CLAUDE.md"):
        p = claude_home / f
        if not p.is_file():
            problems.append(f"missing: ~/.claude/{f}")
            continue
        if f.endswith(".json"):
            try:
                json.loads(p.read_text(encoding="utf-8"))
            except Exception as e:
                problems.append(f"invalid JSON: ~/.claude/{f}: {e}")
    return problems


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "auto"
    if mode not in ("save", "restore", "auto", "status", "verify"):
        print("Usage: python sync-sessions.py [save|restore|auto|status|verify]")
        print("  save    — copy sessions from this PC to the drive (leave)")
        print("  restore — copy sessions from the drive to this PC (arrive)")
        print("  auto    — two-way sync (default)")
        print("  status  — show what's saved where")
        print("  verify  — restore-integrity check (run after arrive)")
        sys.exit(1)

    # Find the PRISM drive
    prism_root = find_prism_drive()
    if not prism_root:
        script_dir = Path(__file__).resolve().parent
        if (script_dir / PRISM_MARKER).is_file():
            prism_root = script_dir
        else:
            print("ERROR: Cannot find PRISM drive.")
            print("Make sure the portable drive is plugged in and contains prism/mcp-server/package.json")
            sys.exit(1)

    store = prism_root / SESSION_STORE
    store.mkdir(parents=True, exist_ok=True)

    claude_home = find_claude_home()
    codex_home = find_codex_home()

    machine = os.environ.get("COMPUTERNAME", os.environ.get("HOSTNAME", "?"))

    print(f"{'=' * 50}")
    print(f"  PRISM Portable Sync")
    print(f"  Drive:   {prism_root}")
    print(f"  Machine: {machine}")
    print(f"  Mode:    {mode}")
    print(f"{'=' * 50}")

    if mode == "status":
        show_status(store, claude_home, codex_home, prism_root)
        show_leave_banner(store)
        return

    if mode == "verify":
        problems = verify_restore(claude_home)
        if not problems:
            print("\n  [OK] Restore integrity OK - all critical files present and valid.")
            sys.exit(0)
        print("\n  [FAIL] Restore integrity FAILED:")
        for p in problems:
            print(f"    - {p}")
        sys.exit(2)

    # On arrive, show who last left before touching files
    if mode in ("restore", "auto"):
        show_leave_banner(store)

    # Sync Claude Code
    print(f"\n[1/4] Claude Code sessions & memory...")
    if claude_home.is_dir():
        claude_results = sync_claude(claude_home, store, prism_root, mode)
        log(f"Projects: {claude_results['project_dirs']}")
        log(f"Project files — saved: {claude_results['projects_saved']}, restored: {claude_results['projects_restored']}")
        log(f"Memory files — saved: {claude_results['memory_saved']}, restored: {claude_results['memory_restored']}")
        log(f"Global files — saved: {claude_results['global_saved']}, restored: {claude_results['global_restored']}")
    else:
        claude_results = {"error": "~/.claude not found"}
        log(f"SKIP: {claude_home} not found")

    # Sync user-level Claude config
    print(f"\n[2/4] Claude Code user config...")
    if claude_home.is_dir():
        user_results = sync_user_claude_config(claude_home, store, mode)
        log(f"User config — saved: {user_results['saved']}, restored: {user_results['restored']}")
    else:
        user_results = {"error": "~/.claude not found"}

    # Sync MCP server settings
    print(f"\n[3/4] MCP server settings...")
    mcp_results = sync_mcp_settings(prism_root, store, mode)
    log(f"MCP settings — saved: {mcp_results['saved']}, restored: {mcp_results['restored']}")

    # Sync Codex
    print(f"\n[4/4] Codex Desktop...")
    if codex_home.is_dir():
        codex_results = sync_codex(codex_home, store, mode)
        log(f"DB synced: {codex_results['db_synced']}")
        log(f"Sessions synced: {codex_results['sessions_synced']} files")
        log(f"Config synced: {codex_results['config_synced']}")
    else:
        codex_results = {"error": "~/.codex not found"}
        log(f"SKIP: {codex_home} not found")

    # Write manifest, leave event, and log
    write_manifest(store, mode, claude_results, codex_results, mcp_results)
    write_leave_event(store, mode)
    flush_log(prism_root)

    # Post-restore integrity check
    if mode in ("restore", "auto"):
        problems = verify_restore(claude_home)
        if problems:
            print("\n  [WARN] Restore integrity issues:")
            for p in problems:
                print(f"    - {p}")
            print("  Run 'python sync-sessions.py verify' after launching to re-check.")
        else:
            print("\n  [OK] Restore integrity OK")

    print(f"\n{'=' * 50}")
    print(f"  SYNC COMPLETE")
    print(f"  Store: {store}")
    print(f"{'=' * 50}")

    if mode in ("restore", "auto"):
        print(f"\n  Resume Claude Code:  cd {prism_root} && claude -c")
        print(f"  Pick a session:      cd {prism_root} && claude --resume")

    if mode in ("save", "auto"):
        print(f"\n  On the next machine: python {prism_root / 'sync-sessions.py'} restore")


if __name__ == "__main__":
    main()
