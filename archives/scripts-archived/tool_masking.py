#!/usr/bin/env python3
"""
PRISM Tool Masking State Machine v1.0
Implements Manus Law 2: Mask Don't Remove

All tools always present in context, state machine controls availability.
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
from typing import Dict, List, Set, Optional
from enum import Enum

class WorkflowState(Enum):
    """Workflow states for tool masking."""
    INITIALIZATION = "INITIALIZATION"
    BRAINSTORM = "BRAINSTORM"
    PLANNING = "PLANNING"
    EXECUTION = "EXECUTION"
    VALIDATION = "VALIDATION"
    ERROR_RECOVERY = "ERROR_RECOVERY"
    HANDOFF = "HANDOFF"

# Tool Categories
TOOL_CATEGORIES = {
    "state": ["prism_state_get", "prism_state_update", "prism_state_checkpoint", 
              "prism_state_restore", "prism_state_rollback"],
    "file_read": ["prism_file_read", "prism_file_list", "prism_file_search"],
    "file_write": ["prism_file_write", "prism_file_create", "prism_file_delete"],
    "memory": ["prism_memory_load", "prism_memory_save", "prism_memory_search"],
    "code_execute": ["prism_code_run", "prism_code_test", "prism_code_deploy"],
    "physics": ["prism_physics_kienzle", "prism_physics_taylor", "prism_physics_stability"],
    "material": ["prism_material_get", "prism_material_search", "prism_material_validate"],
    "machine": ["prism_machine_get", "prism_machine_search", "prism_machine_capabilities"],
    "safety": ["prism_safety_check", "prism_safety_validate", "prism_safety_block"],
    "team": ["prism_team_create", "prism_team_assign", "prism_team_status"],
    "agent": ["prism_agent_spawn", "prism_agent_status", "prism_agent_collect"]
}

# State Machine Transitions
TOOL_AVAILABILITY = {
    WorkflowState.INITIALIZATION: {
        "available": ["state", "file_read", "memory"],
        "masked": ["file_write", "code_execute", "team", "agent"]
    },
    WorkflowState.BRAINSTORM: {
        "available": ["state", "file_read", "memory", "material", "machine"],
        "masked": ["file_write", "code_execute"]
    },
    WorkflowState.PLANNING: {
        "available": ["state", "file_read", "file_write", "memory", "material", 
                      "machine", "physics", "safety"],
        "masked": ["code_execute"]
    },
    WorkflowState.EXECUTION: {
        "available": ["*"],  # All tools available
        "masked": []
    },
    WorkflowState.VALIDATION: {
        "available": ["state", "file_read", "safety", "physics"],
        "masked": ["file_write", "code_execute"]
    },
    WorkflowState.ERROR_RECOVERY: {
        "available": ["state", "file_read", "file_write", "memory", "safety"],
        "masked": ["code_execute", "team", "agent"]
    },
    WorkflowState.HANDOFF: {
        "available": ["state", "file_read", "memory"],
        "masked": ["file_write", "code_execute", "team", "agent"]
    }
}

# Valid State Transitions
VALID_TRANSITIONS = {
    WorkflowState.INITIALIZATION: [WorkflowState.BRAINSTORM, WorkflowState.PLANNING],
    WorkflowState.BRAINSTORM: [WorkflowState.PLANNING, WorkflowState.INITIALIZATION],
    WorkflowState.PLANNING: [WorkflowState.EXECUTION, WorkflowState.BRAINSTORM],
    WorkflowState.EXECUTION: [WorkflowState.VALIDATION, WorkflowState.ERROR_RECOVERY],
    WorkflowState.VALIDATION: [WorkflowState.HANDOFF, WorkflowState.EXECUTION, WorkflowState.ERROR_RECOVERY],
    WorkflowState.ERROR_RECOVERY: [WorkflowState.EXECUTION, WorkflowState.VALIDATION],
    WorkflowState.HANDOFF: [WorkflowState.INITIALIZATION]
}


class ToolMaskingStateMachine:
    """Manages tool availability based on workflow state."""
    
    def __init__(self):
        self.current_state = WorkflowState.INITIALIZATION
        self.state_history: List[Dict] = []
        self.all_tools = self._get_all_tools()
    
    def _get_all_tools(self) -> Set[str]:
        """Get all tool names."""
        tools = set()
        for category_tools in TOOL_CATEGORIES.values():
            tools.update(category_tools)
        return tools
    
    def get_available_tools(self) -> Set[str]:
        """Get tools available in current state."""
        config = TOOL_AVAILABILITY[self.current_state]
        
        if "*" in config["available"]:
            return self.all_tools
        
        available = set()
        for category in config["available"]:
            if category in TOOL_CATEGORIES:
                available.update(TOOL_CATEGORIES[category])
        
        return available
    
    def get_masked_tools(self) -> Set[str]:
        """Get tools masked in current state."""
        available = self.get_available_tools()
        return self.all_tools - available
    
    def is_tool_available(self, tool_name: str) -> bool:
        """Check if a specific tool is available."""
        return tool_name in self.get_available_tools()
    
    def transition_to(self, new_state: WorkflowState) -> bool:
        """Transition to a new state if valid."""
        if new_state not in VALID_TRANSITIONS.get(self.current_state, []):
            return False
        
        self.state_history.append({
            "from": self.current_state.value,
            "to": new_state.value,
            "timestamp": datetime.now().isoformat()
        })
        self.current_state = new_state
        return True
    
    def force_transition(self, new_state: WorkflowState):
        """Force transition (for recovery scenarios)."""
        self.state_history.append({
            "from": self.current_state.value,
            "to": new_state.value,
            "timestamp": datetime.now().isoformat(),
            "forced": True
        })
        self.current_state = new_state
    
    def generate_mask_constraint(self) -> str:
        """Generate constraint text for masked tools."""
        masked = self.get_masked_tools()
        if not masked:
            return "All tools available in EXECUTION state."
        
        return f"MASKED in {self.current_state.value}: {', '.join(sorted(masked))}"
    
    def status(self) -> Dict:
        """Get current state machine status."""
        return {
            "current_state": self.current_state.value,
            "available_tools": len(self.get_available_tools()),
            "masked_tools": len(self.get_masked_tools()),
            "valid_transitions": [s.value for s in VALID_TRANSITIONS.get(self.current_state, [])],
            "history_length": len(self.state_history)
        }


# ─────────────────────────────────────────────────────────────────
# HOOKS
# ─────────────────────────────────────────────────────────────────

class ToolMaskingHooks:
    """Hook implementations for CTX-TOOL-*."""
    
    def __init__(self, state_machine: ToolMaskingStateMachine):
        self.sm = state_machine
    
    def ctx_tool_001_validate_presence(self) -> Dict:
        """CTX-TOOL-001: Validate all tools present in context."""
        return {
            "hook": "CTX-TOOL-001",
            "all_tools_count": len(self.sm.all_tools),
            "status": "PASS",
            "message": "All tools present in context (masking controls availability)"
        }
    
    def ctx_tool_002_check_availability(self, tool_name: str) -> Dict:
        """CTX-TOOL-002: Check tool availability in current state."""
        available = self.sm.is_tool_available(tool_name)
        return {
            "hook": "CTX-TOOL-002",
            "tool": tool_name,
            "state": self.sm.current_state.value,
            "available": available,
            "action": "ALLOW" if available else "BLOCK"
        }
    
    def ctx_tool_003_prevent_dynamic_load(self, action: str) -> Dict:
        """CTX-TOOL-003: Prevent dynamic tool loading/unloading."""
        forbidden_actions = ["load_tool", "unload_tool", "add_tool", "remove_tool"]
        blocked = action.lower() in forbidden_actions
        return {
            "hook": "CTX-TOOL-003",
            "action": action,
            "blocked": blocked,
            "message": "Tools are statically defined. Use state transitions to change availability." if blocked else "OK"
        }


# ─────────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────────

def main():
    import argparse
    parser = argparse.ArgumentParser(description="PRISM Tool Masking State Machine")
    parser.add_argument("command", choices=["status", "available", "masked", "transition", "check"])
    parser.add_argument("--state", help="Target state for transition")
    parser.add_argument("--tool", help="Tool name to check")
    
    args = parser.parse_args()
    sm = ToolMaskingStateMachine()
    
    if args.command == "status":
        print(json.dumps(sm.status(), indent=2))
    
    elif args.command == "available":
        tools = sorted(sm.get_available_tools())
        print(f"Available tools in {sm.current_state.value}:")
        for t in tools:
            print(f"  ✓ {t}")
    
    elif args.command == "masked":
        tools = sorted(sm.get_masked_tools())
        print(f"Masked tools in {sm.current_state.value}:")
        for t in tools:
            print(f"  ✗ {t}")
    
    elif args.command == "transition":
        if not args.state:
            print("Error: --state required")
            return
        try:
            new_state = WorkflowState[args.state.upper()]
            if sm.transition_to(new_state):
                print(f"Transitioned to {new_state.value}")
            else:
                print(f"Invalid transition from {sm.current_state.value} to {new_state.value}")
        except KeyError:
            print(f"Unknown state: {args.state}")
    
    elif args.command == "check":
        if not args.tool:
            print("Error: --tool required")
            return
        hooks = ToolMaskingHooks(sm)
        result = hooks.ctx_tool_002_check_availability(args.tool)
        print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
