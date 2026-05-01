#!/usr/bin/env python3
"""Strip UTF-8 BOM from all JSON files in the repo (including dotfiles)."""
import os

count = 0
for root, dirs, files in os.walk("."):
    # Skip .git and node_modules
    dirs[:] = [d for d in dirs if d != ".git" and d != "node_modules"]
    for fname in files:
        if not fname.endswith(".json"):
            continue
        fpath = os.path.join(root, fname)
        with open(fpath, "rb") as fh:
            raw = fh.read(4)
        if raw[:3] == b"\xef\xbb\xbf":
            with open(fpath, "rb") as fh:
                full = fh.read()
            with open(fpath, "wb") as fh:
                fh.write(full[3:])
            count += 1
            print(f"  Stripped BOM: {fpath}")

print(f"\nTotal files stripped: {count}")
