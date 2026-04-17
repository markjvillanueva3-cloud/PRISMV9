#!/usr/bin/env python3
"""
Auto-Effort Detection Hook (user-prompt-submit)
Analyzes the user's prompt and suggests /effort max when the task
warrants it. Non-blocking — just adds a suggestion to stderr.

Triggers on: roadmap work, architecture, multi-agent scrutiny,
physics/convergence, planning, multi-file changes, forge commands.
"""

import sys
import json
import re

def parse_hook_input():
    """Read hook input from stdin."""
    try:
        raw = sys.stdin.read()
        return json.loads(raw)
    except Exception:
        return {}

def detect_complexity(prompt: str) -> tuple[str, str]:
    """
    Analyze prompt text and return (effort_level, reason).
    Returns ("max", reason) or ("high", reason) or ("", "") if no change needed.
    """
    prompt_lower = prompt.lower()

    # MAX effort triggers — complex architecture, roadmap, scrutiny, physics
    max_triggers = [
        (r'/rgs|/roadmap|roadmap|/autopilot|/autopilot-full', "roadmap/autopilot work"),
        (r'/prism-review|/scrutinize\s+team|scrutin|multi.role|team.agent', "multi-role scrutiny"),
        (r'phase\s+\d|session\s+\d|milestone', "roadmap phase/session work"),
        (r'convergence|coupled|feedback.loop|iterative|nested.loop', "convergence/coupled physics"),
        (r'fusion.orchestrat|physics.fusion|plugin.registry', "fusion orchestrator work"),
        (r'architect|infrastructure|pipeline|upstream.*downstream', "architecture work"),
        (r'/forge-triple|/forge-engines|/forge-wiring|/forge-audit', "forge pipeline"),
        (r'plan\s+mode|/plan\b|brainstorm.*comprehensive', "planning mode"),
        (r'every\s+engine|all\s+\d{3,}|1,?245|entire\s+roadmap', "system-wide scope"),
        (r'kienzle.*taylor|johnson.cook|stability.lobe|convergence.engine', "physics engine work"),
    ]

    for pattern, reason in max_triggers:
        if re.search(pattern, prompt_lower):
            return ("max", reason)

    # HIGH effort triggers — moderate complexity
    high_triggers = [
        (r'/forge|/audit|/test\b|debug|refactor', "forge/test/debug work"),
        (r'engine|dispatcher|registry|algorithm', "engine/dispatcher work"),
        (r'fix.*bug|error|failing|broken', "bug investigation"),
        (r'wire|connect|integrate|downstream|upstream', "integration work"),
    ]

    for pattern, reason in high_triggers:
        if re.search(pattern, prompt_lower):
            return ("high", reason)

    return ("", "")

def main():
    data = parse_hook_input()

    # Extract the user's prompt text
    prompt = ""
    if isinstance(data, dict):
        # user-prompt-submit hook format
        prompt = data.get("prompt", "") or data.get("content", "") or ""
        if isinstance(prompt, list):
            # Multi-part content
            prompt = " ".join(
                p.get("text", "") if isinstance(p, dict) else str(p)
                for p in prompt
            )

    if not prompt:
        # No prompt to analyze — pass through
        print(json.dumps({"continue": True}))
        return

    level, reason = detect_complexity(prompt)

    if level == "max":
        # Suggest max effort
        print(json.dumps({"continue": True}), flush=True)
        print(f"[EFFORT] Task detected: {reason} → recommend /effort max for best results.", file=sys.stderr)
    elif level == "high":
        print(json.dumps({"continue": True}), flush=True)
        print(f"[EFFORT] Task detected: {reason} → /effort high recommended.", file=sys.stderr)
    else:
        print(json.dumps({"continue": True}))

if __name__ == "__main__":
    main()
