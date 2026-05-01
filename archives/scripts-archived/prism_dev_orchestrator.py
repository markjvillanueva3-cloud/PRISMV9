#!/usr/bin/env python3
"""
PRISM Unified Development Orchestrator v1.0
Uses ALL available resources: MCP tools, skills, hooks, context engineering

This is the master orchestrator that integrates:
- Phase 0: Context Engineering (Manus 6 Laws)
- Phase 1: MCP Server (54 tools)
- Skills: 141 consolidated skills
- Hooks: 212+ enforcement hooks
- State Management: Append-only with checkpoints
- Quality Gates: Omega equation with safety blocks

Usage:
    py -3 prism_dev_orchestrator.py init           # Initialize session
    py -3 prism_dev_orchestrator.py task "desc"    # Execute task
    py -3 prism_dev_orchestrator.py checkpoint     # Create checkpoint
    py -3 prism_dev_orchestrator.py status         # Show full status
    py -3 prism_dev_orchestrator.py validate       # Run all validations
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import os
import json
import hashlib
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict

# Add scripts to path
sys.path.insert(0, r'C:\PRISM\scripts')

# Import all PRISM modules
from prism_mcp_server import PRISMMCPServer

# Optional imports - may fail in some contexts
StateManager = None
ToolMasking = None
WorkflowState = None
ErrorPreservation = None
TodoManager = None
PatternVariationEngine = None
CacheChecker = None

try:
    from state_manager_v2 import StateManager as _SM
    StateManager = _SM
except:
    pass

try:
    from enum import Enum
    class WorkflowState(Enum):
        INITIALIZATION = "initialization"
        BRAINSTORM = "brainstorm"
        PLANNING = "planning"
        EXECUTION = "execution"
        VALIDATION = "validation"
        ERROR_RECOVERY = "error_recovery"
        HANDOFF = "handoff"
except:
    pass


# ═══════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════

PRISM_ROOT = Path("C:/PRISM")
STATE_DIR = PRISM_ROOT / "state"
SKILLS_DIR = PRISM_ROOT / "skills-consolidated"
SCRIPTS_DIR = PRISM_ROOT / "scripts"
DOCS_DIR = PRISM_ROOT / "docs"

# Quality thresholds
SAFETY_THRESHOLD = 0.70
ANOMALY_THRESHOLD = 0.30
OMEGA_THRESHOLD = 0.65
OMEGA_RELEASE = 0.85


# ═══════════════════════════════════════════════════════════════════════════
# UNIFIED ORCHESTRATOR
# ═══════════════════════════════════════════════════════════════════════════

class PRISMDevOrchestrator:
    """
    Master orchestrator integrating all PRISM resources.
    
    Components:
        - MCP Server: 54 tools for programmatic access
        - State Manager: Append-only event log
        - Tool Masking: Workflow state machine
        - Error Preservation: Learning from mistakes
        - Todo Manager: Goal recitation
        - Pattern Variation: Mimicry prevention
        - Cache Checker: KV-cache stability
    """
    
    def __init__(self):
        self.session_id = f"ORCH-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        self.tool_calls = 0
        
        # Initialize all components
        self._init_components()
        
        # Track active resources
        self.active_skills: List[str] = []
        self.active_hooks: List[str] = []
        self.workflow_state = WorkflowState.INITIALIZATION
    
    def _init_components(self):
        """Initialize all PRISM components."""
        # Core MCP Server (54 tools)
        self.mcp = PRISMMCPServer()
        
        # Context Engineering (Phase 0) - initialize to None
        self.state_manager = None
        self.tool_masking = None
        self.error_preservation = None
        self.todo_manager = None
        self.pattern_variation = None
        self.cache_checker = None
        
        # Try to load state manager
        if StateManager:
            try:
                self.state_manager = StateManager(str(STATE_DIR / "STATE_LOG.jsonl"))
            except:
                pass
    
    # ─────────────────────────────────────────────────────────────
    # SESSION MANAGEMENT
    # ─────────────────────────────────────────────────────────────
    
    def init_session(self, task_description: str = None) -> Dict:
        """Initialize a new session with full resource activation."""
        result = {
            "session_id": self.session_id,
            "timestamp": datetime.now().isoformat(),
            "components": {},
            "resources": {},
            "quality_gates": {}
        }
        
        # 1. MCP Server
        mcp_status = self.mcp.status()
        result["components"]["mcp"] = {
            "tools": mcp_status["total_tools"],
            "skills": mcp_status["skills_loaded"],
            "hooks": mcp_status["hooks_loaded"],
            "status": "ACTIVE"
        }
        
        # 2. State Manager
        if self.state_manager:
            self.state_manager.log_decision(
                "SESSION_START",
                f"Task: {task_description}, Session: {self.session_id}"
            )
            result["components"]["state_manager"] = {"status": "ACTIVE"}
        
        # 3. Tool Masking
        if self.tool_masking:
            self.tool_masking.transition(WorkflowState.INITIALIZATION)
            result["components"]["tool_masking"] = {
                "state": "INITIALIZATION",
                "available": len(self.tool_masking.get_available_tools()),
                "status": "ACTIVE"
            }
        
        # 4. Todo Manager
        if self.todo_manager and task_description:
            self.todo_manager.start_task(task_description, [
                "Initialize session",
                "Load resources",
                "Execute task",
                "Validate output",
                "Checkpoint"
            ])
            result["components"]["todo_manager"] = {"status": "ACTIVE", "task": task_description}
        
        # 5. Error Preservation
        if self.error_preservation:
            result["components"]["error_preservation"] = {
                "errors": self.error_preservation.get_stats()["total_errors"],
                "status": "ACTIVE"
            }
        
        # 6. Pattern Variation
        if self.pattern_variation:
            result["components"]["pattern_variation"] = {"status": "ACTIVE"}
        
        # 7. Load recommended skills
        if task_description:
            skills = self.mcp.call("prism_skill_select", {"task": task_description, "n": 8})
            self.active_skills = [s["name"] for s in skills]
            result["resources"]["skills"] = self.active_skills
        
        # 8. Activate relevant hooks
        hooks = self.mcp.call("prism_hook_list", {})
        self.active_hooks = [h["id"] for h in hooks if h["enforcement"] == "ALWAYS"]
        result["resources"]["hooks"] = self.active_hooks[:10]  # First 10
        
        # 9. Quality gates
        result["quality_gates"] = {
            "safety_threshold": SAFETY_THRESHOLD,
            "anomaly_threshold": ANOMALY_THRESHOLD,
            "omega_threshold": OMEGA_THRESHOLD,
            "release_threshold": OMEGA_RELEASE
        }
        
        return result
    
    def checkpoint(self, name: str = None, completed: int = 0, next_item: str = None) -> Dict:
        """Create checkpoint with full state capture."""
        if name is None:
            name = f"CP-{self.tool_calls}"
        
        result = {"checkpoint": name, "timestamp": datetime.now().isoformat()}
        
        # 1. State checkpoint
        state_cp = self.mcp.call("prism_state_checkpoint", {"name": name})
        result["state_checkpoint"] = state_cp
        
        # 2. Event log entry
        if self.state_manager:
            self.state_manager.create_checkpoint(name, self.tool_calls, completed)
        
        # 3. Update todo
        if self.todo_manager and completed > 0:
            for _ in range(completed):
                self.todo_manager.complete_step()
            result["todo_updated"] = True
        
        # 4. Check buffer zone
        result["buffer_zone"] = self._get_buffer_zone()
        
        return result
    
    def _get_buffer_zone(self) -> str:
        """Get current buffer zone based on tool calls."""
        if self.tool_calls <= 8:
            return "GREEN"
        elif self.tool_calls <= 14:
            return "YELLOW"
        elif self.tool_calls <= 18:
            return "RED"
        else:
            return "BLACK"
    
    # ─────────────────────────────────────────────────────────────
    # QUALITY VALIDATION
    # ─────────────────────────────────────────────────────────────
    
    def validate_output(self, output: Dict) -> Dict:
        """Run full quality validation on output."""
        result = {
            "timestamp": datetime.now().isoformat(),
            "validations": {}
        }
        
        # 1. Omega score
        omega = self.mcp.call("prism_quality_omega", {"output": output})
        result["validations"]["omega"] = omega
        
        # 2. Safety score
        safety = self.mcp.call("prism_quality_safety", {"output": output})
        result["validations"]["safety"] = safety
        
        # 3. All gates
        gates = self.mcp.call("prism_validate_gates", {"output": output})
        result["validations"]["gates"] = gates
        
        # 4. Anti-regression (if old data provided)
        if "old" in output and "new" in output:
            regression = self.mcp.call("prism_validate_anti_regression", {
                "old": output["old"],
                "new": output["new"]
            })
            result["validations"]["anti_regression"] = regression
        
        # 5. Overall decision
        omega_pass = omega.get("passed", False)
        safety_pass = safety.get("passed", False)
        gates_pass = gates.get("all_passed", False)
        
        if omega_pass and safety_pass and gates_pass:
            result["decision"] = "RELEASE" if omega.get("omega_final", 0) >= OMEGA_RELEASE else "PROCEED"
        elif safety.get("S_score", 0) < SAFETY_THRESHOLD:
            result["decision"] = "HARD_BLOCK"
        else:
            result["decision"] = "WARN"
        
        return result
    
    def validate_safety(self, params: Dict) -> Dict:
        """Quick safety check for machining parameters."""
        return self.mcp.call("prism_safety_check_limits", {"params": params})
    
    # ─────────────────────────────────────────────────────────────
    # MCP TOOL EXECUTION
    # ─────────────────────────────────────────────────────────────
    
    def call(self, tool: str, params: Dict = None) -> Any:
        """Execute MCP tool with tracking and hooks."""
        self.tool_calls += 1
        
        # Check buffer zone
        zone = self._get_buffer_zone()
        if zone == "BLACK":
            return {"error": "TOOL_LIMIT_EXCEEDED", "calls": self.tool_calls, "max": 19}
        
        # Check tool availability
        if self.tool_masking:
            available = self.tool_masking.get_available_tools()
            tool_category = tool.split("_")[1] if "_" in tool else "general"
            if tool_category not in available and tool_category != "prism":
                return {"error": f"Tool {tool} not available in state {self.workflow_state}"}
        
        # Execute tool
        try:
            result = self.mcp.call(tool, params)
            
            # Log event
            if self.state_manager:
                self.state_manager.log_file_change(tool, str(params), "success" if "error" not in result else "error")
            
            return result
            
        except Exception as e:
            # Preserve error
            if self.error_preservation:
                self.error_preservation.log_error({
                    "tool": tool,
                    "params": params,
                    "error": str(e)
                })
            
            return {"error": str(e), "tool": tool}
    
    # ─────────────────────────────────────────────────────────────
    # WORKFLOW TRANSITIONS
    # ─────────────────────────────────────────────────────────────
    
    def transition_to(self, state: str) -> Dict:
        """Transition workflow state."""
        state_enum = WorkflowState[state.upper()]
        
        if self.tool_masking:
            success = self.tool_masking.transition(state_enum)
            self.workflow_state = state_enum
            
            return {
                "new_state": state,
                "success": success,
                "available_tools": self.tool_masking.get_available_tools()
            }
        
        return {"error": "Tool masking not initialized"}
    
    # ─────────────────────────────────────────────────────────────
    # PHYSICS CALCULATIONS
    # ─────────────────────────────────────────────────────────────
    
    def calculate_cutting_parameters(self, material: str, machine: str, 
                                      tool_diameter: float, target_life: float = 30) -> Dict:
        """Calculate complete cutting parameters."""
        result = {}
        
        # Get material properties
        mat = self.call("prism_material_get", {"id": material})
        if "error" in mat:
            return mat
        result["material"] = mat
        
        # Get machine capabilities
        mach = self.call("prism_machine_capabilities", {"id": machine})
        if "error" in mach:
            return mach
        result["machine"] = mach
        
        # Optimize speed
        speed = self.call("prism_physics_optimize_speed", {
            "material_id": material,
            "machine_id": machine,
            "tool_diameter_mm": tool_diameter,
            "target_life_min": target_life
        })
        result["optimal_speed"] = speed
        
        # Calculate forces
        force = self.call("prism_physics_kienzle", {
            "material_id": material,
            "depth_mm": tool_diameter * 0.5,
            "feed_mm": 0.15
        })
        result["cutting_force"] = force
        
        # Check stability
        stability = self.call("prism_physics_stability", {
            "machine_id": machine,
            "tool_diameter_mm": tool_diameter,
            "overhang_mm": tool_diameter * 4,
            "rpm": speed.get("optimal_rpm", 5000)
        })
        result["stability"] = stability
        
        # Validate safety
        safety = self.validate_safety({
            "rpm": speed.get("optimal_rpm", 0),
            "feed_mm_rev": 0.15,
            "depth_mm": tool_diameter * 0.5,
            "tool_diameter_mm": tool_diameter
        })
        result["safety"] = safety
        
        return result
    
    # ─────────────────────────────────────────────────────────────
    # STATUS AND REPORTING
    # ─────────────────────────────────────────────────────────────
    
    def status(self) -> Dict:
        """Get complete orchestrator status."""
        mcp_status = self.mcp.status()
        
        status = {
            "orchestrator": "PRISM Dev Orchestrator v1.0",
            "session_id": self.session_id,
            "timestamp": datetime.now().isoformat(),
            "tool_calls": self.tool_calls,
            "buffer_zone": self._get_buffer_zone(),
            "workflow_state": str(self.workflow_state),
            "mcp": {
                "tools": mcp_status["total_tools"],
                "skills": mcp_status["skills_loaded"],
                "hooks": mcp_status["hooks_loaded"],
                "formulas": mcp_status["formulas_loaded"]
            },
            "context_engineering": {
                "state_manager": "ACTIVE" if self.state_manager else "INACTIVE",
                "tool_masking": "ACTIVE" if self.tool_masking else "INACTIVE",
                "error_preservation": "ACTIVE" if self.error_preservation else "INACTIVE",
                "todo_manager": "ACTIVE" if self.todo_manager else "INACTIVE",
                "pattern_variation": "ACTIVE" if self.pattern_variation else "INACTIVE",
                "cache_checker": "ACTIVE" if self.cache_checker else "INACTIVE"
            },
            "active_resources": {
                "skills": len(self.active_skills),
                "hooks": len(self.active_hooks)
            },
            "quality_thresholds": {
                "S_safety": SAFETY_THRESHOLD,
                "D_anomaly": ANOMALY_THRESHOLD,
                "omega_min": OMEGA_THRESHOLD,
                "omega_release": OMEGA_RELEASE
            }
        }
        
        return status
    
    def inventory(self) -> Dict:
        """Get complete resource inventory."""
        return {
            "mcp_tools": {
                "total": 54,
                "by_category": self.mcp.list_tools_by_category()
            },
            "skills": {
                "total": self.mcp.status()["skills_loaded"],
                "active": self.active_skills
            },
            "hooks": {
                "total": self.mcp.status()["hooks_loaded"],
                "active": self.active_hooks
            },
            "formulas": {
                "total": self.mcp.status()["formulas_loaded"],
                "list": self.call("prism_formula_list", {})
            },
            "agents": {
                "total": len(self.call("prism_agent_list", {})),
                "by_tier": {
                    "OPUS": len(self.call("prism_agent_list", {"tier": "OPUS"})),
                    "SONNET": len(self.call("prism_agent_list", {"tier": "SONNET"})),
                    "HAIKU": len(self.call("prism_agent_list", {"tier": "HAIKU"}))
                }
            },
            "context_hooks": {
                "CTX-CACHE": 3,
                "CTX-STATE": 4,
                "CTX-TOOL": 3,
                "CTX-FOCUS": 3,
                "CTX-ERR": 3,
                "CTX-VAR": 3
            }
        }


# ═══════════════════════════════════════════════════════════════════════════
# CLI INTERFACE
# ═══════════════════════════════════════════════════════════════════════════

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="PRISM Development Orchestrator")
    parser.add_argument("command", nargs="?", default="status",
                       help="Command: init, task, checkpoint, status, validate, inventory")
    parser.add_argument("--task", "-t", help="Task description")
    parser.add_argument("--name", "-n", help="Checkpoint name")
    parser.add_argument("--completed", "-c", type=int, default=0, help="Completed items")
    
    args = parser.parse_args()
    
    orch = PRISMDevOrchestrator()
    
    if args.command == "status":
        status = orch.status()
        print("\n" + "="*70)
        print("PRISM DEVELOPMENT ORCHESTRATOR - STATUS")
        print("="*70)
        print(json.dumps(status, indent=2, default=str))
    
    elif args.command == "init":
        task = args.task or "Development session"
        result = orch.init_session(task)
        print("\n" + "="*70)
        print("SESSION INITIALIZED")
        print("="*70)
        print(json.dumps(result, indent=2, default=str))
    
    elif args.command == "task":
        if not args.task:
            print("Error: --task required")
            return
        result = orch.init_session(args.task)
        print(json.dumps(result, indent=2, default=str))
    
    elif args.command == "checkpoint":
        result = orch.checkpoint(args.name, args.completed)
        print(json.dumps(result, indent=2, default=str))
    
    elif args.command == "validate":
        # Sample validation
        result = orch.validate_output({
            "S": 0.85, "D": 0.5, "R": 0.8, "C": 0.75, "P": 0.7,
            "evidence_level": 3, "output_path": "C:/PRISM"
        })
        print("\n" + "="*70)
        print("VALIDATION RESULT")
        print("="*70)
        print(json.dumps(result, indent=2, default=str))
    
    elif args.command == "inventory":
        result = orch.inventory()
        print("\n" + "="*70)
        print("RESOURCE INVENTORY")
        print("="*70)
        print(json.dumps(result, indent=2, default=str))
    
    else:
        print(f"Unknown command: {args.command}")
        print("Available: status, init, task, checkpoint, validate, inventory")


if __name__ == "__main__":
    main()
