#!/usr/bin/env python3
"""
ENFORCEMENT HOOK: Auto-Update ENGINE_DIGEST After Engine Creation
Fires on PostToolUse for Write to src/engines/*.ts (new engine files only).

When a NEW engine file is created, automatically appends it to ENGINE_DIGEST.md
so the index is ALWAYS current. This prevents the cycle:
  build engine → forget to update index → index goes stale → try to rebuild same engine

Also tracks in a pending-index-update.json so the PreCompact hook can verify
MASTER_INDEX_COMPACT.md was also updated.
"""
import json
import sys
import os
from datetime import datetime

ENGINE_DIGEST = "H:/prism/mcp-server/data/docs/ENGINE_DIGEST.md"
PENDING_FILE = "H:/prism/state/pending-index-update.json"

def main():
    try:
        input_data = json.loads(sys.stdin.read())
    except (json.JSONDecodeError, Exception):
        print(json.dumps({"continue": True}))
        return

    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})
    file_path = str(tool_input.get("file_path", "")).replace("\\", "/")

    # Only on NEW engine files (Write, not Edit)
    if tool_name != "Write":
        print(json.dumps({"continue": True}))
        return
    if "src/engines/" not in file_path or not file_path.endswith(".ts") or ".test." in file_path:
        print(json.dumps({"continue": True}))
        return

    engine_name = os.path.basename(file_path).replace(".ts", "")

    # Check if already in ENGINE_DIGEST
    already_indexed = False
    if os.path.exists(ENGINE_DIGEST):
        try:
            with open(ENGINE_DIGEST, 'r', encoding='utf-8', errors='ignore') as f:
                if engine_name in f.read():
                    already_indexed = True
        except Exception:
            pass

    if not already_indexed:
        # Auto-append to ENGINE_DIGEST
        try:
            with open(ENGINE_DIGEST, 'a', encoding='utf-8') as f:
                f.write(f"\n- **{engine_name}**: {engine_name} — [AUTO-ADDED, needs description]\n")
        except Exception:
            pass

        # Track as pending MASTER_INDEX update
        try:
            pending = {}
            if os.path.exists(PENDING_FILE):
                with open(PENDING_FILE, 'r') as f:
                    pending = json.load(f)
        except (json.JSONDecodeError, Exception):
            pending = {}

        if "engines" not in pending:
            pending["engines"] = []
        if engine_name not in pending["engines"]:
            pending["engines"].append(engine_name)
        pending["last_updated"] = datetime.now().isoformat()

        os.makedirs(os.path.dirname(PENDING_FILE), exist_ok=True)
        with open(PENDING_FILE, 'w') as f:
            json.dump(pending, f, indent=2)

        msg = (
            f"INDEX AUTO-UPDATED: {engine_name} appended to ENGINE_DIGEST.md. "
            f"Also update MASTER_INDEX_COMPACT.md with a proper description before compacting."
        )
        print(json.dumps({
            "hookSpecificOutput": {
                "hookEventName": "PostToolUse",
                "additionalContext": msg
            }
        }))
    else:
        print(json.dumps({"continue": True}))

if __name__ == "__main__":
    main()
