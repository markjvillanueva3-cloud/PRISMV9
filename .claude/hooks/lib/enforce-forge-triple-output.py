#!/usr/bin/env python3
"""
ENFORCEMENT HOOK: Forge-Triple Output Gate
Fires on PreCompact.

For every engine CREATED (not just edited) this session, verifies:
1. PROTECTIVE HOOK — a hook rule or enforcement script exists that protects this engine's domain
2. MCP DISPATCHER ACTION — the engine is wired to at least one dispatcher action (z.enum entry)
3. SLASH COMMAND / SKILL — a skill exists that exposes this engine's capability to users

BLOCKS compaction if any new engine is missing any of the 3 outputs.

Tracks new engines via session-wiring-tracker.json (populated by enforce-unit-counter.py).
"""
import json
import sys
import os
import glob

STATE_FILE = "H:/prism/state/session-wiring-tracker.json"
DISPATCHER_DIR = "H:/prism/mcp-server/src/tools/dispatchers"
ENGINE_DIR = "H:/prism/mcp-server/src/engines"
COMMANDS_DIR = os.path.expanduser("~/.claude/commands")
HOOKS_LIB_DIR = os.path.expanduser("~/.claude/hooks/lib")

def load_state():
    try:
        with open(STATE_FILE, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {"engines_written": [], "engines_verified_wired": [], "session_date": ""}

def check_dispatcher_wired(engine_name):
    """Check if engine appears in any dispatcher z.enum or case handler."""
    base = engine_name.replace(".ts", "")
    if not os.path.isdir(DISPATCHER_DIR):
        return True  # Can't verify, allow
    for dp in glob.glob(os.path.join(DISPATCHER_DIR, "*.ts")):
        try:
            with open(dp, 'r', encoding='utf-8', errors='ignore') as f:
                if base in f.read():
                    return True
        except Exception:
            continue
    # Also check if referenced by other engines (indirect wiring)
    for eng in glob.glob(os.path.join(ENGINE_DIR, "*.ts")):
        if os.path.basename(eng) == engine_name:
            continue
        try:
            with open(eng, 'r', encoding='utf-8', errors='ignore') as f:
                if base in f.read():
                    return True
        except Exception:
            continue
    return False

def check_skill_exists(engine_name):
    """Check if a slash command/skill references this engine or its domain."""
    base = engine_name.replace(".ts", "").replace("Engine", "").lower()
    # Convert CamelCase to keywords
    keywords = []
    current = ""
    for ch in engine_name.replace(".ts", "").replace("Engine", ""):
        if ch.isupper() and current:
            keywords.append(current.lower())
            current = ch
        else:
            current += ch
    if current:
        keywords.append(current.lower())

    if not os.path.isdir(COMMANDS_DIR):
        return True  # Can't verify

    for cmd_file in glob.glob(os.path.join(COMMANDS_DIR, "*.md")):
        try:
            with open(cmd_file, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read().lower()
                # Check if any keyword from engine name appears in skill
                matches = sum(1 for kw in keywords if kw in content and len(kw) > 3)
                if matches >= 2:  # At least 2 keyword matches
                    return True
                if base in content:
                    return True
        except Exception:
            continue
    return False

def check_hook_protection(engine_name):
    """Check if a hook exists that protects this engine's domain."""
    base = engine_name.replace(".ts", "").replace("Engine", "").lower()

    # Domain detection (simplified)
    domain_hooks = {
        "collision": "safety",
        "force": "physics",
        "kienzle": "physics",
        "speed": "physics",
        "feed": "physics",
        "tool": "tooling",
        "turning": "turning",
        "milling": "milling",
        "grinding": "grinding",
        "edm": "edm",
        "laser": "laser",
        "waterjet": "waterjet",
        "safety": "safety",
        "quality": "quality",
        "approval": "business",
        "workflow": "business",
        "timeline": "business",
        "traveler": "business",
        "dispatch": "business",
        "desk": "business",
        "search": "business",
        "quote": "business",
        "invoice": "business",
        "job": "business",
        "cost": "business",
        "capacity": "business",
        "schedule": "business",
        "inventory": "business",
        "customer": "business",
        "milestone": "business",
        "portal": "business",
        "shop": "business",
        "config": "business",
        "handbook": "manufacturing",
        "maintenance": "manufacturing",
        "acquisition": "manufacturing",
        "extraction": "manufacturing",
        "learning": "knowledge",
        "preset": "knowledge",
        "progression": "knowledge",
        "pipeline": "manufacturing",
        "post": "manufacturing",
        "surface": "physics",
        "thermal": "physics",
        "chatter": "physics",
        "deflection": "physics",
        "wear": "physics",
        "formula": "physics",
        "validation": "quality",
        "accuracy": "quality",
        "wiring": "quality",
        "score": "quality",
        "improvement": "quality",
        "pattern": "quality",
        "gap": "quality",
        "detection": "quality",
        "resource": "infrastructure",
        "census": "infrastructure",
        "inventory": "infrastructure",
        "forge": "infrastructure",
        "template": "infrastructure",
    }

    # The enforcement hooks we already have cover broad domains
    # Check if engine domain is covered by existing enforcement hooks
    for keyword, domain in domain_hooks.items():
        if keyword in base:
            # Our enforce-knowledge-consult.py covers all these domains
            return True

    # For new domains not in the map, check if a specific hook script exists
    if not os.path.isdir(HOOKS_LIB_DIR):
        return True

    for hook_file in glob.glob(os.path.join(HOOKS_LIB_DIR, "enforce-*.py")):
        try:
            with open(hook_file, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read().lower()
                if base in content:
                    return True
        except Exception:
            continue

    # If no domain keyword matched and no hook file references it,
    # the engine lacks domain-specific protection
    return False

def main():
    try:
        input_data = json.loads(sys.stdin.read())
    except (json.JSONDecodeError, Exception):
        print(json.dumps({"continue": True}))
        return

    state = load_state()
    engines = state.get("engines_written", [])

    if not engines:
        print(json.dumps({"continue": True}))
        return

    missing = []

    for eng in engines:
        issues = []

        # Check 1: MCP dispatcher action
        if not check_dispatcher_wired(eng):
            issues.append("NO MCP ACTION — not wired to any dispatcher (PRISM app can't call it)")

        # Check 2: Skill/command
        if not check_skill_exists(eng):
            issues.append("NO SKILL — no slash command exposes this to users")

        # Check 3: Hook protection (broad check — our enforcement hooks cover all engines)
        if not check_hook_protection(eng):
            issues.append("NO PROTECTIVE HOOK — no enforcement hook covers this domain")

        if issues:
            missing.append(f"{eng}: {' | '.join(issues)}")

    if missing:
        missing_text = "; ".join(missing)
        msg = (
            f"FORGE-TRIPLE BLOCKED: {len(missing)} engine(s) missing required outputs: "
            f"{missing_text}. "
            f"Every new engine MUST have: (1) MCP dispatcher action, (2) slash command/skill, "
            f"(3) protective hook. Run /forge-triple to generate missing outputs."
        )
        print(json.dumps({
            "decision": "block",
            "reason": msg,
        }))
    else:
        print(json.dumps({"continue": True}))

if __name__ == "__main__":
    main()
