"""
PRISM CLI - Single Entry Point for All Operations
=================================================
Consolidates all PRISM tools into one interface.

Usage:
    py -3 C:\PRISM\scripts\prism.py <command> [args]

Commands:
    status          Show current state and health
    start           Start new session
    end             End session with summary
    audit           Run full system audit
    extract         Extract module from monolith
    materials       Materials database operations
    skills          Skill tree operations
    check           Regression/quality check
    sync            Run integration sync pipeline
    query           Run DuckDB SQL query
    help            Show detailed help

Examples:
    py -3 C:\PRISM\scripts\prism.py status
    py -3 C:\PRISM\scripts\prism.py sync
    py -3 C:\PRISM\scripts\prism.py query "SELECT * FROM materials LIMIT 10"
    py -3 C:\PRISM\scripts\prism.py materials audit
"""

import sys
import os
import json
import subprocess
from pathlib import Path
from datetime import datetime

# Paths
PRISM_ROOT = Path(r"C:\PRISM")
SCRIPTS = PRISM_ROOT / "scripts"
INTEGRATION = SCRIPTS / "integration"
STATE_FILE = PRISM_ROOT / "state" / "CURRENT_STATE.json"

# Command mapping to existing scripts
COMMAND_MAP = {
    "status": ("session_manager.py", ["status"]),
    "start": ("session_manager.py", ["start"]),
    "end": ("session_manager.py", ["end"]),
    "audit": ("prism_toolkit.py", ["audit"]),
    "health": ("prism_toolkit.py", ["health"]),
    "dashboard": ("progress_dashboard.py", []),
}

# Integration commands
INTEGRATION_MAP = {
    "sync": ("master_sync.py", []),
    "sync-full": ("master_sync.py", ["--full"]),
    "excel": ("excel_to_json.py", []),
    "duckdb": ("json_to_duckdb.py", []),
    "obsidian": ("obsidian_generator.py", []),
    "drive": ("sync_to_drive.py", []),
}


def run_script(script, args, script_dir=None):
    """Run a script with arguments."""
    if script_dir is None:
        script_dir = SCRIPTS
    
    script_path = script_dir / script
    if not script_path.exists():
        print(f"❌ Script not found: {script_path}")
        return False
    
    cmd = [sys.executable, str(script_path)] + args
    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=str(script_dir))
    return result.returncode == 0


def cmd_status():
    """Show current state and health."""
    print("=" * 60)
    print("PRISM STATUS")
    print("=" * 60)
    
    # Read state
    if STATE_FILE.exists():
        with open(STATE_FILE) as f:
            state = json.load(f)
        print(f"\nVersion: {state.get('version', 'unknown')}")
        print(f"Last Updated: {state.get('lastUpdated', 'unknown')}")
        print(f"\nQuick Resume: {state.get('quickResume', 'No resume info')}")
        
        if 'currentTask' in state:
            task = state['currentTask']
            print(f"\nCurrent Task: {task.get('name', 'unknown')}")
            print(f"Status: {task.get('status', 'unknown')}")
        
        if 'skillTree' in state.get('infrastructure', {}):
            tree = state['infrastructure']['skillTree']
            print(f"\nSkill Tree: {tree.get('totalSkills', 0)} skills in {tree.get('totalBranches', 0)} branches")
    else:
        print("❌ State file not found!")
    
    print("\n" + "=" * 60)


def cmd_extract(args):
    """Extract module from monolith."""
    if len(args) < 3:
        print("Usage: prism.py extract <start_line> <end_line> <output>")
        return
    return run_script("extract_module.py", args)


def cmd_materials(args):
    """Materials database operations."""
    if not args:
        print("Materials commands: audit, enhance, verify, physics")
        return
    
    subcmd = args[0]
    if subcmd == "audit":
        return run_script("materials_audit_v2.py", args[1:])
    elif subcmd == "enhance":
        return run_script("materials_bulk_enhancer_v2.py", args[1:])
    elif subcmd == "verify":
        return run_script("verify_materials_db.py", args[1:])
    elif subcmd == "physics":
        return run_script("materials_physics_engine.py", args[1:])
    else:
        print(f"Unknown materials command: {subcmd}")


def cmd_skills(args):
    """Skill tree operations."""
    if not args:
        print("Skills commands: tree, branch, find, stats")
        return
    
    subcmd = args[0]
    if subcmd == "tree":
        return run_script("skill_tree_navigator.py", ["--list"])
    elif subcmd == "stats":
        return run_script("skill_tree_navigator.py", ["--stats"])
    elif subcmd == "branch" and len(args) > 1:
        return run_script("skill_tree_navigator.py", ["--branch", args[1]])
    elif subcmd == "find" and len(args) > 1:
        return run_script("skill_tree_navigator.py", ["--find", args[1]])
    else:
        print(f"Usage: prism.py skills [tree|stats|branch <n>|find <query>]")


def cmd_check(args):
    """Regression and quality checks."""
    if len(args) < 2:
        print("Usage: prism.py check <old_file> <new_file>")
        return
    return run_script("regression_checker.py", args)


def cmd_sync(args):
    """Run integration sync pipeline."""
    if not args:
        return run_script("master_sync.py", [], INTEGRATION)
    
    subcmd = args[0]
    if subcmd == "full":
        return run_script("master_sync.py", [], INTEGRATION)
    elif subcmd == "excel":
        return run_script("excel_to_json.py", args[1:], INTEGRATION)
    elif subcmd == "duckdb":
        return run_script("json_to_duckdb.py", args[1:], INTEGRATION)
    elif subcmd == "obsidian":
        return run_script("obsidian_generator.py", args[1:], INTEGRATION)
    elif subcmd == "drive":
        return run_script("sync_to_drive.py", args[1:], INTEGRATION)
    elif subcmd == "skip-drive":
        return run_script("master_sync.py", ["--skip-drive"], INTEGRATION)
    else:
        print("Sync commands: full, excel, duckdb, obsidian, drive, skip-drive")


def cmd_query(args):
    """Run DuckDB SQL query."""
    if not args:
        # Interactive mode
        return run_script("json_to_duckdb.py", ["--interactive"], INTEGRATION)
    else:
        # Single query
        query = " ".join(args)
        return run_script("json_to_duckdb.py", ["--query", query], INTEGRATION)


def show_help():
    """Show detailed help."""
    print(__doc__)
    print("\nQuick Examples:")
    print("  py -3 C:\\PRISM\\scripts\\prism.py status")
    print("  py -3 C:\\PRISM\\scripts\\prism.py sync")
    print("  py -3 C:\\PRISM\\scripts\\prism.py sync excel")
    print("  py -3 C:\\PRISM\\scripts\\prism.py query \"SELECT * FROM materials LIMIT 10\"")
    print("  py -3 C:\\PRISM\\scripts\\prism.py skills tree")
    print("  py -3 C:\\PRISM\\scripts\\prism.py materials audit")
    print("  py -3 C:\\PRISM\\scripts\\prism.py check old.md new.md")
    print("\nSync Commands:")
    print("  sync           Run full sync pipeline")
    print("  sync excel     Convert Excel to JSON only")
    print("  sync duckdb    Load JSON to DuckDB only")
    print("  sync obsidian  Generate Obsidian notes only")
    print("  sync drive     Sync to Google Drive only")
    print("  sync skip-drive  Run pipeline without Drive sync")


def main():
    if len(sys.argv) < 2:
        show_help()
        return
    
    cmd = sys.argv[1].lower()
    args = sys.argv[2:]
    
    if cmd in COMMAND_MAP:
        script, default_args = COMMAND_MAP[cmd]
        run_script(script, default_args + args)
    elif cmd == "extract":
        cmd_extract(args)
    elif cmd == "materials":
        cmd_materials(args)
    elif cmd == "skills":
        cmd_skills(args)
    elif cmd == "check":
        cmd_check(args)
    elif cmd == "sync":
        cmd_sync(args)
    elif cmd == "query":
        cmd_query(args)
    elif cmd in ("help", "-h", "--help"):
        show_help()
    else:
        print(f"Unknown command: {cmd}")
        show_help()


if __name__ == "__main__":
    main()
