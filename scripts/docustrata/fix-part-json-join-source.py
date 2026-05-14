#!/usr/bin/env python3
"""
fix-part-json-join-source.py — correct the joinTableSource provenance string in
part.json manifests that were populated from the v6 join table but stamped "v5".

Why: PartFolderOrganizerEngine.populateFromJoinTable hardcoded the string
"blueprint-program-join-full-v5.jsonl row N" in the part.json it writes. The
ITER-5 populate run drained the v6 join (passed explicitly via joinJsonl=...v6),
but the LIVE MCP dispatcher runs the pre-edit dist build, so every folder it
*created* got stamped v5. The engine source is now fixed (derives the basename
from the actual joinPath) — this script repairs the manifests already on disk.

Scope: only part.json files modified within --window-min minutes of the populate
run (default 30) AND whose joinTableSource still references v5. The 363 folders
the populate *skipped* were genuinely built from v5 by the earlier phase18 run —
those keep their v5 provenance and are left untouched (their mtime is old).

Idempotent. --dry-run reports without writing.

Usage:
  H:/Tools/python/python.exe scripts/docustrata/fix-part-json-join-source.py [--dry-run] [--window-min N]
"""
from __future__ import annotations
import json
import os
import sys
import io
import time
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

LIB_ROOT = Path(r"H:\PRISM\JM DIE\_PART LIBRARY")
OLD_TOKEN = "blueprint-program-join-full-v5.jsonl"
NEW_TOKEN = "blueprint-program-join-full-v6.jsonl"

DRY = "--dry-run" in sys.argv
WINDOW_MIN = 30
for i, a in enumerate(sys.argv):
    if a == "--window-min" and i + 1 < len(sys.argv):
        WINDOW_MIN = int(sys.argv[i + 1])


def main() -> int:
    if not LIB_ROOT.exists():
        print(f"ERROR: {LIB_ROOT} not found", file=sys.stderr)
        return 1

    cutoff = time.time() - WINDOW_MIN * 60
    scanned = 0
    in_window = 0
    fixed = 0
    skipped_old = 0
    errors = 0

    for pj in LIB_ROOT.rglob("part.json"):
        scanned += 1
        try:
            st = pj.stat()
        except OSError:
            errors += 1
            continue
        if st.st_mtime < cutoff:
            continue  # not touched by the recent populate run
        in_window += 1
        try:
            m = json.loads(pj.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            errors += 1
            continue
        src = m.get("joinTableSource")
        if not isinstance(src, str) or OLD_TOKEN not in src:
            skipped_old += 1
            continue
        new_src = src.replace(OLD_TOKEN, NEW_TOKEN)
        if DRY:
            fixed += 1
            continue
        m["joinTableSource"] = new_src
        m["lastUpdatedAt"] = time.strftime("%Y-%m-%dT%H:%M:%S%z")
        # always traceable — create notes[] if absent / non-list
        note = ("joinTableSource corrected v5 -> v6 by "
                "fix-part-json-join-source.py (populate ran against v6; "
                "stale dist had stamped v5).")
        notes = m.get("notes")
        if not isinstance(notes, list):
            notes = []
            m["notes"] = notes
        if note not in notes:
            notes.append(note)
        # atomic write: tmp + os.replace — a crash mid-write can never leave a
        # truncated production manifest (which json.loads would then skip
        # forever, silently un-repairable)
        try:
            tmp = pj.with_suffix(".json.tmp")
            tmp.write_text(json.dumps(m, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
            os.replace(tmp, pj)
            fixed += 1
        except OSError:
            errors += 1

    print(f"part.json scanned:            {scanned}")
    print(f"  modified in last {WINDOW_MIN}min:  {in_window}")
    print(f"  joinTableSource v5 -> v6:   {fixed}{'  (dry-run)' if DRY else ''}")
    print(f"  already non-v5 (left as-is): {skipped_old}")
    print(f"  errors:                     {errors}")
    return 0 if errors == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
