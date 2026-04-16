#!/usr/bin/env python
"""Selective sync: copy ONLY high-value items from C: to H:, avoiding the
458k-file duplicate PRISM/ tree.

Scope:
 - C:/PRISM/cad-engine/**       (all content — small; critical state)
 - C:/PRISM/mcp-server/**       (all content — small; may have state we need)
 - C:/PRISM/.claude/            (project-level claude config)
 - Root .md files on C:/PRISM/ not already on H:/prism/
"""

from __future__ import annotations

import os
import shutil
import sys
from pathlib import Path

PAIRS: list[tuple[Path, Path]] = [
    (Path("C:/PRISM/cad-engine"), Path("H:/prism/cad-engine")),
    (Path("C:/PRISM/mcp-server"), Path("H:/prism/mcp-server")),
    (Path("C:/PRISM/.claude"),    Path("H:/prism/.claude")),
]

SKIP_DIRS = {".venv", ".venv2", "node_modules", ".git", "__pycache__",
             "dist", "build", "backups", "cache", "debug"}


def sync_pair(src_root: Path, dst_root: Path, dry_run: bool) -> tuple[int, int, int]:
    """Copy missing files from src to dst. Returns (copied, skipped, failed)."""
    copied = skipped = failed = 0
    if not src_root.exists():
        return 0, 0, 0
    for dirpath, dirnames, filenames in os.walk(src_root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.startswith(".venv")]
        for fn in filenames:
            src = Path(dirpath) / fn
            if fn.endswith((".pyc", ".log", ".tmp", ".cache")):
                continue
            if fn.startswith("C:Users"):  # malformed-name artifacts
                continue
            try:
                rel = src.relative_to(src_root)
            except ValueError:
                continue
            dst = dst_root / rel
            if dst.exists():
                # Keep the larger/newer one on H:
                try:
                    if dst.stat().st_size >= src.stat().st_size:
                        skipped += 1
                        continue
                    if dst.stat().st_mtime >= src.stat().st_mtime:
                        skipped += 1
                        continue
                except OSError:
                    skipped += 1
                    continue
                # src is newer AND larger — replace
                action = "replace"
            else:
                action = "copy"
            print(f"  {action}: {src} -> {dst}")
            if dry_run:
                continue
            try:
                dst.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src, dst)
                copied += 1
            except (OSError, shutil.Error) as e:
                print(f"  FAIL: {e}")
                failed += 1
    return copied, skipped, failed


# Root-level .md and .json on C:/PRISM/ — copy if missing on H:/prism/
def sync_root_files(dry_run: bool) -> tuple[int, int]:
    copied = failed = 0
    src_root = Path("C:/PRISM")
    dst_root = Path("H:/prism")
    if not src_root.exists():
        return 0, 0
    for item in src_root.iterdir():
        if not item.is_file():
            continue
        if not item.suffix.lower() in (".md", ".json", ".toml", ".yaml", ".yml"):
            continue
        if item.name.startswith("C:Users") or item.name.startswith("%"):
            continue
        dst = dst_root / item.name
        if dst.exists():
            continue
        print(f"  copy-root: {item} -> {dst}")
        if dry_run:
            continue
        try:
            shutil.copy2(item, dst)
            copied += 1
        except (OSError, shutil.Error) as e:
            print(f"  FAIL: {e}")
            failed += 1
    return copied, failed


def main() -> int:
    dry_run = "--dry-run" in sys.argv
    total_copied = total_skipped = total_failed = 0

    for src, dst in PAIRS:
        print(f"\n== {src} -> {dst} ==")
        c, s, f = sync_pair(src, dst, dry_run)
        total_copied += c
        total_skipped += s
        total_failed += f

    print("\n== root-level files on C:/PRISM ==")
    rc, rf = sync_root_files(dry_run)
    total_copied += rc
    total_failed += rf

    print(f"\n{'DRY-RUN:' if dry_run else 'DONE:'} copied={total_copied} skipped={total_skipped} failed={total_failed}")
    return 0 if total_failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
