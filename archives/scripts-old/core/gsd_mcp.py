#!/usr/bin/env python3
"""
PRISM GSD MCP - Token-efficient access to GSD_CORE and development instructions.
Eliminates need to read files - delivers exactly what's needed via MCP.
"""
from typing import Dict, Any

class GSDMCP:
    """MCP tools for GSD_CORE and development protocol access."""
    
    def prism_gsd_core(self) -> Dict[str, Any]:
        """Get complete GSD_CORE - token-optimized instructions."""
        return {
            "version": "6.0",
            "mcp_server": {"version": "2.5", "tools": 116, "categories": 22},
            "priority_1": "MCP FIRST - Never read files when MCP tool exists",
            "priority_2": "Use prism_gsd_core instead of reading GSD_CORE.md",
            "key_tools": {
                "prism_gsd_core": "Get these instructions via MCP (not file)",
                "prism_gsd_quick": "Minimal essentials only",
                "prism_master_context": "Check context pressure level",
                "prism_master_batch": "Batch 2+ similar operations (5x faster)",
                "prism_master_swarm": "Multi-agent for complex tasks",
                "prism_master_checkpoint": "Save progress every 5-8 ops",
                "prism_formula_apply": "Physics calculations (Kienzle, Taylor)",
                "prism_skill_read": "Load skill content"
            },
            "context_levels": {
                "GREEN": {"range": "0-60%", "action": "normal"},
                "YELLOW": {"range": "60-75%", "action": "batch_ops"},
                "ORANGE": {"range": "75-85%", "action": "checkpoint_now"},
                "RED": {"range": "85-92%", "action": "prepare_handoff"},
                "CRITICAL": {"range": ">92%", "action": "stop_immediately"}
            },
            "laws": {
                "1_SAFETY": "S(x) >= 0.70 or BLOCKED",
                "2_COMPLETE": "No placeholders, 100% done",
                "3_NO_REGRESS": "New >= Old always",
                "4_MCP_FIRST": "Use tools, not file reads"
            },
            "quality_gate": "Ω = 0.25R + 0.20C + 0.15P + 0.30S + 0.10L >= 0.70",
            "session_protocol": {
                "start": ["prism_master_context", "read ROADMAP_TRACKER.json", "read CURRENT_STATE.json"],
                "during": ["prism_master_context every 5-8 ops", "prism_master_checkpoint if pressure > 60%"],
                "end": ["update state files", "update memories if changed"]
            }
        }
    
    def prism_gsd_quick(self) -> Dict[str, Any]:
        """Get minimal GSD - just the essentials."""
        return {
            "rule": "MCP FIRST",
            "batch": "prism_master_batch for 2+ ops",
            "context": "prism_master_context to check pressure",
            "checkpoint": "prism_master_checkpoint every 5-8 ops",
            "laws": ["S(x)>=0.70", "No placeholders", "New>=Old", "MCP First"]
        }
    
    def prism_dev_protocol(self) -> Dict[str, Any]:
        """Get development protocol instructions."""
        return {
            "rules": {
                "1_MCP_FIRST": "prism_* tools > file reads",
                "2_BATCH": "IF 2+ ops -> prism_master_batch",
                "3_MONITOR": "prism_master_context every 5-8 ops",
                "4_CHECKPOINT": "prism_master_checkpoint when pressure > 60%"
            },
            "token_budget": {
                "task": "40%",
                "skills": "30%",
                "state": "20%",
                "buffer": "10%",
                "reserve": "15%"
            },
            "anti_patterns": [
                "Sequential when batchable",
                "File read when MCP exists",
                "Skip context monitoring",
                "Forget checkpoints",
                "Placeholders/TODOs"
            ],
            "validation_gates": {
                "G1": "C: accessible",
                "G5": "Output on C:",
                "G7": "New >= Old",
                "G8": "S(x) >= 0.70",
                "G9": "Ω(x) >= 0.70"
            }
        }
    
    def prism_resources_summary(self) -> Dict[str, Any]:
        """Get quick summary of available resources."""
        return {
            "mcp_tools": 116,
            "mcp_version": "2.5",
            "hooks": {"total": 6797, "domains": 64},
            "formulas": {"total": 490, "categories": 27},
            "agents": {"total": 64, "tiers": ["OPUS", "SONNET", "HAIKU"]},
            "skills": {"total": 153, "real": 146},
            "materials": {"total": 1047, "params": 127},
            "machines": {"total": 824, "manufacturers": 43},
            "scripts": {"total": 443, "substantial": 425}
        }

# Singleton
_instance = None

def get_gsd_mcp():
    global _instance
    if _instance is None:
        _instance = GSDMCP()
    return _instance

if __name__ == "__main__":
    import json
    gsd = get_gsd_mcp()
    print("=== prism_gsd_core ===")
    print(json.dumps(gsd.prism_gsd_core(), indent=2))
    print("\n=== prism_gsd_quick ===")
    print(json.dumps(gsd.prism_gsd_quick(), indent=2))
