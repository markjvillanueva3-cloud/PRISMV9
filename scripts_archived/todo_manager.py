#!/usr/bin/env python3
"""
PRISM todo.md Recitation Protocol v1.0
Implements Manus Law 4: Attention via Recitation

Updates todo.md after every checkpoint to keep goals in recent attention.
"""
import sys

# Only set encoding for direct execution
if __name__ == "__main__":
    import io
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    except:
        pass

import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional

TODO_PATH = Path("C:/PRISM/state/todo.md")
GOAL_HISTORY = Path("C:/PRISM/state/goal_history.jsonl")


class TodoManager:
    """Manages todo.md for attention anchoring."""
    
    def __init__(self):
        self.current_task = None
        self.progress = {"completed": 0, "total": 0}
        self.steps: List[Dict] = []
        self.quality_gates = {"S_x": None, "Omega_x": None}
        self.next_action = None
        self.session_id = None
    
    def start_task(self, task_name: str, total_steps: int, session_id: str = None):
        """Start a new task."""
        self.current_task = task_name
        self.progress = {"completed": 0, "total": total_steps}
        self.steps = [{"name": f"Step {i+1}", "status": "pending"} for i in range(total_steps)]
        self.session_id = session_id or datetime.now().strftime("SESSION-%Y%m%d-%H%M%S")
        self.update_file()
    
    def complete_step(self, step_index: int, step_name: str = None):
        """Mark a step as complete."""
        if step_index < len(self.steps):
            self.steps[step_index]["status"] = "done"
            if step_name:
                self.steps[step_index]["name"] = step_name
            self.progress["completed"] = sum(1 for s in self.steps if s["status"] == "done")
            self.update_file()
    
    def set_current_step(self, step_index: int, step_name: str = None):
        """Mark current step."""
        if step_index < len(self.steps):
            # Clear previous current
            for s in self.steps:
                if s["status"] == "current":
                    s["status"] = "pending"
            self.steps[step_index]["status"] = "current"
            if step_name:
                self.steps[step_index]["name"] = step_name
            self.update_file()
    
    def set_quality_gates(self, s_x: float = None, omega_x: float = None):
        """Update quality gate values."""
        if s_x is not None:
            self.quality_gates["S_x"] = s_x
        if omega_x is not None:
            self.quality_gates["Omega_x"] = omega_x
        self.update_file()
    
    def set_next_action(self, action: str):
        """Set the next action."""
        self.next_action = action
        self.update_file()
    
    def update_file(self):
        """Write todo.md file."""
        content = self._generate_content()
        with open(TODO_PATH, 'w', encoding='utf-8') as f:
            f.write(content)
        
        # Log to history
        self._log_to_history()
    
    def _generate_content(self) -> str:
        """Generate todo.md content."""
        pct = (self.progress["completed"] / max(self.progress["total"], 1)) * 100
        bar_filled = int(pct / 10)
        bar = "█" * bar_filled + "░" * (10 - bar_filled)
        
        lines = [
            f"# PRISM Active Task: {self.current_task or 'None'}",
            f"## Session: {self.session_id} | Updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            "",
            "## 🎯 CURRENT FOCUS (ATTENTION ANCHOR)",
            f"> {self._get_current_focus()}",
            "",
            f"## Progress: {self.progress['completed']}/{self.progress['total']} ({pct:.0f}%) [{bar}]",
            "",
            "## Plan Status"
        ]
        
        for i, step in enumerate(self.steps):
            if step["status"] == "done":
                lines.append(f"- [x] Step {i+1}: {step['name']} ✓")
            elif step["status"] == "current":
                lines.append(f"- [ ] Step {i+1}: {step['name']} ← YOU ARE HERE")
            else:
                lines.append(f"- [ ] Step {i+1}: {step['name']}")
        
        lines.extend([
            "",
            "## Quality Gates"
        ])
        
        s_x = self.quality_gates.get("S_x")
        omega_x = self.quality_gates.get("Omega_x")
        
        s_status = "✓" if s_x and s_x >= 0.70 else "⚠" if s_x else "?"
        o_status = "✓" if omega_x and omega_x >= 0.70 else "⚠" if omega_x else "?"
        
        lines.append(f"- S(x): {s_x if s_x else 'TBD'} {s_status} (threshold: ≥0.70)")
        lines.append(f"- Ω(x): {omega_x if omega_x else 'TBD'} {o_status} (threshold: ≥0.70)")
        
        lines.extend([
            "",
            "## Next Action",
            f"> {self.next_action or 'Continue with next step'}"
        ])
        
        return '\n'.join(lines)
    
    def _get_current_focus(self) -> str:
        """Get current focus description."""
        current = next((s for s in self.steps if s["status"] == "current"), None)
        if current:
            return f"Working on: {current['name']}"
        if self.progress["completed"] == self.progress["total"]:
            return "Task complete! Proceeding to validation."
        return f"Starting {self.current_task}"
    
    def _log_to_history(self):
        """Log goal state to history for drift detection."""
        entry = {
            "timestamp": datetime.now().isoformat(),
            "task": self.current_task,
            "progress": self.progress.copy(),
            "focus": self._get_current_focus(),
            "quality": self.quality_gates.copy()
        }
        with open(GOAL_HISTORY, 'a', encoding='utf-8') as f:
            f.write(json.dumps(entry, sort_keys=True) + '\n')
    
    def get_attention_anchor(self) -> str:
        """Get attention anchor for context injection."""
        return f"""
═══════════════════════════════════════════════════════════════════
ATTENTION ANCHOR (Recite at context end)
═══════════════════════════════════════════════════════════════════
Task: {self.current_task}
Progress: {self.progress['completed']}/{self.progress['total']}
Current Focus: {self._get_current_focus()}
Next Action: {self.next_action or 'Continue'}
Quality: S(x)={self.quality_gates.get('S_x', 'TBD')} Ω(x)={self.quality_gates.get('Omega_x', 'TBD')}
═══════════════════════════════════════════════════════════════════
"""
    
    def load_from_file(self) -> bool:
        """Load state from existing todo.md."""
        if not TODO_PATH.exists():
            return False
        
        try:
            with open(TODO_PATH, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Parse task name
            for line in content.split('\n'):
                if line.startswith("# PRISM Active Task:"):
                    self.current_task = line.split(":", 1)[1].strip()
                elif line.startswith("## Session:"):
                    parts = line.split("|")
                    self.session_id = parts[0].replace("## Session:", "").strip()
                elif "Progress:" in line and "/" in line:
                    # Parse progress
                    import re
                    match = re.search(r'(\d+)/(\d+)', line)
                    if match:
                        self.progress["completed"] = int(match.group(1))
                        self.progress["total"] = int(match.group(2))
            
            return True
        except Exception as e:
            print(f"Warning: Could not load todo.md: {e}")
            return False
    
    def compute_goal_drift(self, n_actions: int = 50) -> float:
        """Compute goal drift score over last n actions."""
        if not GOAL_HISTORY.exists():
            return 0.0
        
        entries = []
        with open(GOAL_HISTORY, 'r', encoding='utf-8') as f:
            for line in f:
                if line.strip():
                    entries.append(json.loads(line))
        
        if len(entries) < 2:
            return 0.0
        
        recent = entries[-n_actions:] if len(entries) > n_actions else entries
        
        # Measure task consistency
        tasks = [e.get("task") for e in recent]
        unique_tasks = len(set(tasks))
        task_switches = sum(1 for i in range(1, len(tasks)) if tasks[i] != tasks[i-1])
        
        # Drift score: higher = more drift (bad)
        drift = task_switches / max(len(tasks) - 1, 1)
        return drift
    
    def status(self) -> Dict:
        """Get current status."""
        return {
            "task": self.current_task,
            "session_id": self.session_id,
            "progress": self.progress,
            "quality_gates": self.quality_gates,
            "next_action": self.next_action,
            "goal_drift": self.compute_goal_drift()
        }


# ─────────────────────────────────────────────────────────────────
# HOOKS
# ─────────────────────────────────────────────────────────────────

def ctx_focus_001_update_todo(tm: TodoManager, step_completed: int = None, 
                              step_name: str = None, next_action: str = None):
    """CTX-FOCUS-001: Update todo.md after checkpoint."""
    if step_completed is not None:
        tm.complete_step(step_completed, step_name)
    if step_completed is not None and step_completed + 1 < tm.progress["total"]:
        tm.set_current_step(step_completed + 1)
    if next_action:
        tm.set_next_action(next_action)
    return {"hook": "CTX-FOCUS-001", "status": "updated", "file": str(TODO_PATH)}


def ctx_focus_002_inject_anchor(tm: TodoManager) -> Dict:
    """CTX-FOCUS-002: Inject goals at END of context."""
    return {
        "hook": "CTX-FOCUS-002",
        "action": "inject_at_context_end",
        "content": tm.get_attention_anchor()
    }


def ctx_focus_003_track_drift(tm: TodoManager) -> Dict:
    """CTX-FOCUS-003: Track goal drift score."""
    drift = tm.compute_goal_drift()
    return {
        "hook": "CTX-FOCUS-003",
        "goal_drift": drift,
        "threshold": 0.10,
        "status": "OK" if drift < 0.10 else "WARNING",
        "message": f"Goal drift: {drift:.2%} (target: <10%)"
    }


# ─────────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────────

def main():
    import argparse
    parser = argparse.ArgumentParser(description="PRISM todo.md Recitation Protocol")
    parser.add_argument("command", choices=["start", "complete", "status", "anchor", "drift"])
    parser.add_argument("--task", help="Task name")
    parser.add_argument("--steps", type=int, help="Total steps")
    parser.add_argument("--step", type=int, help="Step index to complete")
    parser.add_argument("--name", help="Step name")
    parser.add_argument("--next", help="Next action")
    
    args = parser.parse_args()
    tm = TodoManager()
    tm.load_from_file()
    
    if args.command == "start":
        if not args.task or not args.steps:
            print("Error: --task and --steps required")
            return
        tm.start_task(args.task, args.steps)
        print(f"Started task: {args.task} with {args.steps} steps")
    
    elif args.command == "complete":
        if args.step is None:
            print("Error: --step required")
            return
        tm.complete_step(args.step, args.name)
        if args.next:
            tm.set_next_action(args.next)
        print(f"Completed step {args.step}")
    
    elif args.command == "status":
        print(json.dumps(tm.status(), indent=2))
    
    elif args.command == "anchor":
        print(tm.get_attention_anchor())
    
    elif args.command == "drift":
        result = ctx_focus_003_track_drift(tm)
        print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
