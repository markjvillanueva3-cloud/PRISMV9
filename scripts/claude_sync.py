#!/usr/bin/env python3
"""
Claude Code state sync between the portable H: drive and the per-PC C: drive.

Problem this fixes
------------------
Claude Code keeps its state on the local C: drive:

    C:\\Users\\wompu\\.claude.json                     (global state + /resume index)
    C:\\Users\\wompu\\.claude\\settings.json           (user settings)
    C:\\Users\\wompu\\.claude\\settings.local.json     (per-PC overrides)
    C:\\Users\\wompu\\.claude\\projects\\H--prism\\    (chat transcripts — 2+ GB)

When the same user carries PRISM on a portable H: drive between several PCs,
those files live on each PC independently. Result: /resume on PC B can't see
chats that were recorded on PC A, and settings drift between machines.

Strategy
--------
Keep a master copy at H:\\prism\\.claude-user-state\\ . On session start,
`pull` newer files from H: to C:; before ejecting the drive, `push` newer
files from C: to H:. Mtime-newest-wins per file, 2-second tolerance for
NTFS-vs-FAT mtime granularity. The chat-history folder is an incremental
rsync-style walk (only files whose size-or-mtime differs get copied).

CLI
---
    py -3 claude_sync.py pull       # H: -> C:  (session start)
    py -3 claude_sync.py push       # C: -> H:  (before eject)
    py -3 claude_sync.py status     # dry-run, show what would change
    py -3 claude_sync.py both       # push then pull (merge both ways)

Exit 0 on success; non-zero only for hard I/O errors. Missing source is
not an error — it just means nothing to sync in that direction yet.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
import time
from pathlib import Path
from typing import Iterable

# Portable PRISM root resolution
sys.path.insert(0, str(Path(__file__).resolve().parent))
from _prism_paths import PRISM_ROOT  # noqa: E402


# ---- Path topology -----------------------------------------------------------

USER_HOME = Path(os.environ.get("USERPROFILE") or os.path.expanduser("~"))
C_CLAUDE_JSON = USER_HOME / ".claude.json"
C_CLAUDE_DIR = USER_HOME / ".claude"
C_SETTINGS = C_CLAUDE_DIR / "settings.json"
C_SETTINGS_LOCAL = C_CLAUDE_DIR / "settings.local.json"
C_PROJECT_HISTORY = C_CLAUDE_DIR / "projects" / "H--prism"

H_MASTER = PRISM_ROOT / ".claude-user-state"
H_CLAUDE_JSON = H_MASTER / "claude.json"
H_SETTINGS = H_MASTER / "settings.json"
H_SETTINGS_LOCAL = H_MASTER / "settings.local.json"
H_PROJECT_HISTORY = H_MASTER / "projects" / "H--prism"

MTIME_TOLERANCE_S = 2.0  # FAT granularity is 2s; avoid flapping


# ---- mtime helpers -----------------------------------------------------------

def newer(a: Path, b: Path) -> str:
    """Return which path is newer: "a", "b", "equal", or "only_a"/"only_b"."""
    a_exists = a.exists()
    b_exists = b.exists()
    if a_exists and not b_exists:
        return "only_a"
    if b_exists and not a_exists:
        return "only_b"
    if not a_exists and not b_exists:
        return "equal"
    at = a.stat().st_mtime
    bt = b.stat().st_mtime
    if abs(at - bt) <= MTIME_TOLERANCE_S:
        # Equal mtimes — compare size as tiebreaker so edits of equal length
        # don't flap back and forth. If identical, leave alone.
        if a.stat().st_size != b.stat().st_size:
            return "a" if at >= bt else "b"
        return "equal"
    return "a" if at > bt else "b"


def human_mtime(p: Path) -> str:
    try:
        return time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(p.stat().st_mtime))
    except OSError:
        return "?"


# ---- Copy primitives ---------------------------------------------------------

def copy_file(src: Path, dst: Path, dry_run: bool) -> bool:
    """Copy src -> dst preserving mtime. Returns True if a write happened."""
    if dry_run:
        return True
    dst.parent.mkdir(parents=True, exist_ok=True)
    # shutil.copy2 preserves mtime, which is exactly what we want for
    # subsequent newer() comparisons to remain stable across machines.
    shutil.copy2(src, dst)
    return True


def merge_claude_json(src: Path, dst: Path, dry_run: bool) -> str:
    """
    Special merge for .claude.json: keep union of 'projects' entries, picking
    the newer lastUpdated/exampleFiles per project key. Everything else:
    newer-mtime-wins.

    Why: .claude.json on PC A has a 'projects' entry for H:/prism with session
    IDs that PC B never saw, and vice versa. A naive overwrite loses one PC's
    /resume history. Per-project merge preserves both.
    """
    if not src.exists() and not dst.exists():
        return "noop"

    if not src.exists():
        # Master-only — pull it down wholesale
        if not dry_run:
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(H_CLAUDE_JSON if src == H_CLAUDE_JSON else src, dst)
        return "copied (master-only)"

    if not dst.exists():
        if not dry_run:
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)
        return "copied (new)"

    try:
        src_data = json.loads(src.read_text(encoding="utf-8"))
        dst_data = json.loads(dst.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        # Corrupt file — fall back to mtime-newest-wins to avoid making it worse
        verdict = newer(src, dst)
        if verdict in ("a", "only_a"):
            if not dry_run:
                shutil.copy2(src, dst)
            return f"fallback-overwrite ({exc})"
        return f"fallback-skip ({exc})"

    # Top-level: start from dst (the destination), overlay newer top-level scalars from src.
    # For the 'projects' dict, merge per-key.
    src_projects = src_data.get("projects", {}) or {}
    dst_projects = dst_data.get("projects", {}) or {}

    merged_projects = dict(dst_projects)
    for key, src_entry in src_projects.items():
        dst_entry = merged_projects.get(key)
        if dst_entry is None:
            merged_projects[key] = src_entry
            continue
        # Pick newer by lastUpdated when both have it; else keep whichever has
        # more recorded sessions (larger allowedTools/history).
        src_stamp = _entry_timestamp(src_entry)
        dst_stamp = _entry_timestamp(dst_entry)
        if src_stamp > dst_stamp:
            merged_projects[key] = src_entry

    # Now do a newer-top-level merge: src wins for top-level keys it has that dst doesn't,
    # plus keys where src mtime is newer overall.
    src_mtime = src.stat().st_mtime
    dst_mtime = dst.stat().st_mtime
    top_source = src_data if src_mtime >= dst_mtime else dst_data
    merged = dict(top_source)
    merged["projects"] = merged_projects

    if dry_run:
        return f"would-merge (src {human_mtime(src)} / dst {human_mtime(dst)})"

    dst.parent.mkdir(parents=True, exist_ok=True)
    tmp = dst.with_suffix(dst.suffix + ".sync.tmp")
    tmp.write_text(json.dumps(merged, indent=2), encoding="utf-8")
    os.replace(tmp, dst)
    # Stamp dst mtime to max(src, dst) so next run doesn't think it's stale.
    latest = max(src_mtime, dst_mtime)
    os.utime(dst, (latest, latest))
    return f"merged (kept {len(merged_projects)} project entries)"


def _entry_timestamp(entry: dict) -> float:
    """Extract a comparable 'last activity' timestamp from a projects entry."""
    if not isinstance(entry, dict):
        return 0.0
    for key in ("lastUpdated", "lastActiveAt", "lastSeenAt", "lastTotalWebSearchRequests"):
        v = entry.get(key)
        if isinstance(v, (int, float)):
            return float(v)
        if isinstance(v, str):
            try:
                return time.mktime(time.strptime(v[:19], "%Y-%m-%dT%H:%M:%S"))
            except (ValueError, TypeError):
                continue
    # Proxy: number of recorded sessions / allowed tools / history size
    score = 0
    for k in ("history", "allowedTools", "mcpServers"):
        v = entry.get(k)
        if isinstance(v, (list, dict)):
            score += len(v)
    return float(score)


# ---- Directory sync (chat transcripts) ---------------------------------------

def sync_dir(src_root: Path, dst_root: Path, direction: str, dry_run: bool) -> tuple[int, int, int]:
    """
    Incremental one-way directory copy: for each file under src_root, copy to
    dst_root iff size or mtime differs (beyond tolerance). Returns (copied,
    skipped, errors).

    This is a one-way walk — the caller runs it once for push (C->H) and
    once for pull (H->C) so both sides end up converged.
    """
    if not src_root.exists():
        return (0, 0, 0)

    copied = skipped = errors = 0
    for src_path in _walk_files(src_root):
        rel = src_path.relative_to(src_root)
        dst_path = dst_root / rel
        try:
            if _needs_copy(src_path, dst_path):
                copy_file(src_path, dst_path, dry_run)
                copied += 1
            else:
                skipped += 1
        except (OSError, PermissionError) as exc:
            errors += 1
            print(f"  [ERR] {direction}: {rel}: {exc}", file=sys.stderr)
    return copied, skipped, errors


def _walk_files(root: Path) -> Iterable[Path]:
    for dirpath, _dirnames, filenames in os.walk(root):
        d = Path(dirpath)
        for name in filenames:
            yield d / name


def _needs_copy(src: Path, dst: Path) -> bool:
    if not dst.exists():
        return True
    try:
        s = src.stat()
        d = dst.stat()
    except OSError:
        return True
    if s.st_size != d.st_size:
        return True
    if abs(s.st_mtime - d.st_mtime) > MTIME_TOLERANCE_S:
        # mtime diverged — copy only if src is actually newer
        return s.st_mtime > d.st_mtime
    return False


# ---- Orchestration -----------------------------------------------------------

def ensure_master() -> None:
    H_MASTER.mkdir(parents=True, exist_ok=True)
    (H_MASTER / "projects").mkdir(parents=True, exist_ok=True)


def sync_scalar_file(c_path: Path, h_path: Path, mode: str, dry_run: bool) -> str:
    """Handle one small scalar file per the requested direction."""
    if mode == "pull":
        src, dst = h_path, c_path
    elif mode == "push":
        src, dst = c_path, h_path
    else:
        return "skip"

    verdict = newer(src, dst)
    if verdict in ("a", "only_a"):
        copy_file(src, dst, dry_run)
        return "wrote"
    if verdict == "only_b":
        return "keep-existing"
    if verdict == "b":
        return "dst-newer"
    return "equal"


def run(mode: str, dry_run: bool) -> int:
    ensure_master()
    print(f"[claude-sync] mode={mode} dry_run={dry_run}")
    print(f"[claude-sync] C: base = {USER_HOME}")
    print(f"[claude-sync] H: base = {H_MASTER}")

    # --- .claude.json (always a per-project merge, regardless of direction) ---
    if mode == "pull":
        status = merge_claude_json(H_CLAUDE_JSON, C_CLAUDE_JSON, dry_run)
    elif mode == "push":
        status = merge_claude_json(C_CLAUDE_JSON, H_CLAUDE_JSON, dry_run)
    elif mode == "both":
        s1 = merge_claude_json(C_CLAUDE_JSON, H_CLAUDE_JSON, dry_run)
        s2 = merge_claude_json(H_CLAUDE_JSON, C_CLAUDE_JSON, dry_run)
        status = f"{s1} / {s2}"
    elif mode == "status":
        verdict = newer(C_CLAUDE_JSON, H_CLAUDE_JSON)
        status = f"compare={verdict}  C:mtime={human_mtime(C_CLAUDE_JSON)}  H:mtime={human_mtime(H_CLAUDE_JSON)}"
    else:
        status = "unknown-mode"
    print(f"  [.claude.json] {status}")

    # --- settings files (plain mtime-newest-wins, no merge) -------------------
    for c_path, h_path, label in (
        (C_SETTINGS, H_SETTINGS, "settings.json"),
        (C_SETTINGS_LOCAL, H_SETTINGS_LOCAL, "settings.local.json"),
    ):
        if mode == "status":
            print(f"  [{label}] compare={newer(c_path, h_path)}  C:{human_mtime(c_path)}  H:{human_mtime(h_path)}")
            continue
        if mode == "both":
            a = sync_scalar_file(c_path, h_path, "push", dry_run)
            b = sync_scalar_file(c_path, h_path, "pull", dry_run)
            print(f"  [{label}] push={a} pull={b}")
        else:
            print(f"  [{label}] {sync_scalar_file(c_path, h_path, mode, dry_run)}")

    # --- chat transcripts (bulk dir, incremental) ----------------------------
    if mode == "status":
        c_size = _dir_size(C_PROJECT_HISTORY)
        h_size = _dir_size(H_PROJECT_HISTORY)
        print(f"  [projects/H--prism] C:files={c_size[0]} ({c_size[1]}MB)  H:files={h_size[0]} ({h_size[1]}MB)")
        return 0

    if mode in ("pull", "both"):
        copied, skipped, errors = sync_dir(H_PROJECT_HISTORY, C_PROJECT_HISTORY, "H->C", dry_run)
        print(f"  [projects/H--prism pull] copied={copied} skipped={skipped} errors={errors}")
        if errors:
            return 2
    if mode in ("push", "both"):
        copied, skipped, errors = sync_dir(C_PROJECT_HISTORY, H_PROJECT_HISTORY, "C->H", dry_run)
        print(f"  [projects/H--prism push] copied={copied} skipped={skipped} errors={errors}")
        if errors:
            return 2

    return 0


def _dir_size(root: Path) -> tuple[int, int]:
    if not root.exists():
        return (0, 0)
    total_bytes = 0
    count = 0
    for f in _walk_files(root):
        try:
            total_bytes += f.stat().st_size
            count += 1
        except OSError:
            pass
    return (count, total_bytes // (1024 * 1024))


# ---- CLI --------------------------------------------------------------------

def main() -> int:
    p = argparse.ArgumentParser(description="Claude Code H:/C: state sync")
    p.add_argument("mode", choices=["pull", "push", "status", "both"],
                   help="pull=H:→C: (session start), push=C:→H: (before eject), both=push then pull")
    p.add_argument("--dry-run", action="store_true", help="show what would happen without writing")
    args = p.parse_args()
    return run(args.mode, args.dry_run)


if __name__ == "__main__":
    sys.exit(main())
