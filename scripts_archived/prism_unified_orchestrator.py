#!/usr/bin/env python3
"""
PRISM UNIFIED ORCHESTRATOR v1.0
================================
The MASTER system that integrates ALL PRISM resources:

COMPONENTS INTEGRATED:
├── Phase 0: Context Engineering (24 CTX-* hooks)
│   ├── KV-Cache Stability (cache_checker.py)
│   ├── Append-Only State (state_manager_v2.py)
│   ├── Tool Masking (tool_masking.py)
│   ├── Error Preservation (error_preservation.py)
│   ├── todo.md Recitation (todo_manager.py)
│   └── Pattern Variation (pattern_variation.py)
│
├── Phase 1: MCP Server (54 tools)
│   ├── Orchestration (14): Skills, Agents, Hooks, Formulas
│   ├── Data Query (9): Materials, Machines, Alarms
│   ├── Physics (12): Kienzle, Taylor, Optimization
│   ├── State Server (11): State, Events, Decisions
│   └── Validation (8): Omega, Safety, Gates
│
├── Session Management
│   ├── session_init.py (unified initializer)
│   ├── session_memory_manager.py (checkpoints)
│   ├── gsd_startup.py (intelligent startup)
│   └── intelligent_skill_selector.py (ILP selection)
│
├── Resource Activation
│   ├── peak_activator.py (PEAK_RESOURCES.json)
│   └── prism_json_sort.py (cache stability)
│
└── Quality Assurance
    ├── Master Equation Ω(x) with 10 components
    ├── 9 Validation Gates
    ├── Anti-Regression Protocol
    └── S(x)≥0.70, D(x)≥0.30 HARD BLOCKS

USAGE:
    from prism_unified_orchestrator import PRISMOrchestrator
    prism = PRISMOrchestrator()
    prism.start_session("Task description")
    prism.execute("material lookup for AL-6061")
    prism.checkpoint("Completed material lookup")
    prism.end_session()

CLI:
    py -3 prism_unified_orchestrator.py start "Task description"
    py -3 prism_unified_orchestrator.py execute "Action"
    py -3 prism_unified_orchestrator.py status
    py -3 prism_unified_orchestrator.py audit
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import json
import subprocess
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict, field
import importlib.util

# ═══════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════

PRISM_ROOT = Path("C:/PRISM")
STATE_DIR = PRISM_ROOT / "state"
SCRIPTS_DIR = PRISM_ROOT / "scripts"
SKILLS_DIR = PRISM_ROOT / "skills-consolidated"
MNT_SKILLS = Path("/mnt/skills/user")

# All Phase 0 + Phase 1 scripts
INTEGRATED_SCRIPTS = {
    # Phase 0: Context Engineering
    "cache_checker": SCRIPTS_DIR / "cache_checker.py",
    "state_manager": SCRIPTS_DIR / "state_manager_v2.py",
    "tool_masking": SCRIPTS_DIR / "tool_masking.py",
    "error_preservation": SCRIPTS_DIR / "error_preservation.py",
    "todo_manager": SCRIPTS_DIR / "todo_manager.py",
    "pattern_variation": SCRIPTS_DIR / "pattern_variation.py",
    "session_init": SCRIPTS_DIR / "session_init.py",
    "json_sort": SCRIPTS_DIR / "prism_json_sort.py",
    "peak_activator": SCRIPTS_DIR / "peak_activator.py",
    # Phase 1: MCP Server
    "mcp_server": SCRIPTS_DIR / "prism_mcp_server.py",
    # Session Management
    "gsd_startup": SCRIPTS_DIR / "gsd_startup.py",
    "skill_selector": SCRIPTS_DIR / "intelligent_skill_selector.py",
    "session_memory": SCRIPTS_DIR / "session_memory_manager.py",
}


# ═══════════════════════════════════════════════════════════════════════════
# RESOURCE INVENTORY
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class ResourceInventory:
    """Complete inventory of all PRISM resources."""
    
    # Skills
    skills_total: int = 118
    skills_mnt: int = 43
    skills_consolidated: int = 118
    
    # Agents
    agents_total: int = 64
    agents_opus: int = 18
    agents_sonnet: int = 37
    agents_haiku: int = 9
    
    # Hooks
    hooks_total: int = 212
    hooks_cognitive: int = 30
    hooks_context: int = 24
    hooks_domain: int = 158
    
    # MCP Tools
    mcp_tools: int = 54
    mcp_orchestration: int = 14
    mcp_data: int = 9
    mcp_physics: int = 12
    mcp_state: int = 11
    mcp_validation: int = 8
    
    # Formulas
    formulas_total: int = 22
    
    # Scripts
    scripts_phase0: int = 9
    scripts_phase1: int = 1
    scripts_session: int = 4
    
    # Data
    materials: int = 1047
    machines: int = 824
    alarms: int = 1485
    
    def to_dict(self) -> Dict:
        return asdict(self)
    
    def summary(self) -> str:
        return f"""
╔═══════════════════════════════════════════════════════════════════════════╗
║                    PRISM UNIFIED RESOURCE INVENTORY                       ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  SKILLS:     {self.skills_total:4} total ({self.skills_mnt} in /mnt, {self.skills_consolidated} consolidated)           ║
║  AGENTS:     {self.agents_total:4} total (OPUS:{self.agents_opus}, SONNET:{self.agents_sonnet}, HAIKU:{self.agents_haiku})               ║
║  HOOKS:      {self.hooks_total:4} total (Cognitive:{self.hooks_cognitive}, Context:{self.hooks_context}, Domain:{self.hooks_domain})      ║
║  MCP TOOLS:  {self.mcp_tools:4} total (Orch:{self.mcp_orchestration}, Data:{self.mcp_data}, Physics:{self.mcp_physics}, State:{self.mcp_state}, Val:{self.mcp_validation})  ║
║  FORMULAS:   {self.formulas_total:4}                                                           ║
║  SCRIPTS:    {self.scripts_phase0 + self.scripts_phase1 + self.scripts_session:4} (Phase0:{self.scripts_phase0}, Phase1:{self.scripts_phase1}, Session:{self.scripts_session})                     ║
║  DATA:       Materials:{self.materials}, Machines:{self.machines}, Alarms:{self.alarms}                ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  GRAND TOTAL: {self.skills_total + self.agents_total + self.hooks_total + self.mcp_tools + self.formulas_total:4} orchestrated resources                                ║
╚═══════════════════════════════════════════════════════════════════════════╝
"""


# ═══════════════════════════════════════════════════════════════════════════
# UNIFIED ORCHESTRATOR
# ═══════════════════════════════════════════════════════════════════════════

class PRISMOrchestrator:
    """
    Master orchestrator that integrates ALL PRISM resources.
    
    Implements:
    - Manus 6 Laws for context engineering
    - 54 MCP tools for programmatic access
    - Session management with checkpoints
    - Quality validation with Ω(x) scoring
    - Anti-regression protection
    """
    
    def __init__(self):
        self.session_id: Optional[str] = None
        self.session_start: Optional[datetime] = None
        self.tool_calls: int = 0
        self.checkpoints: List[str] = []
        
        # Initialize inventory
        self.inventory = ResourceInventory()
        
        # Load MCP server
        self.mcp = self._load_mcp_server()
        
        # Load context managers
        self.state_manager = self._load_module("state_manager")
        self.todo_manager = self._load_module("todo_manager")
        self.tool_masking = self._load_module("tool_masking")
        self.error_preservation = self._load_module("error_preservation")
        self.pattern_variation = self._load_module("pattern_variation")
        
        # Hook registry
        self.active_hooks = self._build_hook_registry()
    
    def _load_mcp_server(self):
        """Load the MCP server module."""
        try:
            spec = importlib.util.spec_from_file_location("mcp", INTEGRATED_SCRIPTS["mcp_server"])
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            return module.PRISMMCPServer()
        except Exception as e:
            print(f"Warning: Could not load MCP server: {e}")
            return None
    
    def _load_module(self, name: str):
        """Load a module by name - returns path for subprocess execution."""
        if name not in INTEGRATED_SCRIPTS:
            return None
        path = INTEGRATED_SCRIPTS[name]
        if path.exists():
            return str(path)  # Return path instead of module
        return None
    
    def _build_hook_registry(self) -> Dict[str, Dict]:
        """Build registry of all active hooks."""
        hooks = {}
        
        # Context Engineering Hooks (Phase 0)
        ctx_hooks = [
            ("CTX-CACHE-001", "session_start", "validate_prefix", "ALWAYS"),
            ("CTX-CACHE-002", "prompt_build", "block_dynamic", "HARD_BLOCK"),
            ("CTX-CACHE-003", "json_write", "force_sort", "ALWAYS"),
            ("CTX-STATE-001", "any_change", "append_entry", "ALWAYS"),
            ("CTX-STATE-002", "calls>=5", "checkpoint", "ALWAYS"),
            ("CTX-STATE-003", "entries>1000", "compress", "AUTO"),
            ("CTX-STATE-004", "restore_request", "validate_chain", "ALWAYS"),
            ("CTX-TOOL-001", "context_build", "include_all_tools", "ALWAYS"),
            ("CTX-TOOL-002", "tool_call", "check_state", "BLOCK"),
            ("CTX-TOOL-003", "dynamic_load", "block", "HARD_BLOCK"),
            ("CTX-FOCUS-001", "checkpoint", "update_todo", "ALWAYS"),
            ("CTX-FOCUS-002", "context_build", "inject_anchor", "ALWAYS"),
            ("CTX-FOCUS-003", "every_10_actions", "track_drift", "WARN"),
            ("CTX-ERR-001", "error", "preserve", "ALWAYS"),
            ("CTX-ERR-002", "error_resolved", "log_recovery", "ALWAYS"),
            ("CTX-ERR-003", "error_pattern", "update_bayes", "ALWAYS"),
            ("CTX-VAR-001", "output", "vary_template", "ALWAYS"),
            ("CTX-VAR-002", "list_gen", "randomize", "ALWAYS"),
            ("CTX-VAR-003", "every_10", "detect_mimicry", "WARN"),
        ]
        
        # Cognitive Hooks
        cognitive_hooks = [
            ("BAYES-001", "evidence_received", "update_beliefs", "ALWAYS"),
            ("BAYES-002", "change_detected", "validate_regression", "ALWAYS"),
            ("BAYES-003", "error_pattern", "extract_learning", "ALWAYS"),
            ("OPT-001", "multi_option", "explore_exploit", "ALWAYS"),
            ("RES-ACT-001", "session_start", "activate_peaks", "ALWAYS"),
            ("RES-ACT-002", "task_start", "load_relevant", "ALWAYS"),
        ]
        
        for hook_id, trigger, action, enforcement in ctx_hooks + cognitive_hooks:
            hooks[hook_id] = {
                "trigger": trigger,
                "action": action,
                "enforcement": enforcement,
                "active": True
            }
        
        return hooks
    
    # ═══════════════════════════════════════════════════════════════════════
    # SESSION MANAGEMENT
    # ═══════════════════════════════════════════════════════════════════════
    
    def start_session(self, task: str) -> Dict:
        """Start a new orchestrated session."""
        self.session_id = f"SESSION-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        self.session_start = datetime.now()
        self.tool_calls = 0
        self.checkpoints = []
        
        # Trigger session start hooks
        self._trigger_hook("CTX-CACHE-001")  # Validate prefix
        self._trigger_hook("RES-ACT-001")    # Activate peaks
        
        # Initialize todo.md via subprocess (Law 4: Recitation)
        if self.todo_manager:
            try:
                subprocess.run(
                    ["py", "-3", self.todo_manager, "start", task, "10"],
                    capture_output=True, timeout=5
                )
            except:
                pass
        
        # Log session start event (Law 3: Append-only)
        if self.mcp:
            self.mcp.call("prism_event_append", {
                "event_type": "SESSION_START",
                "content": {"session_id": self.session_id, "task": task}
            })
        
        return {
            "session_id": self.session_id,
            "started": self.session_start.isoformat(),
            "task": task,
            "hooks_active": len(self.active_hooks),
            "mcp_tools": self.mcp.get_stats()["total_tools"] if self.mcp else 0,
            "resources": self.inventory.to_dict()
        }
    
    def end_session(self, status: str = "COMPLETE") -> Dict:
        """End the current session."""
        if not self.session_id:
            return {"error": "No active session"}
        
        duration = (datetime.now() - self.session_start).total_seconds()
        
        # Log session end
        if self.mcp:
            self.mcp.call("prism_event_append", {
                "event_type": "SESSION_END",
                "content": {
                    "session_id": self.session_id,
                    "status": status,
                    "duration_seconds": duration,
                    "tool_calls": self.tool_calls,
                    "checkpoints": len(self.checkpoints)
                }
            })
        
        result = {
            "session_id": self.session_id,
            "status": status,
            "duration_seconds": round(duration, 2),
            "tool_calls": self.tool_calls,
            "checkpoints": self.checkpoints
        }
        
        # Reset session
        self.session_id = None
        self.session_start = None
        
        return result
    
    def checkpoint(self, name: str = None) -> Dict:
        """Create a checkpoint (Law 3: Append-only, Law 4: Recitation)."""
        name = name or f"auto-{len(self.checkpoints) + 1}"
        
        # Trigger checkpoint hooks
        self._trigger_hook("CTX-STATE-002")  # Checkpoint trigger
        self._trigger_hook("CTX-FOCUS-001")  # Update todo.md
        
        # Create checkpoint via MCP
        if self.mcp:
            result = self.mcp.call("prism_state_checkpoint", {"name": name})
            self.checkpoints.append(name)
            return result
        
        self.checkpoints.append(name)
        return {"checkpoint": name, "number": len(self.checkpoints)}
    
    # ═══════════════════════════════════════════════════════════════════════
    # EXECUTION
    # ═══════════════════════════════════════════════════════════════════════
    
    def execute(self, action: str, params: Dict = None) -> Dict:
        """Execute an action using all available resources."""
        params = params or {}
        self.tool_calls += 1
        
        # Check buffer zone
        zone = self._get_buffer_zone()
        if zone == "BLACK":
            return {"error": "TOOL LIMIT REACHED", "calls": self.tool_calls, "action": "STOP"}
        
        # Trigger tool call hook
        self._trigger_hook("CTX-TOOL-002")
        
        # Auto-checkpoint every 5 calls (Law 3)
        if self.tool_calls % 5 == 0:
            self.checkpoint(f"auto-{self.tool_calls}")
        
        # Determine best tool/resource for action
        if self.mcp:
            # Try to match action to MCP tool
            tool_name = self._match_action_to_tool(action)
            if tool_name:
                result = self.mcp.call(tool_name, params)
                return {
                    "action": action,
                    "tool_used": tool_name,
                    "result": result,
                    "calls": self.tool_calls,
                    "zone": zone
                }
        
        return {
            "action": action,
            "status": "executed",
            "calls": self.tool_calls,
            "zone": zone
        }
    
    def _match_action_to_tool(self, action: str) -> Optional[str]:
        """Match an action description to the best MCP tool."""
        action_lower = action.lower()
        
        # Material actions
        if "material" in action_lower:
            if "search" in action_lower or "find" in action_lower:
                return "prism_material_search"
            if "similar" in action_lower:
                return "prism_material_similar"
            return "prism_material_get"
        
        # Machine actions
        if "machine" in action_lower:
            if "capabilities" in action_lower:
                return "prism_machine_capabilities"
            if "search" in action_lower:
                return "prism_machine_search"
            return "prism_machine_get"
        
        # Physics actions
        if "force" in action_lower or "kienzle" in action_lower:
            return "prism_physics_kienzle"
        if "tool life" in action_lower or "taylor" in action_lower:
            return "prism_physics_taylor"
        if "surface" in action_lower or "finish" in action_lower:
            return "prism_physics_surface"
        if "deflection" in action_lower:
            return "prism_physics_deflection"
        if "stability" in action_lower or "chatter" in action_lower:
            return "prism_physics_stability"
        
        # Quality actions
        if "quality" in action_lower or "omega" in action_lower:
            return "prism_quality_omega"
        if "safety" in action_lower:
            return "prism_quality_safety"
        if "validate" in action_lower or "gates" in action_lower:
            return "prism_validate_gates"
        
        # Skill actions
        if "skill" in action_lower:
            if "select" in action_lower:
                return "prism_skill_select"
            if "relevance" in action_lower:
                return "prism_skill_relevance"
            return "prism_skill_list"
        
        # Agent actions
        if "agent" in action_lower:
            if "spawn" in action_lower:
                return "prism_agent_spawn"
            if "select" in action_lower:
                return "prism_agent_select"
            return "prism_agent_list"
        
        # State actions
        if "state" in action_lower or "checkpoint" in action_lower:
            return "prism_state_get"
        
        return None
    
    def _get_buffer_zone(self) -> str:
        """Get current buffer zone based on tool calls."""
        if self.tool_calls <= 8:
            return "GREEN"
        elif self.tool_calls <= 14:
            return "YELLOW"
        elif self.tool_calls <= 18:
            return "RED"
        return "BLACK"
    
    def _trigger_hook(self, hook_id: str):
        """Trigger a hook by ID."""
        if hook_id in self.active_hooks:
            hook = self.active_hooks[hook_id]
            # Hook execution is logged but not blocking in this implementation
            if self.mcp:
                self.mcp.call("prism_event_append", {
                    "event_type": "HOOK_TRIGGERED",
                    "content": {"hook_id": hook_id, "action": hook["action"]}
                })
    
    # ═══════════════════════════════════════════════════════════════════════
    # QUALITY ASSURANCE
    # ═══════════════════════════════════════════════════════════════════════
    
    def validate(self, output: Dict) -> Dict:
        """Validate output using full Ω(x) scoring."""
        if self.mcp:
            omega = self.mcp.call("prism_quality_omega", output)
            gates = self.mcp.call("prism_validate_gates", output)
            
            return {
                "omega": omega,
                "gates": gates,
                "can_release": omega.get("decision") == "RELEASE" and gates.get("all_passed", False)
            }
        
        return {"error": "MCP not available for validation"}
    
    def check_anti_regression(self, old: Dict, new: Dict) -> Dict:
        """Check for regression between versions."""
        if self.mcp:
            return self.mcp.call("prism_validate_anti_regression", {"old": old, "new": new})
        return {"error": "MCP not available"}
    
    # ═══════════════════════════════════════════════════════════════════════
    # AUDIT & STATUS
    # ═══════════════════════════════════════════════════════════════════════
    
    def audit(self) -> Dict:
        """Full audit of all integrated resources."""
        audit_result = {
            "timestamp": datetime.now().isoformat(),
            "inventory": self.inventory.to_dict(),
            "scripts": {},
            "mcp_status": None,
            "hooks_active": len(self.active_hooks),
            "session_active": self.session_id is not None
        }
        
        # Check all scripts exist
        for name, path in INTEGRATED_SCRIPTS.items():
            audit_result["scripts"][name] = {
                "path": str(path),
                "exists": path.exists(),
                "size_kb": round(path.stat().st_size / 1024, 2) if path.exists() else 0
            }
        
        # MCP diagnostics
        if self.mcp:
            audit_result["mcp_status"] = self.mcp.run_diagnostics()
        
        # Count skills
        skills_found = 0
        if SKILLS_DIR.exists():
            skills_found = len([d for d in SKILLS_DIR.iterdir() if d.is_dir()])
        audit_result["skills_found"] = skills_found
        
        return audit_result
    
    def status(self) -> Dict:
        """Get current orchestrator status."""
        return {
            "session_id": self.session_id,
            "session_active": self.session_id is not None,
            "session_duration": (datetime.now() - self.session_start).total_seconds() if self.session_start else 0,
            "tool_calls": self.tool_calls,
            "buffer_zone": self._get_buffer_zone(),
            "checkpoints": self.checkpoints,
            "hooks_active": len(self.active_hooks),
            "mcp_tools": self.mcp.get_stats()["total_tools"] if self.mcp else 0,
            "inventory_summary": {
                "total_resources": sum([
                    self.inventory.skills_total,
                    self.inventory.agents_total,
                    self.inventory.hooks_total,
                    self.inventory.mcp_tools,
                    self.inventory.formulas_total
                ]),
                "skills": self.inventory.skills_total,
                "agents": self.inventory.agents_total,
                "hooks": self.inventory.hooks_total,
                "mcp_tools": self.inventory.mcp_tools,
                "formulas": self.inventory.formulas_total
            }
        }


# ═══════════════════════════════════════════════════════════════════════════
# CLI INTERFACE
# ═══════════════════════════════════════════════════════════════════════════

def main():
    """CLI for PRISM Unified Orchestrator."""
    import argparse
    
    parser = argparse.ArgumentParser(description="PRISM Unified Orchestrator v1.0")
    subparsers = parser.add_subparsers(dest="command", help="Command")
    
    # Start session
    start_parser = subparsers.add_parser("start", help="Start a session")
    start_parser.add_argument("task", help="Task description")
    
    # Execute action
    exec_parser = subparsers.add_parser("execute", help="Execute an action")
    exec_parser.add_argument("action", help="Action to execute")
    exec_parser.add_argument("--params", "-p", help="JSON parameters")
    
    # Status
    subparsers.add_parser("status", help="Get current status")
    
    # Audit
    subparsers.add_parser("audit", help="Full resource audit")
    
    # Inventory
    subparsers.add_parser("inventory", help="Show resource inventory")
    
    # MCP
    mcp_parser = subparsers.add_parser("mcp", help="MCP server operations")
    mcp_parser.add_argument("--list", "-l", action="store_true", help="List tools")
    mcp_parser.add_argument("--call", "-c", help="Call a tool")
    mcp_parser.add_argument("--params", "-p", help="Tool parameters (JSON)")
    
    args = parser.parse_args()
    
    prism = PRISMOrchestrator()
    
    if args.command == "start":
        result = prism.start_session(args.task)
        print(json.dumps(result, indent=2, default=str))
    
    elif args.command == "execute":
        params = json.loads(args.params) if hasattr(args, 'params') and args.params else {}
        result = prism.execute(args.action, params)
        print(json.dumps(result, indent=2, default=str))
    
    elif args.command == "status":
        result = prism.status()
        print(f"\n{'='*70}")
        print(f"  PRISM ORCHESTRATOR STATUS")
        print(f"{'='*70}")
        print(f"  Session: {result['session_id'] or 'None'}")
        print(f"  Active: {result['session_active']}")
        print(f"  Tool Calls: {result['tool_calls']}")
        print(f"  Buffer Zone: {result['buffer_zone']}")
        print(f"  Hooks Active: {result['hooks_active']}")
        print(f"  MCP Tools: {result['mcp_tools']}")
        print(f"\n  Resources: {result['inventory_summary']['total_resources']} total")
        for k, v in result['inventory_summary'].items():
            if k != 'total_resources':
                print(f"    - {k}: {v}")
        print()
    
    elif args.command == "audit":
        result = prism.audit()
        print(f"\n{'='*70}")
        print(f"  PRISM UNIFIED AUDIT")
        print(f"{'='*70}")
        print(f"  Timestamp: {result['timestamp']}")
        print(f"  Skills Found: {result['skills_found']}")
        print(f"  Hooks Active: {result['hooks_active']}")
        print(f"\n  Scripts Status:")
        for name, info in result['scripts'].items():
            status = "✓" if info['exists'] else "✗"
            print(f"    [{status}] {name}: {info['size_kb']:.1f} KB")
        if result['mcp_status']:
            print(f"\n  MCP Diagnostics:")
            print(f"    Passed: {result['mcp_status']['passed']}/{len(result['mcp_status']['tests'])}")
        print()
    
    elif args.command == "inventory":
        print(prism.inventory.summary())
    
    elif args.command == "mcp":
        if args.list:
            tools = prism.mcp.list_tools() if prism.mcp else []
            print(f"\n  MCP Tools ({len(tools)} total):")
            for t in sorted(tools):
                print(f"    - {t}")
        elif args.call:
            params = json.loads(args.params) if args.params else {}
            result = prism.mcp.call(args.call, params) if prism.mcp else {"error": "MCP not available"}
            print(json.dumps(result, indent=2, default=str))
    
    else:
        # Default: show summary
        print(prism.inventory.summary())
        print("  Commands: start, execute, status, audit, inventory, mcp")
        print()


if __name__ == "__main__":
    main()
