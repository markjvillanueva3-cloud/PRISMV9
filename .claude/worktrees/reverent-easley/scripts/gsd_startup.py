"""
PRISM GSD STARTUP v3.0
======================
FULLY AUTOMATED - Claude runs this, user doesn't need to.

This script:
- Auto-detects compaction and recovers state
- Auto-syncs GSD with MCP tools
- Auto-detects resume vs new session
- Intelligently selects skills
- Provides exact load commands
- Handles everything for seamless workflow

Claude should run this at the START of every session automatically.

v3.0 Changes:
- Added compaction detection and recovery
- Added GSD auto-sync with MCP tools
- Added transcript reading for state recovery
- Integrated with recovery_mcp tools
"""

import json
import sys
import subprocess
import os
from pathlib import Path
from datetime import datetime
from typing import Dict, Optional, Any

# Paths
PRISM_ROOT = Path(r"C:\PRISM")
STATE_DIR = PRISM_ROOT / "state"
SCRIPTS_DIR = PRISM_ROOT / "scripts"
CORE_DIR = SCRIPTS_DIR / "core"

SESSION_MEMORY = STATE_DIR / "SESSION_MEMORY.json"
CURRENT_STATE = STATE_DIR / "CURRENT_STATE.json"
ROADMAP_TRACKER = STATE_DIR / "ROADMAP_TRACKER.json"
GSD_SYNC_STATE = STATE_DIR / "gsd_sync_state.json"

SKILL_SELECTOR = SCRIPTS_DIR / "intelligent_skill_selector.py"
SESSION_MANAGER = SCRIPTS_DIR / "session_memory_manager.py"
GSD_SYNC = CORE_DIR / "gsd_sync.py"
COMPACTION_DETECTOR = CORE_DIR / "compaction_detector.py"
STATE_RECONSTRUCTOR = CORE_DIR / "state_reconstructor.py"

CONTAINER_PATH = "/mnt/skills/user"
TRANSCRIPT_PATH = "/mnt/transcripts"


def load_json(path: Path) -> Optional[Dict]:
    """Load JSON file safely."""
    if path.exists():
        try:
            with open(path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return None
    return None


def save_json(path: Path, data: Dict):
    """Save JSON file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)


def run_python_script(script_path: Path, args: list = None, capture_json: bool = False) -> Optional[Any]:
    """Run a Python script and optionally capture JSON output."""
    if not script_path.exists():
        return None
    
    cmd = ["py", "-3", str(script_path)]
    if args:
        cmd.extend(args)
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode == 0 and capture_json:
            return json.loads(result.stdout)
        return result.stdout if result.returncode == 0 else None
    except (subprocess.TimeoutExpired, json.JSONDecodeError, Exception):
        return None


# =============================================================================
# COMPACTION DETECTION AND RECOVERY
# =============================================================================

def detect_compaction() -> Dict:
    """Detect if context was compacted."""
    result = {
        "compacted": False,
        "type": "NONE",
        "confidence": 0.0,
        "transcript_available": False,
        "recommendations": []
    }
    
    # Check for transcript files (indicates compaction happened)
    transcript_dir = Path(TRANSCRIPT_PATH)
    if transcript_dir.exists():
        transcripts = list(transcript_dir.glob("*.txt"))
        if transcripts:
            result["transcript_available"] = True
            # Get most recent
            latest = max(transcripts, key=lambda p: p.stat().st_mtime)
            result["latest_transcript"] = str(latest)
    
    # Run compaction detector if available
    if COMPACTION_DETECTOR.exists():
        detector_result = run_python_script(COMPACTION_DETECTOR, ["--json"], capture_json=True)
        if detector_result:
            result.update(detector_result)
    else:
        # Fallback: check state file freshness
        if CURRENT_STATE.exists():
            state = load_json(CURRENT_STATE)
            if state:
                last_updated = state.get("lastUpdated", "")
                if last_updated:
                    try:
                        last_dt = datetime.fromisoformat(last_updated.replace("Z", "+00:00"))
                        age_hours = (datetime.now(last_dt.tzinfo) - last_dt).total_seconds() / 3600
                        if age_hours > 2 and result["transcript_available"]:
                            result["compacted"] = True
                            result["type"] = "SOFT"
                            result["confidence"] = 0.6
                            result["recommendations"].append("State may be stale - consider reconstruction")
                    except (ValueError, TypeError):
                        pass
    
    return result


def recover_from_compaction(transcript_path: str = None) -> Dict:
    """Attempt to recover state from compaction."""
    result = {
        "success": False,
        "method": "none",
        "state_restored": False,
        "quick_resume": None
    }
    
    # Try state reconstructor first
    if STATE_RECONSTRUCTOR.exists():
        recon_result = run_python_script(
            STATE_RECONSTRUCTOR, 
            ["--save", "--json"],
            capture_json=True
        )
        if recon_result and recon_result.get("success"):
            result["success"] = True
            result["method"] = "state_reconstructor"
            result["state_restored"] = True
            result["quick_resume"] = recon_result.get("quick_resume")
            return result
    
    # Fallback: read transcript directly
    if transcript_path:
        try:
            with open(transcript_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Extract quick resume from transcript
            import re
            
            # Look for quickResume patterns
            qr_match = re.search(r'quickResume["\']?\s*:\s*["\']([^"\']+)["\']', content)
            if qr_match:
                result["quick_resume"] = qr_match.group(1)
            
            # Look for session info
            session_match = re.search(r'Session\s+(\d+\.\d+)', content)
            if session_match:
                result["last_session"] = session_match.group(1)
            
            result["success"] = True
            result["method"] = "transcript_parse"
            
        except (IOError, Exception) as e:
            result["error"] = str(e)
    
    return result


# =============================================================================
# GSD SYNC
# =============================================================================

def check_gsd_sync() -> Dict:
    """Check if GSD is in sync with MCP tools."""
    result = {
        "in_sync": True,
        "mcp_tools": 0,
        "gsd_tools": 0,
        "tools_added": [],
        "tools_removed": []
    }
    
    if GSD_SYNC.exists():
        sync_result = run_python_script(GSD_SYNC, ["--json"], capture_json=True)
        if sync_result:
            result["in_sync"] = not sync_result.get("changes_needed", False)
            result["mcp_tools"] = sync_result.get("mcp_tools", 0)
            result["gsd_tools"] = sync_result.get("gsd_tools", 0)
            result["tools_added"] = sync_result.get("added", [])
            result["tools_removed"] = sync_result.get("removed", [])
    
    return result


def sync_gsd_if_needed() -> bool:
    """Sync GSD with MCP if out of sync. Returns True if synced."""
    sync_status = check_gsd_sync()
    
    if not sync_status["in_sync"]:
        if GSD_SYNC.exists():
            run_python_script(GSD_SYNC, ["--apply"])
            return True
    
    return False


# =============================================================================
# SESSION MANAGEMENT
# =============================================================================

def has_active_session(memory: Dict) -> bool:
    """Check if there's an active session to resume."""
    if not memory:
        return False
    task = memory.get("currentTask", {})
    return task.get("status") == "IN_PROGRESS"


def get_resume_context(memory: Dict) -> Dict:
    """Get resume context for Claude."""
    task = memory.get("currentTask", {})
    progress = memory.get("progress", {})
    context = memory.get("context", {})
    
    return {
        "mode": "RESUME",
        "sessionId": task.get("id"),
        "task": task.get("description"),
        "taskType": task.get("type"),
        "completed": progress.get("completed", 0),
        "total": progress.get("total", 0),
        "percentage": progress.get("percentage", 0),
        "currentItem": progress.get("currentItem"),
        "nextItem": progress.get("nextItem"),
        "resumeInstructions": memory.get("resumeInstructions"),
        "loadedSkills": context.get("loadedSkills", []),
        "contextPressure": context.get("contextPressure", "GREEN"),
        "toolCalls": context.get("toolCallCount", 0)
    }


def run_skill_selector(task: str, threshold: float = 0.25) -> Optional[Dict]:
    """Run intelligent skill selector."""
    if not SKILL_SELECTOR.exists():
        return None
    return run_python_script(
        SKILL_SELECTOR,
        [task, "--threshold", str(threshold), "--json"],
        capture_json=True
    )


def get_new_session_context(task: str, selection: Dict) -> Dict:
    """Get new session context for Claude."""
    skills = selection.get("skills", [])
    
    # Separate container (fast) vs filesystem skills
    container_skills = [s for s in skills if s.get("inContainer")]
    filesystem_skills = [s for s in skills if not s.get("inContainer")]
    
    load_commands = []
    for s in container_skills:
        load_commands.append({
            "skill": s["name"],
            "command": f'view "{CONTAINER_PATH}/{s["name"]}/SKILL.md"',
            "type": "container",
            "score": s["score"]
        })
    for s in filesystem_skills:
        path = f'C:\\PRISM\\skills-consolidated\\{s["name"]}\\SKILL.md'
        load_commands.append({
            "skill": s["name"],
            "command": f'Filesystem:read_file path="{path}"',
            "type": "filesystem",
            "score": s["score"]
        })
    
    return {
        "mode": "NEW",
        "task": task,
        "skillsSelected": len(skills),
        "containerSkills": len(container_skills),
        "filesystemSkills": len(filesystem_skills),
        "loadCommands": load_commands,
        "skillNames": [s["name"] for s in skills]
    }


def initialize_session(task: str, skill_names: list, total_items: int = 0, task_type: str = None) -> str:
    """Initialize session in memory."""
    memory = load_json(SESSION_MEMORY) or {}
    
    session_id = f"SESSION-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
    
    memory["sessionMemory"] = {
        "version": "3.0.0",
        "created": datetime.now().isoformat(),
        "lastUpdated": datetime.now().isoformat()
    }
    
    memory["currentTask"] = {
        "id": session_id,
        "type": task_type,
        "description": task,
        "startedAt": datetime.now().isoformat(),
        "status": "IN_PROGRESS"
    }
    
    memory["progress"] = {
        "total": total_items,
        "completed": 0,
        "pending": total_items,
        "percentage": 0,
        "lastCheckpoint": datetime.now().isoformat(),
        "completedItems": [],
        "pendingItems": [],
        "currentItem": None,
        "nextItem": None
    }
    
    memory["context"] = {
        "loadedSkills": skill_names,
        "contextPressure": "GREEN",
        "toolCallCount": 0
    }
    
    memory["decisions"] = []
    memory["blockers"] = []
    memory["resumeInstructions"] = None
    
    save_json(SESSION_MEMORY, memory)
    return session_id


def get_roadmap_context() -> Dict:
    """Get current roadmap context."""
    roadmap = load_json(ROADMAP_TRACKER)
    if not roadmap:
        return {"error": "No roadmap found"}
    
    return {
        "current_tier": roadmap.get("current_tier"),
        "current_session": roadmap.get("current_session"),
        "session_name": roadmap.get("current_session_name"),
        "session_status": roadmap.get("session_status"),
        "quick_resume": roadmap.get("quick_resume", {})
    }


# =============================================================================
# MAIN STARTUP FLOW
# =============================================================================

def startup_sequence(task: str = None, force_new: bool = False, json_output: bool = False) -> Dict:
    """
    Main startup sequence:
    1. Check for compaction and recover if needed
    2. Verify GSD sync
    3. Detect resume vs new session
    4. Return appropriate context
    """
    result = {
        "version": "3.0.0",
        "timestamp": datetime.now().isoformat(),
        "steps": [],
        "warnings": [],
        "context": None
    }
    
    # Step 1: Compaction Detection
    compaction = detect_compaction()
    result["steps"].append({
        "step": "compaction_check",
        "compacted": compaction["compacted"],
        "type": compaction["type"],
        "transcript_available": compaction["transcript_available"]
    })
    
    if compaction["compacted"]:
        recovery = recover_from_compaction(compaction.get("latest_transcript"))
        result["steps"].append({
            "step": "recovery",
            "success": recovery["success"],
            "method": recovery["method"]
        })
        if recovery.get("quick_resume"):
            result["recovered_quick_resume"] = recovery["quick_resume"]
    
    # Step 2: GSD Sync Check
    gsd_status = check_gsd_sync()
    result["steps"].append({
        "step": "gsd_sync_check",
        "in_sync": gsd_status["in_sync"],
        "mcp_tools": gsd_status["mcp_tools"]
    })
    
    if not gsd_status["in_sync"]:
        synced = sync_gsd_if_needed()
        result["steps"].append({
            "step": "gsd_sync_apply",
            "synced": synced,
            "tools_added": gsd_status["tools_added"]
        })
        if gsd_status["tools_added"]:
            result["warnings"].append(f"New MCP tools: {', '.join(gsd_status['tools_added'][:5])}")
    
    # Step 3: Roadmap Context
    roadmap = get_roadmap_context()
    result["roadmap"] = roadmap
    
    # Step 4: Session Detection
    memory = load_json(SESSION_MEMORY)
    
    if not force_new and has_active_session(memory):
        # Resume existing session
        result["context"] = get_resume_context(memory)
        result["mode"] = "RESUME"
    elif task:
        # Start new session
        selection = run_skill_selector(task)
        if selection:
            context = get_new_session_context(task, selection)
            session_id = initialize_session(task, context["skillNames"])
            context["sessionId"] = session_id
            result["context"] = context
            result["mode"] = "NEW"
        else:
            result["mode"] = "NEW_NO_SKILLS"
            result["context"] = {"task": task, "error": "Skill selection failed"}
    else:
        # No task, show status
        result["mode"] = "STATUS"
        state = load_json(CURRENT_STATE)
        if state:
            result["context"] = {
                "quickResume": state.get("quickResume"),
                "currentSession": state.get("currentSession"),
                "version": state.get("version")
            }
    
    return result


def main():
    import argparse
    parser = argparse.ArgumentParser(description="PRISM GSD Startup v3.0")
    parser.add_argument("task", nargs="?", type=str, help="Task description")
    parser.add_argument("--new", action="store_true", help="Force new session")
    parser.add_argument("--total", type=int, default=0, help="Total items for task")
    parser.add_argument("--type", type=str, help="Task type")
    parser.add_argument("--threshold", type=float, default=0.25, help="Skill selection threshold")
    parser.add_argument("--json", action="store_true", help="Output as JSON for Claude")
    parser.add_argument("--sync-only", action="store_true", help="Only run GSD sync")
    parser.add_argument("--check-compaction", action="store_true", help="Only check compaction")
    
    args = parser.parse_args()
    
    # Quick modes
    if args.sync_only:
        synced = sync_gsd_if_needed()
        status = check_gsd_sync()
        if args.json:
            print(json.dumps({"synced": synced, **status}, indent=2))
        else:
            print(f"GSD Sync: {'Applied' if synced else 'Already in sync'} | MCP Tools: {status['mcp_tools']}")
        return
    
    if args.check_compaction:
        result = detect_compaction()
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            print(f"Compacted: {result['compacted']} | Type: {result['type']} | Transcript: {result['transcript_available']}")
        return
    
    # Full startup sequence
    result = startup_sequence(args.task, args.new, args.json)
    
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print("=" * 70)
        print(f"GSD STARTUP v3.0 | {result['mode']}")
        print("=" * 70)
        
        # Show steps
        for step in result["steps"]:
            step_name = step["step"].upper().replace("_", " ")
            if step.get("compacted"):
                print(f"[!] {step_name}: COMPACTED ({step['type']})")
            elif step.get("synced"):
                print(f"[~] {step_name}: SYNCED")
            elif step.get("success") == False:
                print(f"[X] {step_name}: FAILED")
            else:
                print(f"[+] {step_name}: OK")
        
        # Show warnings
        for warning in result.get("warnings", []):
            print(f"[!] {warning}")
        
        print()
        
        # Show roadmap
        roadmap = result.get("roadmap", {})
        if roadmap and not roadmap.get("error"):
            print(f"Roadmap: Session {roadmap.get('current_session')} - {roadmap.get('session_name')}")
            print(f"Status: {roadmap.get('session_status')}")
            print()
        
        # Show context based on mode
        ctx = result.get("context", {})
        
        if result["mode"] == "RESUME":
            print(f"RESUMING: {ctx.get('task')}")
            print(f"Progress: {ctx.get('completed')}/{ctx.get('total')} ({ctx.get('percentage')}%)")
            if ctx.get('resumeInstructions'):
                print(f">>> {ctx['resumeInstructions']}")
        
        elif result["mode"] == "NEW":
            print(f"NEW SESSION: {ctx.get('task')}")
            print(f"Skills: {ctx.get('skillsSelected')} selected")
            print()
            print("LOAD COMMANDS:")
            for cmd in ctx.get("loadCommands", [])[:5]:
                marker = "[FAST]" if cmd['type'] == 'container' else "[file]"
                print(f"  {marker} {cmd['command']}")
        
        elif result["mode"] == "STATUS":
            if ctx.get("quickResume"):
                print("QUICK RESUME:")
                print(ctx["quickResume"][:500])


if __name__ == "__main__":
    main()
