#!/usr/bin/env python
"""Sync files from C:/PRISM and Claude dirs to H:/prism when missing on H:.

Strategy:
 - Walk C:/PRISM recursively, skip noise (venv, node_modules, .git, backups)
 - For each file, compute its relative path to C:/PRISM/
 - Check if H:/prism/<rel_path> exists and has the same size (cheap compare)
 - If missing or size differs, add to copy plan
 - Also scan C:/Users/wompu/.claude and propose copies into H:/prism/.claude
   ONLY for files not already there

Run with --dry-run to see the plan. Run without to execute.
"""

from __future__ import annotations

import argparse
import os
import shutil
import sys
from pathlib import Path

C_PRISM = Path("C:/PRISM")
H_PRISM = Path("H:/prism")
C_USER_CLAUDE = Path("C:/Users/wompu/.claude")
H_CLAUDE = Path("H:/prism/.claude")

# Directories/files to never copy (noise, regenerable, or should stay on C:)
SKIP_DIRS = {
    ".venv", ".venv2", "venv",
    "node_modules",
    ".git",
    "__pycache__",
    ".pytest_cache", ".mypy_cache", ".ruff_cache",
    "dist", "build",
    "backups", "backup",
    "%SystemDrive%",          # Windows env-var artifact
    ".remote-plugins",
    ".playwright-cli",
    ".cowork-lib", ".cowork-perm-req", ".cowork-perm-resp",
    ".tmp",
    "LAUNCH",                 # launcher scripts — may be OS-specific
    ".codex",                 # codex config may be user-specific
    "cache",                  # regenerable
    "debug",                  # transient
    "file-history",           # Claude Code history, not project data
    "history",                # Claude Code history
}

SKIP_FILE_PATTERNS = (
    ".log", ".tmp", ".cache", ".pyc", ".pyo",
    ".exe", ".dmg",           # installers not project data
    ".DS_Store", "Thumbs.db",
)

SKIP_FILENAMES = {
    "history.jsonl",           # Claude Code harness history — not project data
    "copy-log.txt", "copy-chats-log.txt",
}


def should_skip_dir(name: str) -> bool:
    return name in SKIP_DIRS or name.startswith(".venv")


def should_skip_file(path: Path) -> bool:
    if path.name in SKIP_FILENAMES:
        return True
    if any(path.name.endswith(ext) for ext in SKIP_FILE_PATTERNS):
        return True
    # Weird artifacts: C:UserswompuAppDataLocalTempvalidate_rgs.py
    if path.name.startswith("C:Users"):
        return True
    return False


def walk_source(root: Path):
    """Yield (abs_path, rel_path) for files under root, skipping noise."""
    if not root.exists():
        return
    for dirpath, dirnames, filenames in os.walk(root):
        # Prune skipped dirs in-place so os.walk doesn't descend
        dirnames[:] = [d for d in dirnames if not should_skip_dir(d)]
        for fn in filenames:
            abs_path = Path(dirpath) / fn
            if should_skip_file(abs_path):
                continue
            try:
                rel = abs_path.relative_to(root)
            except ValueError:
                continue
            yield abs_path, rel


def plan_sync(src_root: Path, dst_root: Path, label: str) -> list[tuple[Path, Path, str]]:
    """Return list of (src, dst, reason) for files to copy."""
    plan: list[tuple[Path, Path, str]] = []
    for src_abs, rel in walk_source(src_root):
        dst_abs = dst_root / rel
        if not dst_abs.exists():
            plan.append((src_abs, dst_abs, f"[{label}] missing on H:"))
            continue
        try:
            src_size = src_abs.stat().st_size
            dst_size = dst_abs.stat().st_size
        except OSError:
            continue
        if src_size != dst_size:
            # Size differs — consider replacement only if src is newer AND larger
            try:
                src_mtime = src_abs.stat().st_mtime
                dst_mtime = dst_abs.stat().st_mtime
            except OSError:
                continue
            if src_mtime > dst_mtime and src_size > dst_size:
                plan.append((src_abs, dst_abs, f"[{label}] newer+larger on C:"))
    return plan


def execute(plan: list[tuple[Path, Path, str]], dry_run: bool) -> dict:
    """Execute the copy plan. Returns summary dict."""
    copied = 0
    skipped = 0
    failed = 0
    total_bytes = 0
    for src, dst, reason in plan:
        if dry_run:
            skipped += 1
            continue
        try:
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)
            total_bytes += dst.stat().st_size
            copied += 1
        except (OSError, shutil.Error) as e:
            print(f"FAIL: {src} -> {dst}: {e}")
            failed += 1
    return {"copied": copied, "skipped": skipped, "failed": failed, "bytes": total_bytes}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="Plan only, no copies")
    ap.add_argument("--limit", type=int, default=0, help="Limit plan size (0 = all)")
    ap.add_argument("--verbose", action="store_true")
    args = ap.parse_args()

    all_plans: list[tuple[Path, Path, str]] = []

    # 1) C:/PRISM → H:/prism
    if C_PRISM.exists():
        print(f"Scanning {C_PRISM} ...")
        plan1 = plan_sync(C_PRISM, H_PRISM, "PRISM")
        print(f"  {len(plan1)} files to copy from C:/PRISM")
        all_plans.extend(plan1)
    else:
        print(f"Skip: {C_PRISM} does not exist")

    # 2) C:/Users/wompu/.claude → H:/prism/.claude  (project-level only)
    if C_USER_CLAUDE.exists():
        print(f"Scanning {C_USER_CLAUDE} (for missing project-level claude files) ...")
        plan2 = plan_sync(C_USER_CLAUDE, H_CLAUDE, "CLAUDE")
        print(f"  {len(plan2)} files to copy from user-level .claude")
        all_plans.extend(plan2)

    if args.limit:
        all_plans = all_plans[: args.limit]

    if args.verbose or args.dry_run:
        for src, dst, reason in all_plans[:40]:
            size = src.stat().st_size
            print(f"  {reason:30s} {size:>10} {src} -> {dst}")
        if len(all_plans) > 40:
            print(f"  ... and {len(all_plans) - 40} more")

    print(f"\nTotal planned copies: {len(all_plans)}")
    if args.dry_run:
        print("(dry-run — no files copied)")
        return 0

    summary = execute(all_plans, dry_run=False)
    print(f"\nCopied: {summary['copied']}")
    print(f"Failed: {summary['failed']}")
    print(f"Total bytes: {summary['bytes']:,}")
    return 0 if summary["failed"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
