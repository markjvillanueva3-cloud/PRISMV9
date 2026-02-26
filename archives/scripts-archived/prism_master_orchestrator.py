#!/usr/bin/env python3
"""
PRISM Master Orchestrator v1.0
Integrates ALL resources: MCP Server + Context Engineering + Hooks + Swarms

This is the SINGLE ENTRY POINT that utilizes everything for:
- Development tasks
- Context window management
- Compaction recovery
- Token efficiency

Resources Integrated:
  - 54 MCP Tools (Phase 1)
  - 9 Context Engineering Scripts (Phase 0)
  - 212 Hooks (Cognitive + Context + Domain)
  - 118 Skills
  - 64 Agents
  - 22 Formulas
  - 8 Swarm Patterns
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import json
import os
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
import subprocess
import hashlib

# ═══════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════

PRISM_ROOT = Path("C:/PRISM")
SCRIPTS_DIR = PRISM_ROOT / "scripts"
STATE_DIR = PRISM_ROOT / "state"
SKILLS_DIR = PRISM_ROOT / "skills-consolidated"

# Import MCP Server
sys.path.insert(0, str(SCRIPTS_DIR))
from prism_mcp_server import PRISMMCPServer


# ═══════════════════════════════════════════════════════════════════════════
# CONTEXT ENGINEERING INTEGRATION
# ═══════════════════════════════════════════════════════════════════════════

class ContextEngineering:
    """
    Integrates all Phase 0 Context Engineering scripts:
    - cache_checker.py (KV-Cache stability)
    - prism_json_sort.py (JSON sorting)
    - session_init.py (Session initialization)
    - state_manager_v2.py (Append-only state)
    - tool_masking.py (Tool state machine)
    - error_preservation.py (Error learning)
    - todo_manager.py (Goal recitation)
    - pattern_variation.py (Mimicry prevention)
    - peak_activator.py (Resource activation)
    """
    
    def __init__(self):
        self.scripts = {
            "cache_checker": SCRIPTS_DIR / "cache_checker.py",
            "json_sort": SCRIPTS_DIR / "prism_json_sort.py",
            "session_init": SCRIPTS_DIR / "session_init.py",
            "state_manager": SCRIPTS_DIR / "state_manager_v2.py",
            "tool_masking": SCRIPTS_DIR / "tool_masking.py",
            "error_preservation": SCRIPTS_DIR / "error_preservation.py",
            "todo_manager": SCRIPTS_DIR / "todo_manager.py",
            "pattern_variation": SCRIPTS_DIR / "pattern_variation.py",
            "peak_activator": SCRIPTS_DIR / "peak_activator.py",
        }
        self._verify_scripts()
    
    def _verify_scripts(self):
        """Verify all scripts exist."""
        missing = []
        for name, path in self.scripts.items():
            if not path.exists():
                missing.append(name)
        
        if missing:
            print(f"[WARN] Missing scripts: {missing}")
    
    def _run_script(self, script_name: str, args: List[str] = None) -> Dict:
        """Run a context engineering script."""
        script_path = self.scripts.get(script_name)
        if not script_path or not script_path.exists():
            return {"error": f"Script not found: {script_name}"}
        
        cmd = ["py", "-3", str(script_path)]
        if args:
            cmd.extend(args)
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            return {
                "script": script_name,
                "success": result.returncode == 0,
                "stdout": result.stdout[-2000:] if result.stdout else "",
                "stderr": result.stderr[-500:] if result.stderr else ""
            }
        except Exception as e:
            return {"error": str(e), "script": script_name}
    
    def check_cache_stability(self) -> Dict:
        """Check KV-cache prefix stability (Law 1)."""
        return self._run_script("cache_checker", ["check"])
    
    def sort_json(self, file_path: str) -> Dict:
        """Sort JSON keys for cache stability (Law 1)."""
        return self._run_script("json_sort", [file_path])
    
    def initialize_session(self) -> Dict:
        """Full session initialization."""
        return self._run_script("session_init", ["--quick"])
    
    def get_state_status(self) -> Dict:
        """Get append-only state status (Law 3)."""
        return self._run_script("state_manager", ["status"])
    
    def create_checkpoint(self, name: str) -> Dict:
        """Create state checkpoint (Law 3)."""
        return self._run_script("state_manager", ["checkpoint", "--name", name])
    
    def get_tool_state(self) -> Dict:
        """Get current tool masking state (Law 2)."""
        return self._run_script("tool_masking", ["status"])
    
    def transition_workflow(self, new_state: str) -> Dict:
        """Transition workflow state (Law 2)."""
        return self._run_script("tool_masking", ["transition", new_state])
    
    def log_error(self, error_msg: str, context: str = "") -> Dict:
        """Log error for preservation (Law 5)."""
        return self._run_script("error_preservation", ["log", error_msg, context])
    
    def get_error_patterns(self) -> Dict:
        """Get learned error patterns (Law 5)."""
        return self._run_script("error_preservation", ["patterns"])
    
    def update_todo(self, task: str, progress: int, total: int) -> Dict:
        """Update todo.md for recitation (Law 4)."""
        return self._run_script("todo_manager", ["update", task, str(progress), str(total)])
    
    def get_attention_anchor(self) -> Dict:
        """Get attention anchor for context end (Law 4)."""
        return self._run_script("todo_manager", ["anchor"])
    
    def vary_output(self, template_type: str) -> Dict:
        """Apply pattern variation (Law 6)."""
        return self._run_script("pattern_variation", ["vary", template_type])
    
    def check_mimicry(self) -> Dict:
        """Check for pattern mimicry (Law 6)."""
        return self._run_script("pattern_variation", ["check"])
    
    def activate_peak_resources(self) -> Dict:
        """Activate peak resources for session."""
        return self._run_script("peak_activator", ["--activate"])


# ═══════════════════════════════════════════════════════════════════════════
# SWARM PATTERNS
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class SwarmPattern:
    name: str
    description: str
    leader_tier: str
    worker_count: int
    work_distribution: str
    aggregation: str

SWARM_PATTERNS = {
    "parallel_extract": SwarmPattern(
        "parallel_extract", "Parallel data extraction",
        "OPUS", 8, "chunk_by_category", "merge_with_dedup"
    ),
    "pipeline": SwarmPattern(
        "pipeline", "Sequential processing pipeline",
        "OPUS", 6, "stage_handoff", "accumulate"
    ),
    "ralph_loop": SwarmPattern(
        "ralph_loop", "Generator-Critic-Judge refinement",
        "OPUS", 3, "role_based", "best_of_iterations"
    ),
    "map_reduce": SwarmPattern(
        "map_reduce", "Map work then reduce results",
        "SONNET", 8, "equal_split", "reduce_merge"
    ),
    "consensus": SwarmPattern(
        "consensus", "Multiple agents vote on result",
        "SONNET", 5, "duplicate", "majority_vote"
    ),
    "specialist_team": SwarmPattern(
        "specialist_team", "Each agent has specialty",
        "OPUS", 4, "by_specialty", "combine_outputs"
    ),
    "cascade": SwarmPattern(
        "cascade", "Each stage enriches previous",
        "SONNET", 4, "sequential_enrich", "final_output"
    ),
    "competitive": SwarmPattern(
        "competitive", "Agents compete for best solution",
        "SONNET", 4, "same_task", "select_best"
    ),
}


# ═══════════════════════════════════════════════════════════════════════════
# MASTER ORCHESTRATOR
# ═══════════════════════════════════════════════════════════════════════════

class PRISMMasterOrchestrator:
    """
    PRISM Master Orchestrator - THE SINGLE ENTRY POINT
    
    Integrates:
    - 54 MCP Tools (PRISMMCPServer)
    - 9 Context Engineering Scripts
    - 212 Hooks
    - 118 Skills
    - 64 Agents
    - 22 Formulas
    - 8 Swarm Patterns
    
    Total Resources: 756+
    """
    
    def __init__(self):
        print("=" * 70)
        print("  PRISM MASTER ORCHESTRATOR v1.0")
        print("  Integrating ALL Resources")
        print("=" * 70)
        
        # Initialize components
        self.mcp = PRISMMCPServer()
        self.context = ContextEngineering()
        self.swarm_patterns = SWARM_PATTERNS
        
        # State
        self.session_id = f"SESSION-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        self.tool_calls = 0
        self.checkpoints = []
        
        # Hooks integration
        self.active_hooks = self._get_active_hooks()
        
        print(f"\n  Session: {self.session_id}")
        print(f"  MCP Tools: {len(self.mcp.tools)}")
        print(f"  Context Scripts: {len(self.context.scripts)}")
        print(f"  Swarm Patterns: {len(self.swarm_patterns)}")
        print(f"  Active Hooks: {len(self.active_hooks)}")
        print("=" * 70)
    
    def _get_active_hooks(self) -> List[str]:
        """Get list of active hooks."""
        hooks = self.mcp.call("prism_hook_list", {})
        if isinstance(hooks, list):
            return [h.get("id", "") for h in hooks]
        return []
    
    # ─────────────────────────────────────────────────────────────
    # UNIFIED TASK EXECUTION
    # ─────────────────────────────────────────────────────────────
    
    def execute(self, task: str, mode: str = "auto") -> Dict:
        """
        Execute a task using all available resources.
        
        Modes:
        - auto: Automatically select best approach
        - mcp: Use MCP tools directly
        - swarm: Use swarm pattern
        - context: Focus on context management
        """
        self.tool_calls += 1
        start_time = datetime.now()
        
        # HOOK: CTX-STATE-001 - Log task start
        self.mcp.call("prism_event_append", {
            "event": {"type": "TASK_START", "task": task, "mode": mode}
        })
        
        # Select approach
        if mode == "auto":
            mode = self._select_mode(task)
        
        result = None
        
        if mode == "mcp":
            result = self._execute_mcp(task)
        elif mode == "swarm":
            result = self._execute_swarm(task)
        elif mode == "context":
            result = self._execute_context(task)
        else:
            result = self._execute_mcp(task)
        
        # HOOK: CTX-STATE-002 - Checkpoint if needed
        if self.tool_calls % 5 == 0:
            self._auto_checkpoint()
        
        # Add timing
        duration = (datetime.now() - start_time).total_seconds()
        result["execution_time_s"] = round(duration, 2)
        result["tool_calls"] = self.tool_calls
        
        return result
    
    def _select_mode(self, task: str) -> str:
        """Auto-select execution mode based on task."""
        task_lower = task.lower()
        
        if any(kw in task_lower for kw in ["extract", "process", "batch", "all"]):
            return "swarm"
        elif any(kw in task_lower for kw in ["context", "session", "state", "checkpoint"]):
            return "context"
        else:
            return "mcp"
    
    def _execute_mcp(self, task: str) -> Dict:
        """Execute using MCP tools."""
        # Select relevant tools
        tools_needed = self._analyze_task(task)
        
        results = {"mode": "mcp", "task": task, "steps": []}
        
        for tool_name, params in tools_needed:
            step_result = self.mcp.call(tool_name, params)
            results["steps"].append({
                "tool": tool_name,
                "result": step_result
            })
        
        # Validate output
        validation = self.mcp.call("prism_quality_omega", {"output": results})
        results["validation"] = validation
        
        return results
    
    def _execute_swarm(self, task: str) -> Dict:
        """Execute using swarm pattern."""
        # Select best swarm pattern
        pattern = self._select_swarm_pattern(task)
        
        return {
            "mode": "swarm",
            "task": task,
            "pattern": asdict(pattern),
            "status": "CONFIGURED",
            "note": "Swarm execution requires multi-agent API (future implementation)"
        }
    
    def _execute_context(self, task: str) -> Dict:
        """Execute context management task."""
        task_lower = task.lower()
        
        if "checkpoint" in task_lower:
            return self.context.create_checkpoint(task)
        elif "state" in task_lower:
            return self.context.get_state_status()
        elif "error" in task_lower:
            return self.context.get_error_patterns()
        elif "todo" in task_lower:
            return self.context.get_attention_anchor()
        else:
            return self.context.initialize_session()
    
    def _analyze_task(self, task: str) -> List[tuple]:
        """Analyze task and determine which MCP tools to use."""
        tools_needed = []
        task_lower = task.lower()
        
        # Material-related
        if "material" in task_lower:
            if "search" in task_lower or "find" in task_lower:
                tools_needed.append(("prism_material_search", {"query": {}}))
            elif any(mat_id in task_lower for mat_id in ["al-", "ss-", "ti-"]):
                # Extract material ID
                for word in task.split():
                    if word.upper().startswith(("AL-", "SS-", "TI-", "STEEL-")):
                        tools_needed.append(("prism_material_get", {"id": word.upper()}))
            else:
                tools_needed.append(("prism_material_search", {"query": {}}))
        
        # Physics-related
        if any(kw in task_lower for kw in ["force", "kienzle", "cutting"]):
            tools_needed.append(("prism_physics_kienzle", {
                "material_id": "AL-6061", "depth_mm": 2, "width_mm": 5
            }))
        
        if any(kw in task_lower for kw in ["tool life", "taylor"]):
            tools_needed.append(("prism_physics_taylor", {
                "material_id": "AL-6061", "cutting_speed_m_min": 200
            }))
        
        if "surface" in task_lower or "finish" in task_lower:
            tools_needed.append(("prism_physics_surface", {
                "feed_mm_rev": 0.1, "nose_radius_mm": 0.8
            }))
        
        # Machine-related
        if "machine" in task_lower:
            tools_needed.append(("prism_machine_search", {"query": {}}))
        
        # Alarm-related
        if "alarm" in task_lower:
            tools_needed.append(("prism_alarm_search", {"query": {}}))
        
        # Skill-related
        if "skill" in task_lower:
            tools_needed.append(("prism_skill_list", {}))
        
        # Default: at least validate
        if not tools_needed:
            tools_needed.append(("prism_state_get", {}))
        
        return tools_needed
    
    def _select_swarm_pattern(self, task: str) -> SwarmPattern:
        """Select best swarm pattern for task."""
        task_lower = task.lower()
        
        if "extract" in task_lower and "all" in task_lower:
            return self.swarm_patterns["parallel_extract"]
        elif "refine" in task_lower or "improve" in task_lower:
            return self.swarm_patterns["ralph_loop"]
        elif "process" in task_lower or "transform" in task_lower:
            return self.swarm_patterns["pipeline"]
        elif "compare" in task_lower or "best" in task_lower:
            return self.swarm_patterns["competitive"]
        else:
            return self.swarm_patterns["map_reduce"]
    
    def _auto_checkpoint(self):
        """Create automatic checkpoint."""
        checkpoint_name = f"auto-{self.tool_calls}"
        result = self.mcp.call("prism_state_checkpoint", {"name": checkpoint_name})
        self.checkpoints.append(result)
    
    # ─────────────────────────────────────────────────────────────
    # CONTEXT WINDOW MANAGEMENT
    # ─────────────────────────────────────────────────────────────
    
    def manage_context(self) -> Dict:
        """
        Full context window management:
        - Check cache stability
        - Verify tool masking
        - Update todo for recitation
        - Check for mimicry
        """
        results = {
            "cache_stability": self.context.check_cache_stability(),
            "tool_state": self.context.get_tool_state(),
            "attention_anchor": self.context.get_attention_anchor(),
            "mimicry_check": self.context.check_mimicry(),
        }
        
        # Generate summary for context end injection
        results["context_summary"] = self._generate_context_summary()
        
        return results
    
    def _generate_context_summary(self) -> str:
        """Generate summary for context end injection (Law 4)."""
        state = self.mcp.call("prism_state_get", {})
        recent_events = self.mcp.call("prism_event_recent", {"n": 3})
        
        summary = f"""
## ATTENTION ANCHOR (Recitation)
Session: {self.session_id}
Tool Calls: {self.tool_calls}
Checkpoints: {len(self.checkpoints)}
State Version: {state.get('version', 'unknown')}
Recent Events: {len(recent_events) if isinstance(recent_events, list) else 0}

## NEXT ACTION
Continue with current task. Checkpoint every 5 tool calls.
"""
        return summary
    
    # ─────────────────────────────────────────────────────────────
    # COMPACTION RECOVERY
    # ─────────────────────────────────────────────────────────────
    
    def recover_from_compaction(self) -> Dict:
        """
        Full recovery after context compaction:
        - Restore state from append-only log
        - Reload relevant skills
        - Restore checkpoint if needed
        - Regenerate attention anchor
        """
        print("\n[RECOVERY] Starting compaction recovery...")
        
        results = {
            "session_init": self.context.initialize_session(),
            "state_status": self.context.get_state_status(),
            "peak_activation": self.context.activate_peak_resources(),
        }
        
        # Get recent events to understand context
        recent = self.mcp.call("prism_event_recent", {"n": 10})
        results["recent_events"] = recent
        
        # Get attention anchor
        results["attention_anchor"] = self.context.get_attention_anchor()
        
        print("[RECOVERY] Complete")
        return results
    
    # ─────────────────────────────────────────────────────────────
    # TOKEN EFFICIENCY
    # ─────────────────────────────────────────────────────────────
    
    def optimize_tokens(self) -> Dict:
        """
        Token efficiency optimization:
        - Sort all JSON for cache hits
        - Compress state if needed
        - Apply pattern variation
        """
        results = {}
        
        # Sort state file
        state_file = STATE_DIR / "CURRENT_STATE.json"
        if state_file.exists():
            results["state_sorted"] = self.context.sort_json(str(state_file))
        
        # Check cache stability
        results["cache_check"] = self.context.check_cache_stability()
        
        # Apply variation to prevent mimicry
        results["variation"] = self.context.vary_output("task_description")
        
        return results
    
    # ─────────────────────────────────────────────────────────────
    # DIAGNOSTICS
    # ─────────────────────────────────────────────────────────────
    
    def diagnostics(self) -> Dict:
        """Full system diagnostics."""
        return {
            "session_id": self.session_id,
            "tool_calls": self.tool_calls,
            "checkpoints": len(self.checkpoints),
            "mcp_stats": self.mcp.get_stats(),
            "context_scripts": list(self.context.scripts.keys()),
            "swarm_patterns": list(self.swarm_patterns.keys()),
            "active_hooks": len(self.active_hooks),
            "resources_summary": {
                "mcp_tools": len(self.mcp.tools),
                "skills": self.mcp.get_stats()["skills_loaded"],
                "agents": self.mcp.get_stats()["agents_available"],
                "hooks": self.mcp.get_stats()["hooks_registered"],
                "formulas": self.mcp.get_stats()["formulas_available"],
                "context_scripts": len(self.context.scripts),
                "swarm_patterns": len(self.swarm_patterns),
            }
        }
    
    def get_quick_resume(self) -> str:
        """Get quick resume string for context."""
        diag = self.diagnostics()
        return f"""
PRISM Master Orchestrator | Session: {self.session_id}
Resources: {diag['resources_summary']['mcp_tools']} MCP tools, {diag['resources_summary']['skills']} skills, {diag['resources_summary']['hooks']} hooks
Status: {self.tool_calls} tool calls, {len(self.checkpoints)} checkpoints
"""


# ═══════════════════════════════════════════════════════════════════════════
# CLI INTERFACE
# ═══════════════════════════════════════════════════════════════════════════

def main():
    """CLI for PRISM Master Orchestrator."""
    import argparse
    
    parser = argparse.ArgumentParser(description="PRISM Master Orchestrator v1.0")
    parser.add_argument("command", nargs="?", default="diagnostics",
                       choices=["diagnostics", "execute", "context", "recover", "optimize"],
                       help="Command to run")
    parser.add_argument("--task", help="Task description for execute command")
    parser.add_argument("--mode", default="auto", choices=["auto", "mcp", "swarm", "context"],
                       help="Execution mode")
    
    args = parser.parse_args()
    
    # Initialize orchestrator
    orch = PRISMMasterOrchestrator()
    
    if args.command == "diagnostics":
        diag = orch.diagnostics()
        print("\n[DIAGNOSTICS]")
        print(json.dumps(diag, indent=2, default=str))
    
    elif args.command == "execute":
        if not args.task:
            print("[ERROR] --task required for execute command")
            return
        result = orch.execute(args.task, args.mode)
        print("\n[EXECUTION RESULT]")
        print(json.dumps(result, indent=2, default=str))
    
    elif args.command == "context":
        result = orch.manage_context()
        print("\n[CONTEXT MANAGEMENT]")
        print(json.dumps(result, indent=2, default=str))
    
    elif args.command == "recover":
        result = orch.recover_from_compaction()
        print("\n[RECOVERY RESULT]")
        print(json.dumps(result, indent=2, default=str))
    
    elif args.command == "optimize":
        result = orch.optimize_tokens()
        print("\n[TOKEN OPTIMIZATION]")
        print(json.dumps(result, indent=2, default=str))


if __name__ == "__main__":
    main()
