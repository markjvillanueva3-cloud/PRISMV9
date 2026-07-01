#!/usr/bin/env python3
"""
STATE_MCP.py - MCP Tools for Append-Only State Persistence
Provides MCP interface for state management operations.

Tools:
- prism_state_append: Append state update event
- prism_checkpoint_create: Create state checkpoint
- prism_checkpoint_restore: Restore from checkpoint
- prism_state_rebuild: Rebuild state from events

Author: PRISM Manufacturing Intelligence
Version: 1.0.0
"""

import json
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional

# Paths
PRISM_ROOT = Path("C:/PRISM")
SCRIPTS_DIR = PRISM_ROOT / "scripts"
CORE_DIR = SCRIPTS_DIR / "core"

# Import core modules
import sys
sys.path.insert(0, str(CORE_DIR))

try:
    from event_logger import EventLogger, EventType, log_state_update, log_state_patch, log_progress
    from checkpoint_mgr import CheckpointManager, CheckpointType
    from state_version import StateVersionManager
    from state_rollback import StateRollback
except ImportError as e:
    EventLogger = None
    CheckpointManager = None
    StateVersionManager = None
    StateRollback = None
    print(f"Warning: Could not import state modules: {e}")


class StateMCP:
    """MCP tools for append-only state persistence."""
    
    TOOLS = {
        "prism_state_append": {
            "description": "Append a state update event (never overwrites, always appends)",
            "parameters": {
                "type": {"type": "string", "enum": ["update", "patch", "progress"], "default": "update"},
                "path": {"type": "string", "description": "JSON path for update (e.g., 'currentSession.status')"},
                "value": {"description": "Value to set"},
                "patch": {"type": "object", "description": "For patch type: merge patch object"},
                "completed": {"type": "integer", "description": "For progress type: completed count"},
                "total": {"type": "integer", "description": "For progress type: total count"},
                "session_id": {"type": "string", "description": "Optional session ID"}
            }
        },
        "prism_checkpoint_create": {
            "description": "Create a state checkpoint for fast recovery",
            "parameters": {
                "type": {"type": "string", "enum": ["AUTO", "MANUAL", "EMERGENCY", "SESSION_END", "MILESTONE"], "default": "MANUAL"},
                "reason": {"type": "string", "description": "Reason for checkpoint"}
            }
        },
        "prism_checkpoint_restore": {
            "description": "Restore state from a checkpoint (with safety backup)",
            "parameters": {
                "checkpoint_id": {"type": "string", "description": "Checkpoint ID to restore"},
                "sequence": {"type": "integer", "description": "Or sequence number to restore to"},
                "reason": {"type": "string", "description": "Reason for restore"},
                "preview": {"type": "boolean", "default": False, "description": "Preview only, don't restore"}
            }
        },
        "prism_state_rebuild": {
            "description": "Rebuild current state from event log",
            "parameters": {
                "from_checkpoint": {"type": "boolean", "default": True, "description": "Start from last checkpoint"},
                "checkpoint_id": {"type": "string", "description": "Specific checkpoint to start from"},
                "to_sequence": {"type": "integer", "description": "Rebuild up to this sequence"},
                "save": {"type": "boolean", "default": True, "description": "Save rebuilt state"}
            }
        }
    }
    
    def __init__(self):
        self.event_logger = EventLogger() if EventLogger else None
        self.checkpoint_mgr = CheckpointManager() if CheckpointManager else None
        self.state_mgr = StateVersionManager() if StateVersionManager else None
        self.rollback = StateRollback() if StateRollback else None
    
    def call(self, tool_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Route tool call to appropriate handler."""
        handlers = {
            "prism_state_append": self._state_append,
            "prism_checkpoint_create": self._checkpoint_create,
            "prism_checkpoint_restore": self._checkpoint_restore,
            "prism_state_rebuild": self._state_rebuild,
        }
        
        handler = handlers.get(tool_name)
        if handler:
            try:
                return handler(params)
            except Exception as e:
                return {"success": False, "error": str(e)}
        
        return {"success": False, "error": f"Unknown tool: {tool_name}"}
    
    def _state_append(self, params: Dict) -> Dict:
        """Append state update event."""
        if not self.event_logger:
            return {"success": False, "error": "Event logger not available"}
        
        update_type = params.get("type", "update")
        session_id = params.get("session_id")
        
        if update_type == "update":
            path = params.get("path")
            value = params.get("value")
            
            if not path:
                return {"success": False, "error": "Path required for update"}
            
            event = log_state_update(path, value, session_id=session_id)
            return {
                "success": True,
                "event_id": event.id,
                "sequence": event.sequence,
                "type": "STATE_UPDATE",
                "path": path
            }
        
        elif update_type == "patch":
            patch = params.get("patch", {})
            
            if not patch:
                return {"success": False, "error": "Patch object required"}
            
            event = log_state_patch(patch, session_id=session_id)
            return {
                "success": True,
                "event_id": event.id,
                "sequence": event.sequence,
                "type": "STATE_PATCH",
                "keys_patched": list(patch.keys())
            }
        
        elif update_type == "progress":
            completed = params.get("completed", 0)
            total = params.get("total", 0)
            current_item = params.get("current_item")
            
            event = log_progress(completed, total, current_item, session_id=session_id)
            return {
                "success": True,
                "event_id": event.id,
                "sequence": event.sequence,
                "type": "PROGRESS_UPDATE",
                "completed": completed,
                "total": total,
                "percentage": round(completed / total * 100, 1) if total > 0 else 0
            }
        
        return {"success": False, "error": f"Unknown update type: {update_type}"}
    
    def _checkpoint_create(self, params: Dict) -> Dict:
        """Create state checkpoint."""
        if not self.checkpoint_mgr:
            return {"success": False, "error": "Checkpoint manager not available"}
        
        cp_type_str = params.get("type", "MANUAL")
        reason = params.get("reason")
        
        try:
            cp_type = CheckpointType(cp_type_str)
        except ValueError:
            cp_type = CheckpointType.MANUAL
        
        checkpoint = self.checkpoint_mgr.create(cp_type, reason)
        
        return {
            "success": True,
            "checkpoint_id": checkpoint.id,
            "sequence": checkpoint.sequence,
            "type": checkpoint.type,
            "checksum": checkpoint.checksum,
            "size_bytes": checkpoint.size_bytes
        }
    
    def _checkpoint_restore(self, params: Dict) -> Dict:
        """Restore from checkpoint."""
        if not self.rollback:
            return {"success": False, "error": "Rollback system not available"}
        
        checkpoint_id = params.get("checkpoint_id")
        sequence = params.get("sequence")
        reason = params.get("reason", "MCP restore request")
        preview = params.get("preview", False)
        
        if preview:
            return self.rollback.preview_rollback(checkpoint_id, sequence)
        
        if checkpoint_id:
            return self.rollback.rollback_to_checkpoint(checkpoint_id, reason)
        elif sequence is not None:
            return self.rollback.rollback_to_sequence(sequence, reason)
        else:
            return {"success": False, "error": "Must specify checkpoint_id or sequence"}
    
    def _state_rebuild(self, params: Dict) -> Dict:
        """Rebuild state from events."""
        if not self.state_mgr:
            return {"success": False, "error": "State manager not available"}
        
        from_checkpoint = params.get("from_checkpoint", True)
        checkpoint_id = params.get("checkpoint_id")
        to_sequence = params.get("to_sequence")
        save = params.get("save", True)
        
        if from_checkpoint:
            state = self.state_mgr.rebuild_from_checkpoint(checkpoint_id)
        else:
            state = self.state_mgr.rebuild_from_events(to_sequence=to_sequence)
        
        if save:
            self.state_mgr.save()
        
        version_info = self.state_mgr.get_version_info()
        
        return {
            "success": True,
            "state_keys": list(state.keys()),
            "key_count": len(state),
            "version": version_info.get("version"),
            "saved": save
        }
    
    def get_tools_info(self) -> Dict:
        """Get information about available tools."""
        return {
            "tools": list(self.TOOLS.keys()),
            "count": len(self.TOOLS),
            "category": "state",
            "modules_available": {
                "event_logger": self.event_logger is not None,
                "checkpoint_mgr": self.checkpoint_mgr is not None,
                "state_mgr": self.state_mgr is not None,
                "rollback": self.rollback is not None
            }
        }


# Standalone testing
def main():
    import argparse
    parser = argparse.ArgumentParser(description="State MCP Tools Test")
    parser.add_argument("--info", action="store_true", help="Show tools info")
    parser.add_argument("--test", action="store_true", help="Run basic tests")
    
    args = parser.parse_args()
    mcp = StateMCP()
    
    if args.info:
        print(json.dumps(mcp.get_tools_info(), indent=2))
    
    elif args.test:
        print("Testing State MCP Tools...")
        
        # Test state append
        result = mcp.call("prism_state_append", {
            "type": "update",
            "path": "test.value",
            "value": "hello"
        })
        print(f"State append: {result}")
        
        # Test checkpoint create
        result = mcp.call("prism_checkpoint_create", {
            "type": "MANUAL",
            "reason": "Test checkpoint"
        })
        print(f"Checkpoint create: {result}")
        
        # Test state rebuild
        result = mcp.call("prism_state_rebuild", {
            "from_checkpoint": True,
            "save": False
        })
        print(f"State rebuild: {result}")
        
        print("\nAll tests passed!")
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
