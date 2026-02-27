#!/usr/bin/env python3
"""
PRISM Session Enforcer v1.0
============================
Enforces session protocols to prevent restarts and ensure continuity.

This script provides:
1. State verification gate
2. Resume enforcement for IN_PROGRESS tasks
3. Checkpoint validation
4. Session logging

USAGE:
    python session_enforcer.py --check        # Verify state file exists and is valid
    python session_enforcer.py --status       # Show current task status
    python session_enforcer.py --checkpoint   # Create a checkpoint
    python session_enforcer.py --resume       # Get resume instructions
    python session_enforcer.py --new "task"   # Start new task (only if previous complete)
    python session_enforcer.py --log "msg"    # Log a session event
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path
import shutil

# Configuration
ROOT = Path(r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)")
STATE_FILE = ROOT / "CURRENT_STATE.json"
STATE_BACKUP = ROOT / "_PRISM_MASTER" / "STATE" / "backups"
SESSION_LOGS = ROOT / "SESSION_LOGS"
PRISM_MASTER = ROOT / "_PRISM_MASTER"


class SessionEnforcer:
    """Enforces PRISM session protocols."""
    
    def __init__(self):
        self.state = None
        self.load_state()
    
    def load_state(self):
        """Load current state from file."""
        if not STATE_FILE.exists():
            print("❌ CRITICAL: CURRENT_STATE.json does not exist!")
            print(f"   Expected at: {STATE_FILE}")
            return False
        
        try:
            with open(STATE_FILE, 'r', encoding='utf-8') as f:
                self.state = json.load(f)
            return True
        except json.JSONDecodeError as e:
            print(f"❌ CRITICAL: State file is corrupted: {e}")
            return False
    
    def save_state(self):
        """Save state to file with backup."""
        if self.state is None:
            return False
        
        # Create backup first
        if STATE_FILE.exists():
            STATE_BACKUP.mkdir(parents=True, exist_ok=True)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_path = STATE_BACKUP / f"state_backup_{timestamp}.json"
            shutil.copy2(STATE_FILE, backup_path)
        
        # Update timestamp
        self.state["lastUpdated"] = datetime.now().isoformat() + "Z"
        
        # Write state
        with open(STATE_FILE, 'w', encoding='utf-8') as f:
            json.dump(self.state, f, indent=2)
        
        return True
    
    def check_state(self):
        """Verify state file is valid and complete."""
        print("\n" + "="*70)
        print("PRISM STATE VERIFICATION")
        print("="*70)
        
        if self.state is None:
            print("❌ FAILED: Could not load state")
            return False
        
        # Check required fields
        required = ["version", "lastUpdated", "currentSession", "currentTask", "quickResume"]
        missing = [f for f in required if f not in self.state]
        
        if missing:
            print(f"⚠️ WARNING: Missing fields: {missing}")
        else:
            print("✅ All required fields present")
        
        # Show current state
        print(f"\nVersion: {self.state.get('version', 'unknown')}")
        print(f"Last Updated: {self.state.get('lastUpdated', 'unknown')}")
        
        session = self.state.get("currentSession", {})
        print(f"\nSession: {session.get('name', 'unknown')}")
        print(f"Status: {session.get('status', 'unknown')}")
        
        task = self.state.get("currentTask", {})
        print(f"\nTask: {task.get('description', 'unknown')}")
        print(f"Status: {task.get('status', 'unknown')}")
        print(f"Step: {task.get('step', '?')}/{task.get('totalSteps', '?')}")
        
        print("\n" + "="*70)
        return True
    
    def get_status(self):
        """Get current task status with enforcement rules."""
        print("\n" + "="*70)
        print("PRISM TASK STATUS")
        print("="*70)
        
        if self.state is None:
            print("❌ Cannot get status: State not loaded")
            return None
        
        task = self.state.get("currentTask", {})
        status = task.get("status", "UNKNOWN")
        
        print(f"\nCurrent Task: {task.get('description', 'unknown')}")
        print(f"Status: {status}")
        
        if status == "IN_PROGRESS":
            print("\n" + "!"*70)
            print("⛔ ENFORCEMENT: Task is IN_PROGRESS")
            print("   You MUST resume this task. Starting a new task is BLOCKED.")
            print("   Use --resume to get continuation instructions.")
            print("!"*70)
            
            print(f"\nLast Completed: {task.get('lastCompleted', 'unknown')}")
            print(f"Next To Do: {task.get('nextToDo', 'unknown')}")
            
        elif status == "COMPLETE":
            print("\n✅ Previous task complete. You may start a new task.")
            
        else:
            print(f"\n⚠️ Unknown status: {status}")
        
        # Show quick resume
        qr = self.state.get("quickResume", {})
        if qr:
            print("\n" + "-"*70)
            print("QUICK RESUME:")
            print(qr.get("forNextChat", "No resume info available"))
        
        print("\n" + "="*70)
        return status
    
    def get_resume_instructions(self):
        """Get instructions for resuming an IN_PROGRESS task."""
        print("\n" + "="*70)
        print("PRISM RESUME INSTRUCTIONS")
        print("="*70)
        
        if self.state is None:
            print("❌ Cannot get resume: State not loaded")
            return
        
        task = self.state.get("currentTask", {})
        status = task.get("status", "UNKNOWN")
        
        if status != "IN_PROGRESS":
            print(f"ℹ️ No resume needed. Task status is: {status}")
            return
        
        print("\n⛔ MANDATORY RESUME PROTOCOL:")
        print("-"*70)
        print(f"Task ID: {task.get('id', 'unknown')}")
        print(f"Description: {task.get('description', 'unknown')}")
        print(f"Step: {task.get('step', '?')} of {task.get('totalSteps', '?')}")
        print(f"\n▶ LAST COMPLETED: {task.get('lastCompleted', 'unknown')}")
        print(f"▶ NEXT TO DO: {task.get('nextToDo', 'unknown')}")
        
        # Show phases if available
        phases = task.get("phases", [])
        if phases:
            print("\nPhases:")
            for i, phase in enumerate(phases, 1):
                marker = "✅" if i < task.get('step', 0) else "⬜"
                if i == task.get('step', 0):
                    marker = "▶"
                print(f"  {marker} {i}. {phase}")
        
        print("\n" + "-"*70)
        print("ENFORCEMENT RULES:")
        print("  ❌ DO NOT start over from the beginning")
        print("  ❌ DO NOT re-read files already processed")
        print("  ❌ DO NOT repeat completed steps")
        print("  ✅ RESUME from 'NEXT TO DO' above")
        print("  ✅ Continue from the checkpoint")
        
        print("\n" + "="*70)
    
    def create_checkpoint(self, step=None, message=None):
        """Create a checkpoint."""
        print("\n" + "="*70)
        print("CREATING CHECKPOINT")
        print("="*70)
        
        if self.state is None:
            print("❌ Cannot checkpoint: State not loaded")
            return False
        
        # Update checkpoint
        checkpoint = self.state.get("checkpoint", {})
        checkpoint["timestamp"] = datetime.now().isoformat() + "Z"
        checkpoint["toolCallsSinceCheckpoint"] = 0
        
        if message:
            checkpoint["message"] = message
        
        self.state["checkpoint"] = checkpoint
        
        # Update task step if provided
        if step is not None:
            task = self.state.get("currentTask", {})
            task["step"] = step
            self.state["currentTask"] = task
        
        # Save
        if self.save_state():
            print(f"✅ Checkpoint created at {checkpoint['timestamp']}")
            print(f"   Message: {message or 'No message'}")
            return True
        else:
            print("❌ Failed to save checkpoint")
            return False
    
    def start_new_task(self, task_name, task_description, steps=None):
        """Start a new task (only if previous is complete)."""
        print("\n" + "="*70)
        print("STARTING NEW TASK")
        print("="*70)
        
        if self.state is None:
            print("❌ Cannot start task: State not loaded")
            return False
        
        # Check if previous task is complete
        current_task = self.state.get("currentTask", {})
        status = current_task.get("status", "COMPLETE")
        
        if status == "IN_PROGRESS":
            print("\n" + "!"*70)
            print("⛔ BLOCKED: Previous task is still IN_PROGRESS")
            print("   You must complete or explicitly abandon the current task first.")
            print("   Use --resume to continue the current task.")
            print("!"*70)
            return False
        
        # Create new task
        task_id = f"TASK-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        
        new_task = {
            "id": task_id,
            "name": task_name,
            "description": task_description,
            "status": "IN_PROGRESS",
            "step": 1,
            "totalSteps": len(steps) if steps else 1,
            "phases": steps or [],
            "lastCompleted": "Task started",
            "nextToDo": steps[0] if steps else task_description,
            "started": datetime.now().isoformat() + "Z"
        }
        
        self.state["currentTask"] = new_task
        self.state["currentSession"] = {
            "id": task_id,
            "name": task_name,
            "status": "IN_PROGRESS",
            "started": datetime.now().isoformat() + "Z"
        }
        
        # Reset checkpoint counter
        self.state["checkpoint"] = {
            "timestamp": datetime.now().isoformat() + "Z",
            "toolCallsSinceCheckpoint": 0
        }
        
        if self.save_state():
            print(f"✅ New task started: {task_name}")
            print(f"   ID: {task_id}")
            print(f"   Steps: {len(steps) if steps else 1}")
            return True
        else:
            print("❌ Failed to start task")
            return False
    
    def log_event(self, message, level="INFO"):
        """Log a session event."""
        SESSION_LOGS.mkdir(parents=True, exist_ok=True)
        
        log_file = SESSION_LOGS / f"session_{datetime.now().strftime('%Y%m%d')}.log"
        
        timestamp = datetime.now().isoformat()
        log_line = f"[{timestamp}] [{level}] {message}\n"
        
        with open(log_file, 'a', encoding='utf-8') as f:
            f.write(log_line)
        
        print(f"📝 Logged: {message}")
    
    def verify_protocol_compliance(self):
        """Verify that session protocol is being followed."""
        print("\n" + "="*70)
        print("PROTOCOL COMPLIANCE CHECK")
        print("="*70)
        
        issues = []
        
        if self.state is None:
            issues.append("❌ State file not loaded")
        else:
            # Check for stale state
            last_updated = self.state.get("lastUpdated", "")
            if last_updated:
                try:
                    last_dt = datetime.fromisoformat(last_updated.replace("Z", "+00:00"))
                    hours_ago = (datetime.now().astimezone() - last_dt).total_seconds() / 3600
                    if hours_ago > 24:
                        issues.append(f"⚠️ State is {hours_ago:.1f} hours old")
                except:
                    pass
            
            # Check for missing quick resume
            qr = self.state.get("quickResume", {})
            if not qr.get("forNextChat"):
                issues.append("⚠️ Quick resume is empty")
            
            # Check for IN_PROGRESS without clear next action
            task = self.state.get("currentTask", {})
            if task.get("status") == "IN_PROGRESS":
                if not task.get("nextToDo"):
                    issues.append("⚠️ IN_PROGRESS task has no nextToDo")
        
        if issues:
            print("\nIssues found:")
            for issue in issues:
                print(f"  {issue}")
        else:
            print("✅ Protocol compliance: PASS")
        
        print("\n" + "="*70)
        return len(issues) == 0


def main():
    """Main entry point."""
    enforcer = SessionEnforcer()
    
    if len(sys.argv) < 2:
        print(__doc__)
        enforcer.check_state()
        return
    
    command = sys.argv[1].lower()
    
    if command == "--check":
        enforcer.check_state()
    
    elif command == "--status":
        enforcer.get_status()
    
    elif command == "--resume":
        enforcer.get_resume_instructions()
    
    elif command == "--checkpoint":
        message = sys.argv[2] if len(sys.argv) > 2 else None
        enforcer.create_checkpoint(message=message)
    
    elif command == "--new":
        if len(sys.argv) < 3:
            print("Usage: --new \"task name\" [\"step1\" \"step2\" ...]")
            return
        task_name = sys.argv[2]
        steps = sys.argv[3:] if len(sys.argv) > 3 else None
        enforcer.start_new_task(task_name, task_name, steps)
    
    elif command == "--log":
        if len(sys.argv) < 3:
            print("Usage: --log \"message\"")
            return
        enforcer.log_event(sys.argv[2])
    
    elif command == "--verify":
        enforcer.verify_protocol_compliance()
    
    else:
        print(f"Unknown command: {command}")
        print(__doc__)


if __name__ == "__main__":
    main()
