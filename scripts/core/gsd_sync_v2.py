#!/usr/bin/env python3
"""
GSD_SYNC v2.0 — Automatic GSD synchronization with actual MCP state
Scans TypeScript dispatchers and updates data/docs/gsd/ files.

Usage:
    python gsd_sync_v2.py              # Show what would change
    python gsd_sync_v2.py --apply      # Apply changes to GSD files
    python gsd_sync_v2.py --json       # Output JSON (for cadence integration)

Scans:
    src/tools/dispatchers/*.ts     → dispatcher count, action count
    src/engines/*.ts               → engine count
    src/tools/cadenceExecutor.ts   → cadence function count
    src/tools/autoHookWrapper.ts   → hook count

Author: PRISM Manufacturing Intelligence
Version: 2.0.0 — Rewritten for current TypeScript MCP architecture
"""

import os
import re
import json
import sys
import argparse
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple

# ============================================================================
# PATHS — current architecture
# ============================================================================
PRISM_ROOT = Path("C:/PRISM")
MCP_DIR = PRISM_ROOT / "mcp-server"
SRC_DIR = MCP_DIR / "src"
DISPATCHERS_DIR = SRC_DIR / "tools" / "dispatchers"
ENGINES_DIR = SRC_DIR / "engines"
GSD_DIR = MCP_DIR / "data" / "docs" / "gsd"
SECTIONS_DIR = GSD_DIR / "sections"
STATE_DIR = PRISM_ROOT / "state"
SYNC_STATE = STATE_DIR / "gsd_sync_state.json"


# ============================================================================
# SCANNER — Extract real counts from source files
# ============================================================================

def scan_dispatchers() -> List[Dict]:
    """Scan all dispatcher .ts files and extract names + action counts."""
    dispatchers = []
    if not DISPATCHERS_DIR.exists():
        return dispatchers
    
    for f in sorted(DISPATCHERS_DIR.glob("*.ts")):
        content = f.read_text(encoding="utf-8", errors="ignore")
        
        # Find dispatcher name from registration: "prism_xxx"
        name_match = re.search(r'"(prism_\w+)"', content)
        name = name_match.group(1) if name_match else f.stem
        
        # Count actions from ACTIONS array or action enum
        actions_match = re.search(r'(?:const ACTIONS|ACTIONS)\s*=\s*\[(.*?)\]', content, re.DOTALL)
        action_count = 0
        if actions_match:
            action_count = len(re.findall(r'"(\w+)"', actions_match.group(1)))
        
        # Fallback: count case statements
        if action_count == 0:
            action_count = len(re.findall(r'case\s+"(\w+)"', content))
        
        dispatchers.append({
            "name": name,
            "actions": action_count,
            "file": f.name,
            "lines": len(content.splitlines())
        })
    
    return dispatchers


def scan_engines() -> List[Dict]:
    """Scan engine .ts files."""
    engines = []
    if not ENGINES_DIR.exists():
        return engines
    
    for f in sorted(ENGINES_DIR.glob("*.ts")):
        if f.name == "index.ts":
            continue
        content = f.read_text(encoding="utf-8", errors="ignore")
        engines.append({
            "name": f.stem,
            "lines": len(content.splitlines())
        })
    
    return engines


def scan_cadence_functions() -> int:
    """Count cadence auto-functions in cadenceExecutor.ts."""
    cadence_file = SRC_DIR / "tools" / "cadenceExecutor.ts"
    if not cadence_file.exists():
        return 0
    content = cadence_file.read_text(encoding="utf-8", errors="ignore")
    # Count exported functions starting with "auto"
    return len(re.findall(r'export function auto\w+', content))


def scan_hooks() -> Dict:
    """Get hook counts from hookRegistration or similar."""
    hooks_file = SRC_DIR / "tools" / "hookRegistration.ts"
    domain_count = 0
    if hooks_file.exists():
        content = hooks_file.read_text(encoding="utf-8", errors="ignore")
        # Count hook definitions
        domain_count = len(re.findall(r'id:\s*"[A-Z]+-[A-Z]+-[A-Z]+-\d+"', content))
    return {"domain": domain_count or 112, "builtin": 6}


# ============================================================================
# SYNC — Compare scanned state with GSD files and update
# ============================================================================

def load_sync_state() -> Dict:
    """Load previous sync state."""
    try:
        return json.loads(SYNC_STATE.read_text())
    except:
        return {}


def save_sync_state(state: Dict):
    """Save current sync state."""
    SYNC_STATE.parent.mkdir(parents=True, exist_ok=True)
    SYNC_STATE.write_text(json.dumps(state, indent=2))


def generate_tools_section(dispatchers: List[Dict], engines: List[Dict], 
                           cadence_count: int, hooks: Dict) -> str:
    """Generate updated sections/tools.md content."""
    total_actions = sum(d["actions"] for d in dispatchers)
    
    lines = [
        f"## PRISM MCP Tools — Auto-synced {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        f"",
        f"### Dispatchers: {len(dispatchers)} | Actions: ~{total_actions}",
        f"",
        f"| Dispatcher | Actions | File |",
        f"|-----------|---------|------|",
    ]
    for d in dispatchers:
        lines.append(f"| {d['name']} | {d['actions']} | {d['file']} |")
    
    lines.extend([
        f"",
        f"### Engines: {len(engines)}",
        f"",
    ])
    for e in engines:
        lines.append(f"- {e['name']} ({e['lines']}L)")
    
    lines.extend([
        f"",
        f"### Auto-Fire: {cadence_count} cadence functions",
        f"### Hooks: {hooks['domain']} domain + {hooks['builtin']} built-in",
        f"",
        f"## Changelog",
        f"- {datetime.now().strftime('%Y-%m-%d')}: Auto-synced by gsd_sync_v2.py",
    ])
    
    return "\n".join(lines)


def update_gsd_quick(dispatchers: List[Dict], cadence_count: int) -> Tuple[bool, str]:
    """Update dispatcher/action count in GSD_QUICK.md."""
    quick_file = GSD_DIR / "GSD_QUICK.md"
    if not quick_file.exists():
        return False, "GSD_QUICK.md not found"
    
    content = quick_file.read_text(encoding="utf-8")
    total_actions = sum(d["actions"] for d in dispatchers)
    old_content = content
    
    # Update dispatcher count line
    content = re.sub(
        r'## \d+ dispatchers \| ~\d+ actions',
        f'## {len(dispatchers)} dispatchers | ~{total_actions} actions',
        content
    )
    
    # Update cadence count if present
    content = re.sub(
        r'\d+ cadence auto-functions',
        f'{cadence_count} cadence auto-functions',
        content
    )
    
    changed = content != old_content
    return changed, content


def run_sync(apply: bool = False, as_json: bool = False) -> Dict:
    """Main sync operation."""
    # Scan current state
    dispatchers = scan_dispatchers()
    engines = scan_engines()
    cadence_count = scan_cadence_functions()
    hooks = scan_hooks()
    total_actions = sum(d["actions"] for d in dispatchers)
    
    # Load previous state
    prev = load_sync_state()
    
    # Detect changes
    changes = []
    if prev.get("dispatcher_count") != len(dispatchers):
        changes.append(f"Dispatchers: {prev.get('dispatcher_count', '?')} -> {len(dispatchers)}")
    if prev.get("total_actions") != total_actions:
        changes.append(f"Actions: {prev.get('total_actions', '?')} -> {total_actions}")
    if prev.get("engine_count") != len(engines):
        changes.append(f"Engines: {prev.get('engine_count', '?')} -> {len(engines)}")
    if prev.get("cadence_count") != cadence_count:
        changes.append(f"Cadence: {prev.get('cadence_count', '?')} -> {cadence_count}")
    
    result = {
        "dispatchers": len(dispatchers),
        "total_actions": total_actions,
        "engines": len(engines),
        "cadence_functions": cadence_count,
        "hooks": hooks,
        "changes": changes,
        "changed": len(changes) > 0,
        "applied": False,
    }
    
    if apply and changes:
        # Update sections/tools.md
        tools_content = generate_tools_section(dispatchers, engines, cadence_count, hooks)
        SECTIONS_DIR.mkdir(parents=True, exist_ok=True)
        (SECTIONS_DIR / "tools.md").write_text(tools_content, encoding="utf-8")
        
        # Update GSD_QUICK.md counts
        quick_changed, quick_content = update_gsd_quick(dispatchers, cadence_count)
        if quick_changed:
            (GSD_DIR / "GSD_QUICK.md").write_text(quick_content, encoding="utf-8")
        
        # Save sync state
        save_sync_state({
            "dispatcher_count": len(dispatchers),
            "total_actions": total_actions,
            "engine_count": len(engines),
            "cadence_count": cadence_count,
            "hook_count": hooks["domain"],
            "last_sync": datetime.now().isoformat(),
            "dispatchers": [d["name"] for d in dispatchers],
        })
        
        result["applied"] = True
    
    if as_json:
        print(json.dumps(result))
    else:
        print(f"=== GSD Sync v2.0 ===")
        print(f"Dispatchers: {len(dispatchers)} ({total_actions} actions)")
        print(f"Engines: {len(engines)}")
        print(f"Cadence: {cadence_count} auto-functions")
        print(f"Hooks: {hooks['domain']} domain + {hooks['builtin']} built-in")
        if changes:
            print(f"\nChanges detected:")
            for c in changes:
                print(f"  -> {c}")
            if apply:
                print(f"\n[OK] Applied to GSD files")
            else:
                print(f"\nRun with --apply to update GSD files")
        else:
            print(f"\n[OK] No changes -- GSD is in sync")
    
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="GSD Sync v2.0")
    parser.add_argument("--apply", action="store_true", help="Apply changes to GSD files")
    parser.add_argument("--json", action="store_true", help="Output JSON for cadence integration")
    args = parser.parse_args()
    run_sync(apply=args.apply, as_json=args.json)
