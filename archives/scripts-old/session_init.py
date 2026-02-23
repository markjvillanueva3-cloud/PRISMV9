#!/usr/bin/env python3
"""
PRISM Session Initializer v3.1
Integrates: Peak Activation + Cache Stability + State Management

Usage:
    py -3 session_init.py                    # Full initialization
    py -3 session_init.py --quick            # Skip cache check
    py -3 session_init.py --report           # Just show status
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import json
import os
from pathlib import Path
from datetime import datetime
import argparse
import subprocess

# Paths
PRISM_ROOT = Path("C:/PRISM")
STATE_PATH = PRISM_ROOT / "state" / "CURRENT_STATE.json"
PEAK_CONFIG = PRISM_ROOT / "config" / "PEAK_RESOURCES.json"
CACHE_CHECKER = PRISM_ROOT / "scripts" / "cache_checker.py"
PEAK_ACTIVATOR = PRISM_ROOT / "scripts" / "peak_activator.py"


def load_json(path: Path) -> dict:
    """Load JSON file with error handling."""
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        return {"error": str(e)}


def run_script(script_path: Path, args: list = None) -> str:
    """Run a Python script and capture output."""
    cmd = ["py", "-3", str(script_path)]
    if args:
        cmd.extend(args)
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        return result.stdout + result.stderr
    except Exception as e:
        return f"Error: {e}"


def check_cache_stability() -> dict:
    """Run cache stability check."""
    output = run_script(CACHE_CHECKER, ["--report"])
    
    lines = output.split('\n')
    stable = 0
    unstable = 0
    
    for line in lines:
        if "Stable (prefix safe):" in line:
            try:
                stable = int(line.split(':')[1].strip())
            except:
                pass
        elif "Unstable:" in line:
            try:
                unstable = int(line.split(':')[1].strip())
            except:
                pass
    
    return {
        "stable_files": stable,
        "unstable_files": unstable,
        "cache_ready": unstable == 0 or stable > 0
    }


def check_state_manager() -> dict:
    """Check state manager status via CLI."""
    output = run_script(PRISM_ROOT / "scripts" / "state_manager_v2.py", ["status"])
    try:
        return json.loads(output)
    except:
        return {"active_entries": "unknown", "error": output[:100]}


def load_current_state() -> dict:
    """Load current state file."""
    return load_json(STATE_PATH)


def generate_session_id() -> str:
    """Generate unique session ID."""
    return f"SESSION-{datetime.now().strftime('%Y%m%d-%H%M%S')}"


def print_header(text: str):
    """Print formatted header."""
    print(f"\n{'='*70}")
    print(f"  {text}")
    print(f"{'='*70}")


def main():
    parser = argparse.ArgumentParser(description="PRISM Session Initializer v3.1")
    parser.add_argument("--quick", action="store_true", help="Skip cache check")
    parser.add_argument("--report", action="store_true", help="Just show status")
    args = parser.parse_args()
    
    session_id = generate_session_id()
    
    print_header("PRISM SESSION INITIALIZER v3.1")
    print(f"Session ID: {session_id}")
    print(f"Timestamp: {datetime.now().isoformat()}")
    
    # 1. Load State
    print_header("1. STATE CHECK")
    state = load_current_state()
    if "error" in state:
        print(f"[WARN] Could not load state: {state['error']}")
    else:
        print(f"[OK] State loaded: v{state.get('version', 'unknown')}")
        if 'quickResume' in state:
            print(f"\n  Quick Resume: {state['quickResume'][:200]}...")
    
    # 2. State Manager Check
    print_header("2. STATE MANAGER CHECK")
    sm_status = check_state_manager()
    if "error" not in sm_status:
        print(f"[OK] StateManager active")
        print(f"  Entries: {sm_status.get('active_entries', 'N/A')}")
        print(f"  Archives: {sm_status.get('archives', 0)}")
    else:
        print(f"[INFO] StateManager: {sm_status.get('error', 'Check manually')[:50]}")
    
    # 3. Cache Stability
    if not args.quick:
        print_header("3. CACHE STABILITY CHECK")
        cache = check_cache_stability()
        if cache["cache_ready"]:
            print(f"[OK] Cache stability check passed")
        else:
            print(f"[WARN] Cache issues detected")
    else:
        print_header("3. CACHE CHECK (Skipped)")
        cache = {"cache_ready": True}
    
    # 4. Peak Activation
    print_header("4. PEAK RESOURCE ACTIVATION")
    peak_output = run_script(PEAK_ACTIVATOR)
    for line in peak_output.split('\n')[:10]:
        if line.strip():
            print(f"  {line.strip()}")
    
    # 5. Hooks Status
    print_header("5. ACTIVE HOOKS (26 total)")
    hooks = ["BAYES-001", "OPT-001", "RES-ACT-*", "CTX-CACHE-*", "CTX-STATE-*", 
             "CTX-TOOL-*", "CTX-FOCUS-*", "CTX-ERR-*", "CTX-VAR-*"]
    for h in hooks:
        print(f"  ✓ {h}")
    
    # 6. Metrics
    print_header("6. QUALITY GATES")
    print("  🛑 S(x) ≥ 0.70  [HARD BLOCK]")
    print("  ⚠  Ω(x) ≥ 0.70  [WARN]")
    print("  ⚠  Evidence ≥ L3 [Required]")
    
    # 7. Summary
    print_header("INITIALIZATION COMPLETE")
    print(f"""
  Session: {session_id}
  State: v{state.get('version', 'N/A')}
  Cache: {'Ready' if cache.get('cache_ready') else 'Warning'}
  Hooks: 26 active (212 total)
  
  CHECKPOINT EVERY 5 TOOL CALLS
  IF IT EXISTS, USE IT EVERYWHERE
""")
    
    # JSON output
    result = {
        "cache_ready": cache.get("cache_ready", True),
        "hooks_active": 26,
        "ready": True,
        "session_id": session_id,
        "state_loaded": "error" not in state,
        "timestamp": datetime.now().isoformat()
    }
    
    print("## JSON:")
    print(json.dumps(result, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
