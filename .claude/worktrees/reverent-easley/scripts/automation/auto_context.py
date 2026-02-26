"""
PRISM Auto-Context Injector v1.0
================================
Generates minimal context for session start.
Outputs ~100-200 tokens of essential state info.

Usage:
    py -3 C:\PRISM\scripts\automation\auto_context.py
    py -3 C:\PRISM\scripts\automation\auto_context.py --clipboard
    py -3 C:\PRISM\scripts\automation\auto_context.py --file context.txt

This script generates a compact context block that can be:
1. Pasted into Claude at session start
2. Auto-copied to clipboard
3. Saved to a file for reference
"""

import json
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional

# Paths
PRISM_ROOT = Path(r"C:\PRISM")
STATE_FILE = PRISM_ROOT / "state" / "CURRENT_STATE.json"
SKILL_REGISTRY = PRISM_ROOT / "data" / "coordination" / "SKILL_TREE_REGISTRY.json"

CONTEXT_TEMPLATE = """â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
PRISM SESSION CONTEXT | {timestamp}
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

## State
- Version: {version}
- Session: {session_id} ({session_status})
- Phase: {phase}

## Quick Resume
{quick_resume}

## Current Task
{task_name} - {task_status}

## Infrastructure
- Skills: {skill_count} | Agents: {agent_count} | Formulas: {formula_count}
- Hooks: {hook_count} enforcing

## Key Paths
- State: C:\\PRISM\\state\\CURRENT_STATE.json
- Skills: C:\\PRISM\\skills\\ (or /mnt/skills/user/)
- Extracted: C:\\PRISM\\extracted\\

## Buffer Zone
ðŸŸ¢ GREEN (0 tool calls) - Full speed ahead

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
"""

MINIMAL_TEMPLATE = """PRISM {version} | {session_id} ({session_status})
Resume: {quick_resume_short}
Task: {task_name} - {task_status}
Skills: {skill_count} | Agents: {agent_count}"""


def load_state() -> Dict[str, Any]:
    """Load current state from JSON."""
    if not STATE_FILE.exists():
        return {}
    
    with open(STATE_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def load_skill_count() -> int:
    """Get total skill count from registry."""
    if not SKILL_REGISTRY.exists():
        return 0
    
    try:
        with open(SKILL_REGISTRY, "r", encoding="utf-8") as f:
            registry = json.load(f)
        return registry.get("metadata", {}).get("total_skills", 0)
    except:
        return 0


def generate_context(minimal: bool = False) -> str:
    """Generate context string."""
    state = load_state()
    
    # Extract values with defaults
    version = state.get("version", "unknown")
    session = state.get("currentSession", {})
    session_id = session.get("id", "NEW")
    session_status = session.get("status", "UNKNOWN")
    phase = session.get("phase", "N/A")
    quick_resume = state.get("quickResume", "No resume information available")
    
    task = state.get("currentTask", {})
    task_name = task.get("name", "No task")
    task_status = task.get("status", "UNKNOWN")
    
    infra = state.get("infrastructure", {})
    skill_count = infra.get("skillTree", {}).get("totalSkills", load_skill_count())
    agent_count = infra.get("agentsRegistered", 64)
    formula_count = infra.get("formulasActive", 22)
    hook_count = infra.get("hooksEnforcing", 147)
    
    if minimal:
        # Truncate quick resume for minimal version
        quick_resume_short = quick_resume[:80] + "..." if len(quick_resume) > 80 else quick_resume
        
        return MINIMAL_TEMPLATE.format(
            version=version,
            session_id=session_id,
            session_status=session_status,
            quick_resume_short=quick_resume_short,
            task_name=task_name,
            task_status=task_status,
            skill_count=skill_count,
            agent_count=agent_count
        )
    else:
        return CONTEXT_TEMPLATE.format(
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M"),
            version=version,
            session_id=session_id,
            session_status=session_status,
            phase=phase,
            quick_resume=quick_resume,
            task_name=task_name,
            task_status=task_status,
            skill_count=skill_count,
            agent_count=agent_count,
            formula_count=formula_count,
            hook_count=hook_count
        )


def copy_to_clipboard(text: str) -> bool:
    """Copy text to clipboard (Windows)."""
    try:
        import subprocess
        process = subprocess.Popen(
            ['clip'],
            stdin=subprocess.PIPE,
            shell=True
        )
        process.communicate(text.encode('utf-8'))
        return True
    except:
        return False


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Generate PRISM session context")
    parser.add_argument("--clipboard", "-c", action="store_true", help="Copy to clipboard")
    parser.add_argument("--file", "-f", help="Save to file")
    parser.add_argument("--minimal", "-m", action="store_true", help="Minimal output (~50 tokens)")
    parser.add_argument("--quiet", "-q", action="store_true", help="No console output")
    
    args = parser.parse_args()
    
    context = generate_context(minimal=args.minimal)
    
    # Output to console
    if not args.quiet:
        print(context)
    
    # Copy to clipboard
    if args.clipboard:
        if copy_to_clipboard(context):
            if not args.quiet:
                print("\nâœ“ Copied to clipboard!")
        else:
            print("\nâš  Failed to copy to clipboard")
    
    # Save to file
    if args.file:
        output_path = Path(args.file)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(context)
        if not args.quiet:
            print(f"\nâœ“ Saved to {output_path}")


if __name__ == "__main__":
    main()


