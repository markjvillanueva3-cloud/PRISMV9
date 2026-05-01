#!/usr/bin/env python3
"""
PRISM Drive Remap Script
Rewrites all C:/PRISM (or any source drive) references to a target drive.
Usage: python remap-drive.py [FROM_DRIVE] [TO_DRIVE]
  e.g. python remap-drive.py C H     (remap C:\PRISM -> H:\prism)
       python remap-drive.py H C     (remap back)
"""

import os, sys, re, json, glob

FROM = sys.argv[1].upper().rstrip(":") if len(sys.argv) > 1 else "C"
TO   = sys.argv[2].upper().rstrip(":") if len(sys.argv) > 2 else "H"

HOME = os.environ.get("USERPROFILE", os.path.expanduser("~"))

# All path variations we need to catch
REPLACEMENTS = [
    # Forward-slash variants (most common in JSON/Python/MD)
    (f"{FROM}:/PRISM/",  f"{TO}:/prism/"),
    (f"{FROM}:/PRISM\\", f"{TO}:/prism\\"),
    (f"{FROM}:/Prism/",  f"{TO}:/prism/"),
    (f"{FROM}:/Prism\\", f"{TO}:/prism\\"),
    # Backslash variants (common in JSON strings with escaped backslashes)
    (f"{FROM}:\\\\PRISM\\\\", f"{TO}:\\\\prism\\\\"),
    (f"{FROM}:\\\\Prism\\\\", f"{TO}:\\\\prism\\\\"),
    # Raw backslash (in non-JSON text files)
    (f"{FROM}:\\PRISM\\", f"{TO}:\\prism\\"),
    (f"{FROM}:\\Prism\\", f"{TO}:\\prism\\"),
    # End-of-value (no trailing slash)
    (f"{FROM}:/PRISM\"", f"{TO}:/prism\""),
    (f"{FROM}:\\\\PRISM\"", f"{TO}:\\\\prism\""),
    (f"{FROM}:\\PRISM\"", f"{TO}:\\prism\""),
    (f"{FROM}:/Prism\"", f"{TO}:/prism\""),
    (f"{FROM}:\\\\Prism\"", f"{TO}:\\\\prism\""),
    # Also handle PRISM REBUILD references
    (f"{FROM}:/PRISM REBUILD", f"{TO}:/prism REBUILD"),
    (f"{FROM}:\\\\PRISM REBUILD", f"{TO}:\\\\prism REBUILD"),
]

# Files and directories to process
TARGETS = [
    # Claude Desktop config
    os.path.join(HOME, "AppData", "Roaming", "Claude", "claude_desktop_config.json"),
    # Claude Code settings
    os.path.join(HOME, ".claude", "settings.json"),
    # Hook scripts
    *glob.glob(os.path.join(HOME, ".claude", "hooks", "lib", "*.py")),
    *glob.glob(os.path.join(HOME, ".claude", "hooks", "lib", "*.sh")),
    # PRISM root config/docs (on TO drive)
    *glob.glob(f"{TO}:/prism/*.md"),
    *glob.glob(f"{TO}:/prism/*.json"),
    # PATH_CONFIG
    f"{TO}:/prism/PATH_CONFIG.json",
    # State files
    *glob.glob(f"{TO}:/prism/state/*.json"),
    *glob.glob(f"{TO}:/prism/state/*.md"),
    *glob.glob(f"{TO}:/prism/state/*.jsonl"),
    *glob.glob(f"{TO}:/prism/state/shared/memory/*.md"),
    *glob.glob(f"{TO}:/prism/state/externalized/*.json"),
    *glob.glob(f"{TO}:/prism/state/externalized/*.jsonl"),
    *glob.glob(f"{TO}:/prism/state/forge-learn/*.json"),
    *glob.glob(f"{TO}:/prism/state/logs/*.jsonl"),
    *glob.glob(f"{TO}:/prism/state/results/*.json"),
    # PRISM Desktop project instructions
    f"{TO}:/prism/PRISM-DESKTOP-PROJECT-INSTRUCTIONS.md",
]

# Deduplicate
TARGETS = list(dict.fromkeys(TARGETS))

stats = {"files_checked": 0, "files_changed": 0, "replacements": 0}

for filepath in TARGETS:
    if not os.path.isfile(filepath):
        continue
    stats["files_checked"] += 1
    try:
        with open(filepath, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
    except Exception as e:
        print(f"  SKIP (read error): {filepath} — {e}")
        continue

    original = content
    file_replacements = 0
    for old, new in REPLACEMENTS:
        count = content.count(old)
        if count > 0:
            content = content.replace(old, new)
            file_replacements += count

    if file_replacements > 0:
        try:
            with open(filepath, "w", encoding="utf-8", newline="\n") as f:
                f.write(content)
            stats["files_changed"] += 1
            stats["replacements"] += file_replacements
            print(f"  UPDATED ({file_replacements:3d} replacements): {filepath}")
        except Exception as e:
            print(f"  SKIP (write error): {filepath} — {e}")

print(f"\n{'='*60}")
print(f"  Drive remap: {FROM}: -> {TO}:")
print(f"  Files checked:  {stats['files_checked']}")
print(f"  Files changed:  {stats['files_changed']}")
print(f"  Replacements:   {stats['replacements']}")
print(f"{'='*60}")
