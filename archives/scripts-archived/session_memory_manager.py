"""
PRISM SESSION MEMORY MANAGER v1.0
=================================
Manages persistent session memory that survives context compaction.

Key Functions:
- start_session(): Initialize or resume session
- checkpoint(): Save progress during execution  
- end_session(): Finalize and save handoff notes
- resume(): Quick resume after compaction

Usage:
  py -3 session_memory_manager.py start "Task description"
  py -3 session_memory_manager.py checkpoint --progress 25 --next "Item 26"
  py -3 session_memory_manager.py end --status COMPLETE
  py -3 session_memory_manager.py resume
  py -3 session_memory_manager.py status
"""

import json
import sys
import argparse
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Any

# Paths
PRISM_ROOT = Path(r"C:\PRISM")
PRISM_REBUILD = Path(r"C:\\PRISM")
SESSION_MEMORY = PRISM_ROOT / "state" / "SESSION_MEMORY.json"
CURRENT_STATE = PRISM_REBUILD / "CURRENT_STATE.json"
CHECKPOINTS_DIR = PRISM_ROOT / "state" / "checkpoints"

# Ensure directories exist
CHECKPOINTS_DIR.mkdir(parents=True, exist_ok=True)


def load_memory() -> Dict:
    """Load session memory from file."""
    if SESSION_MEMORY.exists():
        with open(SESSION_MEMORY, 'r', encoding='utf-8') as f:
            return json.load(f)
    return create_empty_memory()


def save_memory(memory: Dict):
    """Save session memory to file."""
    memory["lastUpdated"] = datetime.now().isoformat()
    with open(SESSION_MEMORY, 'w', encoding='utf-8') as f:
        json.dump(memory, f, indent=2)
    
    # Also save a timestamped checkpoint
    checkpoint_file = CHECKPOINTS_DIR / f"checkpoint_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(checkpoint_file, 'w', encoding='utf-8') as f:
        json.dump(memory, f, indent=2)


def create_empty_memory() -> Dict:
    """Create empty session memory structure."""
    return {
        "sessionMemory": {
            "version": "1.0.0",
            "created": datetime.now().isoformat(),
            "lastUpdated": datetime.now().isoformat(),
            "description": "Persistent memory that survives context compaction"
        },
        "currentTask": {
            "id": None,
            "type": None,
            "description": None,
            "startedAt": None,
            "status": "NOT_STARTED"
        },
        "progress": {
            "total": 0,
            "completed": 0,
            "pending": 0,
            "percentage": 0,
            "lastCheckpoint": None,
            "completedItems": [],
            "pendingItems": [],
            "currentItem": None
        },
        "decisions": [],
        "blockers": [],
        "context": {
            "loadedSkills": [],
            "contextPressure": 0,
            "toolCallCount": 0
        },
        "resumeInstructions": None,
        "handoffNotes": None
    }


def start_session(task: str, task_type: Optional[str] = None, 
                  total_items: int = 0, skills: List[str] = None) -> Dict:
    """
    Start a new session or resume existing one.
    
    Args:
        task: Task description
        task_type: Type of task (EXTRACTION, MATERIALS, ALARMS, etc.)
        total_items: Total items to process
        skills: List of skills to load
    """
    memory = load_memory()
    
    # Check if there's an in-progress session
    if memory.get("currentTask", {}).get("status") == "IN_PROGRESS":
        print("=" * 60)
        print("EXISTING SESSION FOUND - RESUMING")
        print("=" * 60)
        print(f"\nTask: {memory['currentTask']['description']}")
        print(f"Progress: {memory['progress']['completed']}/{memory['progress']['total']}")
        print(f"Last checkpoint: {memory['progress']['lastCheckpoint']}")
        if memory.get("resumeInstructions"):
            print(f"\nResume instructions: {memory['resumeInstructions']}")
        return memory
    
    # Start new session
    session_id = f"SESSION-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
    
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
        "pendingItems": list(range(1, total_items + 1)) if total_items > 0 else [],
        "currentItem": 1 if total_items > 0 else None
    }
    
    memory["context"] = {
        "loadedSkills": skills or [],
        "contextPressure": 0,
        "toolCallCount": 0
    }
    
    memory["decisions"] = []
    memory["blockers"] = []
    memory["resumeInstructions"] = None
    memory["handoffNotes"] = None
    
    save_memory(memory)
    
    print("=" * 60)
    print("NEW SESSION STARTED")
    print("=" * 60)
    print(f"\nSession ID: {session_id}")
    print(f"Task: {task}")
    print(f"Type: {task_type or 'AUTO-DETECT'}")
    print(f"Total items: {total_items}")
    print(f"Skills loaded: {len(skills or [])}")
    
    return memory


def checkpoint(completed: int = None, current_item: Any = None,
               next_item: Any = None, decision: str = None,
               blocker: str = None, tool_calls: int = None,
               resume_instructions: str = None) -> Dict:
    """
    Save checkpoint during execution.
    
    Args:
        completed: Number of items completed
        current_item: Current item being worked on
        next_item: Next item to process
        decision: Decision made during session
        blocker: Any blocker encountered
        tool_calls: Number of tool calls made
        resume_instructions: Instructions for resuming
    """
    memory = load_memory()
    
    # Update progress
    if completed is not None:
        memory["progress"]["completed"] = completed
        total = memory["progress"]["total"]
        memory["progress"]["pending"] = max(0, total - completed)
        memory["progress"]["percentage"] = round(completed / total * 100, 1) if total > 0 else 0
    
    if current_item is not None:
        memory["progress"]["currentItem"] = current_item
    
    if next_item is not None:
        if "nextItem" not in memory["progress"]:
            memory["progress"]["nextItem"] = next_item
        else:
            memory["progress"]["nextItem"] = next_item
    
    memory["progress"]["lastCheckpoint"] = datetime.now().isoformat()
    
    # Add decision if provided
    if decision:
        memory["decisions"].append({
            "timestamp": datetime.now().isoformat(),
            "decision": decision
        })
    
    # Add blocker if provided
    if blocker:
        memory["blockers"].append({
            "timestamp": datetime.now().isoformat(),
            "blocker": blocker
        })
    
    # Update context
    if tool_calls is not None:
        memory["context"]["toolCallCount"] = tool_calls
        # Calculate context pressure
        if tool_calls <= 8:
            memory["context"]["contextPressure"] = "GREEN"
        elif tool_calls <= 14:
            memory["context"]["contextPressure"] = "YELLOW"
        elif tool_calls <= 18:
            memory["context"]["contextPressure"] = "RED"
        else:
            memory["context"]["contextPressure"] = "CRITICAL"
    
    if resume_instructions:
        memory["resumeInstructions"] = resume_instructions
    
    save_memory(memory)
    
    print(f"[CHECKPOINT] Progress: {memory['progress']['completed']}/{memory['progress']['total']} ({memory['progress']['percentage']}%)")
    if memory["context"].get("contextPressure"):
        print(f"[CHECKPOINT] Context pressure: {memory['context']['contextPressure']}")
    
    return memory


def end_session(status: str = "COMPLETE", handoff_notes: str = None,
                next_task: str = None) -> Dict:
    """
    End session and save final state.
    
    Args:
        status: Final status (COMPLETE, PARTIAL, BLOCKED)
        handoff_notes: Notes for next session
        next_task: Suggested next task
    """
    memory = load_memory()
    
    memory["currentTask"]["status"] = status
    memory["currentTask"]["endedAt"] = datetime.now().isoformat()
    memory["handoffNotes"] = handoff_notes
    
    if next_task:
        memory["nextTask"] = next_task
    
    save_memory(memory)
    
    print("=" * 60)
    print(f"SESSION ENDED - {status}")
    print("=" * 60)
    print(f"\nTask: {memory['currentTask']['description']}")
    print(f"Final progress: {memory['progress']['completed']}/{memory['progress']['total']}")
    print(f"Decisions made: {len(memory['decisions'])}")
    print(f"Blockers: {len(memory['blockers'])}")
    if handoff_notes:
        print(f"\nHandoff notes: {handoff_notes}")
    if next_task:
        print(f"Suggested next: {next_task}")
    
    return memory


def resume() -> Dict:
    """
    Quick resume - shows exactly what to do next.
    """
    memory = load_memory()
    
    print("=" * 60)
    print("SESSION MEMORY - QUICK RESUME")
    print("=" * 60)
    
    task = memory.get("currentTask", {})
    progress = memory.get("progress", {})
    
    if not task.get("id"):
        print("\nNo active session. Use 'start' to begin.")
        return memory
    
    print(f"\nSession: {task.get('id')}")
    print(f"Task: {task.get('description')}")
    print(f"Status: {task.get('status')}")
    print(f"\nProgress: {progress.get('completed', 0)}/{progress.get('total', 0)} ({progress.get('percentage', 0)}%)")
    print(f"Current item: {progress.get('currentItem')}")
    print(f"Next item: {progress.get('nextItem')}")
    print(f"Last checkpoint: {progress.get('lastCheckpoint')}")
    
    if memory.get("resumeInstructions"):
        print(f"\n>>> RESUME INSTRUCTIONS: {memory['resumeInstructions']}")
    
    if memory.get("decisions"):
        print(f"\nRecent decisions ({len(memory['decisions'])}):")
        for d in memory["decisions"][-3:]:
            print(f"  - {d['decision']}")
    
    if memory.get("blockers"):
        print(f"\nBlockers ({len(memory['blockers'])}):")
        for b in memory["blockers"]:
            print(f"  - {b['blocker']}")
    
    context = memory.get("context", {})
    print(f"\nContext: {context.get('contextPressure', 'N/A')} | Tools: {context.get('toolCallCount', 0)}")
    print(f"Skills loaded: {len(context.get('loadedSkills', []))}")
    
    return memory


def status() -> Dict:
    """Show current session status as JSON."""
    memory = load_memory()
    print(json.dumps(memory, indent=2))
    return memory


def main():
    parser = argparse.ArgumentParser(description="PRISM Session Memory Manager")
    subparsers = parser.add_subparsers(dest="command", help="Commands")
    
    # Start command
    start_parser = subparsers.add_parser("start", help="Start new session")
    start_parser.add_argument("task", type=str, help="Task description")
    start_parser.add_argument("--type", type=str, help="Task type")
    start_parser.add_argument("--total", type=int, default=0, help="Total items")
    start_parser.add_argument("--skills", type=str, nargs="+", help="Skills to load")
    
    # Checkpoint command
    cp_parser = subparsers.add_parser("checkpoint", help="Save checkpoint")
    cp_parser.add_argument("--completed", type=int, help="Items completed")
    cp_parser.add_argument("--current", type=str, help="Current item")
    cp_parser.add_argument("--next", type=str, help="Next item")
    cp_parser.add_argument("--decision", type=str, help="Decision made")
    cp_parser.add_argument("--blocker", type=str, help="Blocker encountered")
    cp_parser.add_argument("--tools", type=int, help="Tool call count")
    cp_parser.add_argument("--resume", type=str, help="Resume instructions")
    
    # End command
    end_parser = subparsers.add_parser("end", help="End session")
    end_parser.add_argument("--status", type=str, default="COMPLETE", 
                           choices=["COMPLETE", "PARTIAL", "BLOCKED"])
    end_parser.add_argument("--notes", type=str, help="Handoff notes")
    end_parser.add_argument("--next-task", type=str, help="Suggested next task")
    
    # Resume command
    subparsers.add_parser("resume", help="Quick resume")
    
    # Status command
    subparsers.add_parser("status", help="Show status as JSON")
    
    args = parser.parse_args()
    
    if args.command == "start":
        start_session(args.task, args.type, args.total, args.skills)
    elif args.command == "checkpoint":
        checkpoint(
            completed=args.completed,
            current_item=args.current,
            next_item=args.next,
            decision=args.decision,
            blocker=args.blocker,
            tool_calls=args.tools,
            resume_instructions=args.resume
        )
    elif args.command == "end":
        end_session(args.status, args.notes, args.next_task)
    elif args.command == "resume":
        resume()
    elif args.command == "status":
        status()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
