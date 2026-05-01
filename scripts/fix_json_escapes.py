#!/usr/bin/env python3
"""Fix invalid backslash escapes in JSON files, then verify all non-excluded JSON."""
import json
import sys
import glob
import os

# Mode 1: fix specific files
files = [
    "data/coordination/UNIFIED_PATH_CONFIG.json",
    "mcp-server/MCP_TOOL_CONTRACTS.json",
    "mcp-server/RESOURCE_CLASSIFICATION.json",
]

VALID_ESCAPES = set('"' + "\\" + '/bfnrtu')

for f in files:
    content = open(f, encoding="utf-8").read()
    result = []
    i = 0
    while i < len(content):
        ch = content[i]
        if ch == "\\" and i + 1 < len(content):
            nxt = content[i + 1]
            if nxt in VALID_ESCAPES:
                result.append(ch)
                result.append(nxt)
                i += 2
            else:
                # Unescaped backslash - double it
                result.append("\\\\")
                i += 1
        else:
            result.append(ch)
            i += 1

    fixed = "".join(result)
    try:
        json.loads(fixed)
        with open(f, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(fixed)
        print(f"FIXED: {f}")
    except json.JSONDecodeError as e:
        print(f"STILL BROKEN: {f} - {e}")
        sys.exit(1)

# Mode 2: verify all non-excluded JSON
print("\n--- Verification scan ---")
excluded = ["archives", "state/externalized", "state/inference-logs", "state/ralph_loops"]
fails = []
for fp in sorted(glob.glob("**/*.json", recursive=True)):
    fn = fp.replace(os.sep, "/")
    if any(fn.startswith(ex) for ex in excluded):
        continue
    if "/node_modules/" in fn:
        continue
    try:
        json.load(open(fp, encoding="utf-8"))
    except Exception as e:
        fails.append((fn, str(e)[:100]))

if fails:
    print(f"REMAINING FAILURES: {len(fails)}")
    for fn, err in fails:
        print(f"  {fn}: {err}")
    sys.exit(1)
else:
    print("All non-excluded JSON files validate OK.")
