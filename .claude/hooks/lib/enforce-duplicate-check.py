#!/usr/bin/env python3
"""
ENFORCEMENT HOOK: Duplicate Engine Prevention
Fires on PreToolUse for Write to src/engines/*.ts (new engine creation).

Before creating a NEW engine, searches ENGINE_DIGEST.md for similar names.
If a match is found, WARNS with the existing engine(s) — does not block (false positive risk).

This prevents the cycle: build → forget → try to rebuild the same thing.
"""
import json
import sys
import os
import re

ENGINE_DIGEST = "H:/prism/mcp-server/data/docs/ENGINE_DIGEST.md"

def extract_keywords(engine_name):
    """Extract meaningful keywords from an engine name."""
    name = engine_name.replace(".ts", "").replace("Engine", "")
    # Split CamelCase
    words = re.findall(r'[A-Z][a-z]+|[a-z]+|[A-Z]+(?=[A-Z][a-z]|\d|\b)', name)
    return [w.lower() for w in words if len(w) > 2]

def search_digest(keywords):
    """Search ENGINE_DIGEST.md for lines matching any keyword."""
    if not os.path.exists(ENGINE_DIGEST):
        return []

    matches = []
    try:
        with open(ENGINE_DIGEST, 'r', encoding='utf-8', errors='ignore') as f:
            for line in f:
                line_lower = line.lower()
                matched_kws = [kw for kw in keywords if kw in line_lower]
                if len(matched_kws) >= 2:  # At least 2 keyword matches
                    matches.append(line.strip())
                elif len(matched_kws) == 1 and len(keywords) == 1:
                    matches.append(line.strip())
    except Exception:
        pass

    return matches[:10]  # Limit to 10 matches

def main():
    try:
        input_data = json.loads(sys.stdin.read())
    except (json.JSONDecodeError, Exception):
        print(json.dumps({"continue": True}))
        return

    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})
    file_path = str(tool_input.get("file_path", "")).replace("\\", "/")

    # Only check NEW engine files (Write, not Edit)
    if tool_name != "Write":
        print(json.dumps({"continue": True}))
        return
    if "src/engines/" not in file_path or not file_path.endswith(".ts") or ".test." in file_path:
        print(json.dumps({"continue": True}))
        return

    engine_name = os.path.basename(file_path)
    keywords = extract_keywords(engine_name)

    if not keywords:
        print(json.dumps({"continue": True}))
        return

    matches = search_digest(keywords)

    if matches:
        match_text = "\\n  ".join(matches[:5])
        msg = (
            f"DUPLICATE CHECK for {engine_name}: Found {len(matches)} similar engine(s) in ENGINE_DIGEST.md:\\n"
            f"  {match_text}\\n"
            f"VERIFY these are NOT the same capability before creating a new engine. "
            f"If an existing engine does what you need, WIRE it instead of rebuilding. "
            f"If this IS genuinely new, proceed — but read the existing engine(s) first."
        )
        # WARN, not block — there may be legitimate reasons to create a new engine
        # with similar keywords (e.g., TurningForceEngine vs TurningForceValidationEngine)
        print(json.dumps({
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "additionalContext": msg
            }
        }))
    else:
        print(json.dumps({"continue": True}))

if __name__ == "__main__":
    main()
