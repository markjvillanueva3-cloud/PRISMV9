#!/usr/bin/env python3
"""
HANDOFF_MCP.py - MCP Tools for Session Handoff
Provides MCP interface for session handoff operations.

Tools:
- prism_session_end: Graceful session shutdown
- prism_handoff_prepare: Prepare handoff document
- prism_context_pressure: Monitor context pressure

Author: PRISM Manufacturing Intelligence
Version: 1.0.0
"""

import json
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional, List

# Paths
PRISM_ROOT = Path("C:/PRISM")
STATE_DIR = PRISM_ROOT / "state"
SCRIPTS_DIR = PRISM_ROOT / "scripts"
CORE_DIR = SCRIPTS_DIR / "core"

# Import core modules
import sys
sys.path.insert(0, str(CORE_DIR))

try:
    from graceful_shutdown import GracefulShutdown, ShutdownType
    from context_pressure import ContextPressureMonitor, PressureLevel
    from next_session_prep import NextSessionPreparer
    from wip_capturer import WIPCapturer
except ImportError as e:
    GracefulShutdown = None
    ContextPressureMonitor = None
    NextSessionPreparer = None
    WIPCapturer = None
    print(f"Warning: Could not import handoff modules: {e}")


class HandoffMCP:
    """MCP tools for session handoff."""
    
    TOOLS = {
        "prism_session_end": {
            "description": "Gracefully end current session with complete state preservation",
            "parameters": {
                "shutdown_type": {
                    "type": "string",
                    "enum": ["GRACEFUL", "CHECKPOINT", "EMERGENCY", "SCHEDULED", "USER_REQUESTED"],
                    "default": "GRACEFUL",
                    "description": "Type of shutdown"
                },
                "summary": {
                    "type": "string",
                    "description": "Summary of what was accomplished"
                },
                "next_action": {
                    "type": "string",
                    "description": "What next session should do first"
                },
                "warnings": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Warnings for next session"
                },
                "do_not_forget": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Critical items not to forget"
                }
            }
        },
        "prism_handoff_prepare": {
            "description": "Prepare handoff document for next session",
            "parameters": {
                "format": {
                    "type": "string",
                    "enum": ["JSON", "TEXT", "CLAUDE"],
                    "default": "CLAUDE",
                    "description": "Output format"
                },
                "include_wip": {
                    "type": "boolean",
                    "default": True,
                    "description": "Include work in progress"
                },
                "include_load_order": {
                    "type": "boolean",
                    "default": True,
                    "description": "Include load order for next session"
                },
                "save": {
                    "type": "boolean",
                    "default": True,
                    "description": "Save to file"
                }
            }
        },
        "prism_context_pressure": {
            "description": "Check context window pressure and get recommendations",
            "parameters": {
                "tokens_used": {
                    "type": "integer",
                    "description": "Estimated tokens used (or will estimate if not provided)"
                },
                "action": {
                    "type": "string",
                    "enum": ["check", "recommend", "buffer", "trend"],
                    "default": "check",
                    "description": "What to check"
                }
            }
        }
    }
    
    def __init__(self):
        self.shutdown = GracefulShutdown() if GracefulShutdown else None
        self.pressure_monitor = ContextPressureMonitor() if ContextPressureMonitor else None
        self.preparer = NextSessionPreparer() if NextSessionPreparer else None
        self.wip_capturer = WIPCapturer() if WIPCapturer else None
    
    def call(self, tool_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Route tool call to appropriate handler."""
        handlers = {
            "prism_session_end": self._session_end,
            "prism_handoff_prepare": self._handoff_prepare,
            "prism_context_pressure": self._context_pressure,
        }
        
        handler = handlers.get(tool_name)
        if handler:
            try:
                return handler(params)
            except Exception as e:
                return {"success": False, "error": str(e)}
        
        return {"success": False, "error": f"Unknown tool: {tool_name}"}
    
    def _session_end(self, params: Dict) -> Dict:
        """Gracefully end session."""
        if not self.shutdown:
            return {"success": False, "error": "Shutdown system not available"}
        
        shutdown_type_str = params.get("shutdown_type", "GRACEFUL")
        try:
            shutdown_type = ShutdownType(shutdown_type_str)
        except ValueError:
            shutdown_type = ShutdownType.GRACEFUL
        
        result = self.shutdown.execute(
            shutdown_type=shutdown_type,
            summary=params.get("summary"),
            next_action=params.get("next_action"),
            warnings=params.get("warnings"),
            do_not_forget=params.get("do_not_forget")
        )
        
        return {
            "success": result.success,
            "shutdown_type": result.shutdown_type.value,
            "handoff_id": result.handoff_id,
            "checkpoint_id": result.checkpoint_id,
            "checklist": result.checklist.to_dict(),
            "errors": result.errors,
            "warnings": result.warnings
        }
    
    def _handoff_prepare(self, params: Dict) -> Dict:
        """Prepare handoff document."""
        if not self.preparer:
            return {"success": False, "error": "Preparer not available"}
        
        format_type = params.get("format", "CLAUDE")
        include_wip = params.get("include_wip", True)
        include_load_order = params.get("include_load_order", True)
        save = params.get("save", True)
        
        # Generate preparation
        prep = self.preparer.generate()
        
        if save:
            self.preparer.save(prep)
        
        # Add WIP if requested
        wip_summary = None
        if include_wip and self.wip_capturer:
            wip_summary = self.wip_capturer.get_handoff_summary()
        
        # Format output
        if format_type == "JSON":
            output = prep.to_dict()
            if wip_summary:
                output["wip"] = wip_summary
            return {
                "success": True,
                "format": "JSON",
                "preparation": output,
                "saved": save
            }
        elif format_type == "CLAUDE":
            text = self.preparer.format_for_claude(prep)
            return {
                "success": True,
                "format": "CLAUDE",
                "preparation": text,
                "saved": save
            }
        else:  # TEXT
            return {
                "success": True,
                "format": "TEXT",
                "quick_resume": prep.quick_resume,
                "immediate_action": prep.immediate_action,
                "complexity": prep.complexity.value,
                "estimated_time": prep.estimated_time,
                "saved": save
            }
    
    def _context_pressure(self, params: Dict) -> Dict:
        """Check context pressure."""
        if not self.pressure_monitor:
            return {"success": False, "error": "Pressure monitor not available"}
        
        action = params.get("action", "check")
        tokens_used = params.get("tokens_used")
        
        # Estimate if not provided
        if tokens_used is None:
            tokens_used = self.pressure_monitor.estimate_tokens(message_count=20)
        
        if action == "check":
            reading = self.pressure_monitor.check(tokens_used)
            should_cp, cp_reason = self.pressure_monitor.should_checkpoint(tokens_used)
            should_ho, ho_reason = self.pressure_monitor.should_handoff(tokens_used)
            
            return {
                "success": True,
                "level": reading.level.value,
                "percentage": reading.percentage,
                "tokens_used": reading.tokens_used,
                "tokens_available": reading.tokens_available,
                "recommendation": reading.recommendation,
                "should_checkpoint": should_cp,
                "checkpoint_reason": cp_reason,
                "should_handoff": should_ho,
                "handoff_reason": ho_reason
            }
        
        elif action == "recommend":
            reading = self.pressure_monitor.check(tokens_used)
            recommendations = self.pressure_monitor.get_recommendations(reading.level)
            return {
                "success": True,
                "level": reading.level.value,
                "recommendations": recommendations
            }
        
        elif action == "buffer":
            buffers = self.pressure_monitor.get_buffer_zone(tokens_used)
            return {
                "success": True,
                "buffers": buffers
            }
        
        elif action == "trend":
            trend = self.pressure_monitor.get_trend()
            return {
                "success": True,
                "trend": trend
            }
        
        return {"success": False, "error": f"Unknown action: {action}"}
    
    def get_tools_info(self) -> Dict:
        """Get information about available tools."""
        return {
            "tools": list(self.TOOLS.keys()),
            "count": len(self.TOOLS),
            "category": "handoff",
            "modules_available": {
                "shutdown": self.shutdown is not None,
                "pressure_monitor": self.pressure_monitor is not None,
                "preparer": self.preparer is not None,
                "wip_capturer": self.wip_capturer is not None
            }
        }


# Standalone testing
def main():
    import argparse
    parser = argparse.ArgumentParser(description="Handoff MCP Tools Test")
    parser.add_argument("--info", action="store_true", help="Show tools info")
    parser.add_argument("--test", action="store_true", help="Run basic tests")
    parser.add_argument("--end", action="store_true", help="End session")
    parser.add_argument("--prepare", action="store_true", help="Prepare handoff")
    parser.add_argument("--pressure", action="store_true", help="Check pressure")
    parser.add_argument("--tokens", type=int, default=50000, help="Tokens for pressure check")
    
    args = parser.parse_args()
    mcp = HandoffMCP()
    
    if args.info:
        print(json.dumps(mcp.get_tools_info(), indent=2))
    
    elif args.test:
        print("Testing Handoff MCP Tools...")
        
        # Test pressure
        result = mcp.call("prism_context_pressure", {
            "tokens_used": 50000,
            "action": "check"
        })
        print(f"Pressure check: {result.get('level')}, {result.get('percentage')}%")
        
        # Test prepare
        result = mcp.call("prism_handoff_prepare", {
            "format": "TEXT",
            "save": False
        })
        print(f"Handoff prepare: {result.get('success')}")
        
        print("\nAll tests passed!")
    
    elif args.end:
        result = mcp.call("prism_session_end", {
            "shutdown_type": "GRACEFUL",
            "summary": "Test session end",
            "next_action": "Continue testing"
        })
        print(json.dumps(result, indent=2))
    
    elif args.prepare:
        result = mcp.call("prism_handoff_prepare", {
            "format": "CLAUDE",
            "save": False
        })
        if result.get("success"):
            print(result.get("preparation"))
        else:
            print(json.dumps(result, indent=2))
    
    elif args.pressure:
        result = mcp.call("prism_context_pressure", {
            "tokens_used": args.tokens,
            "action": "check"
        })
        print(json.dumps(result, indent=2))
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
