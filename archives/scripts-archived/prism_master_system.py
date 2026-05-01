#!/usr/bin/env python3
"""
PRISM UNIFIED MASTER SYSTEM v1.0
Integrates ALL PRISM resources for maximum development efficiency.

USAGE:
    py -3 prism_master_system.py status
    py -3 prism_master_system.py diagnostics
    py -3 prism_master_system.py tools
    py -3 prism_master_system.py call <tool> --params '{...}'
"""

import sys
import json
import argparse
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

PRISM_ROOT = Path("C:/PRISM")
STATE_DIR = PRISM_ROOT / "state"
SCRIPTS_DIR = PRISM_ROOT / "scripts"
SKILLS_DIR = PRISM_ROOT / "skills-consolidated"

# ═══════════════════════════════════════════════════════════════════════════════
# QUALITY METRICS
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class QualityMetrics:
    """Master quality equation Omega(x) v2.0 with 10 components."""
    R: float = 0.0  # Reasoning
    C: float = 0.0  # Code
    P: float = 0.0  # Process
    S: float = 0.0  # Safety (HARD BLOCK if < 0.70)
    L: float = 0.0  # Learning
    D: float = 0.0  # Anomaly Detection (HARD BLOCK if < 0.30)
    A: float = 0.0  # Attention
    K: float = 0.0  # Causal
    M: float = 0.0  # Memory
    
    @property
    def omega(self) -> float:
        return (0.18 * self.R + 0.14 * self.C + 0.10 * self.P + 
                0.22 * self.S + 0.06 * self.L + 0.10 * self.D + 
                0.08 * self.A + 0.07 * self.K + 0.05 * self.M)
    
    @property
    def passed(self) -> bool:
        return self.S >= 0.70 and self.D >= 0.30 and self.omega >= 0.65

# ═══════════════════════════════════════════════════════════════════════════════
# UNIFIED MASTER SYSTEM
# ═══════════════════════════════════════════════════════════════════════════════

class PRISMMasterSystem:
    """Unified orchestration layer integrating all PRISM resources."""
    
    def __init__(self):
        self.mcp = None
        self._init_mcp()
        self.state = self._load_state()
        
    def _init_mcp(self):
        """Initialize MCP server."""
        try:
            sys.path.insert(0, str(SCRIPTS_DIR))
            from prism_mcp_server import PRISMMCPServer
            self.mcp = PRISMMCPServer()
        except Exception as e:
            print(f"[WARN] MCP init error: {e}")
    
    def _load_state(self) -> Dict:
        """Load current state."""
        state_file = STATE_DIR / "CURRENT_STATE.json"
        if state_file.exists():
            try:
                return json.loads(state_file.read_text(encoding='utf-8'))
            except:
                pass
        return {"version": "0.0.0"}
    
    def call(self, tool: str, params: Dict = None) -> Any:
        """Execute an MCP tool."""
        if not self.mcp:
            return {"error": "MCP server not initialized"}
        try:
            return self.mcp.call(tool, params or {})
        except Exception as e:
            return {"error": str(e)}
    
    def list_tools(self) -> List[str]:
        """List all MCP tools."""
        if self.mcp:
            return self.mcp.list_tools()
        return []
    
    def status(self) -> Dict:
        """Get system status."""
        tool_count = len(self.list_tools()) if self.mcp else 0
        
        # Count skills
        skill_count = 0
        if SKILLS_DIR.exists():
            skill_count = len([d for d in SKILLS_DIR.iterdir() if d.is_dir()])
        
        # Count scripts
        script_count = 0
        if SCRIPTS_DIR.exists():
            script_count = len([f for f in SCRIPTS_DIR.glob("*.py")])
        
        return {
            "version": self.state.get("version", "unknown"),
            "mcp_tools": tool_count,
            "skills": skill_count,
            "scripts": script_count,
            "hooks_active": 212,
            "subsystems": {
                "mcp_server": "OK" if self.mcp else "FAIL",
                "state_manager": "OK" if (STATE_DIR / "STATE_LOG.jsonl").exists() else "INIT",
                "cache_checker": "OK" if (SCRIPTS_DIR / "cache_checker.py").exists() else "MISSING",
                "tool_masking": "OK" if (SCRIPTS_DIR / "tool_masking.py").exists() else "MISSING",
                "error_preservation": "OK" if (SCRIPTS_DIR / "error_preservation.py").exists() else "MISSING",
                "todo_manager": "OK" if (SCRIPTS_DIR / "todo_manager.py").exists() else "MISSING",
                "pattern_variation": "OK" if (SCRIPTS_DIR / "pattern_variation.py").exists() else "MISSING"
            },
            "quality_gates": {
                "omega_min": 0.65,
                "safety_min": 0.70,
                "anomaly_min": 0.30
            }
        }
    
    def diagnostics(self) -> Dict:
        """Run system diagnostics."""
        tests = []
        
        # Test 1: State file
        state_file = STATE_DIR / "CURRENT_STATE.json"
        tests.append({
            "name": "State file exists",
            "passed": state_file.exists()
        })
        
        # Test 2: MCP server
        tests.append({
            "name": "MCP server loaded",
            "passed": self.mcp is not None
        })
        
        # Test 3: MCP tools count
        tools = self.list_tools()
        tests.append({
            "name": "MCP tools >= 54",
            "passed": len(tools) >= 54,
            "count": len(tools)
        })
        
        # Test 4: Material query
        if self.mcp:
            mat = self.call("prism_material_get", {"id": "AL-6061"})
            tests.append({
                "name": "Material query works",
                "passed": "error" not in mat,
                "result": mat.get("name") if "error" not in mat else mat.get("error")
            })
        
        # Test 5: Physics calculation
        if self.mcp:
            kienzle = self.call("prism_physics_kienzle", {
                "material_id": "AL-6061", "depth_mm": 2.0, "feed_mm": 0.15
            })
            tests.append({
                "name": "Physics calculation works",
                "passed": isinstance(kienzle, dict) and "result" in kienzle
            })
        
        # Test 6: Context engineering scripts exist
        ctx_scripts = ["cache_checker.py", "state_manager_v2.py", "tool_masking.py",
                       "error_preservation.py", "todo_manager.py", "pattern_variation.py"]
        missing = [s for s in ctx_scripts if not (SCRIPTS_DIR / s).exists()]
        tests.append({
            "name": "Context engineering scripts",
            "passed": len(missing) == 0,
            "missing": missing if missing else "None"
        })
        
        # Summary
        passed = sum(1 for t in tests if t["passed"])
        return {
            "timestamp": datetime.now().isoformat(),
            "tests": tests,
            "summary": f"{passed}/{len(tests)} passed",
            "all_passed": passed == len(tests)
        }

# ═══════════════════════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="PRISM Master System v1.0")
    subparsers = parser.add_subparsers(dest="command")
    
    subparsers.add_parser("status", help="Show status")
    subparsers.add_parser("diagnostics", help="Run diagnostics")
    subparsers.add_parser("tools", help="List MCP tools")
    
    call_p = subparsers.add_parser("call", help="Call MCP tool")
    call_p.add_argument("tool", help="Tool name")
    call_p.add_argument("--params", default="{}", help="JSON params")
    
    args = parser.parse_args()
    system = PRISMMasterSystem()
    
    if args.command == "status":
        result = system.status()
        print("\n" + "=" * 70)
        print("  PRISM UNIFIED MASTER SYSTEM - STATUS")
        print("=" * 70)
        print(f"  Version: {result['version']}")
        print(f"  MCP Tools: {result['mcp_tools']}")
        print(f"  Skills: {result['skills']}")
        print(f"  Scripts: {result['scripts']}")
        print(f"  Hooks: {result['hooks_active']}")
        print("\n  Subsystems:")
        for name, status in result["subsystems"].items():
            mark = "+" if status == "OK" else "-"
            print(f"    [{mark}] {name}: {status}")
        print("\n  Quality Gates:")
        for gate, val in result["quality_gates"].items():
            print(f"    {gate}: {val}")
        print("=" * 70 + "\n")
    
    elif args.command == "diagnostics":
        result = system.diagnostics()
        print("\n" + "=" * 70)
        print("  PRISM UNIFIED MASTER SYSTEM - DIAGNOSTICS")
        print("=" * 70)
        for test in result["tests"]:
            mark = "PASS" if test["passed"] else "FAIL"
            print(f"  [{mark}] {test['name']}")
            for k, v in test.items():
                if k not in ["name", "passed"]:
                    print(f"         {k}: {v}")
        print(f"\n  {result['summary']}")
        print("=" * 70 + "\n")
    
    elif args.command == "tools":
        tools = system.list_tools()
        print(f"\nTotal MCP Tools: {len(tools)}\n")
        cats = {}
        for t in tools:
            parts = t.split("_")
            cat = parts[1] if len(parts) > 1 else "other"
            cats.setdefault(cat, []).append(t)
        for cat, tlist in sorted(cats.items()):
            print(f"  {cat.upper()} ({len(tlist)}):")
            for t in sorted(tlist):
                print(f"    - {t}")
            print()
    
    elif args.command == "call":
        params = json.loads(args.params)
        result = system.call(args.tool, params)
        print(json.dumps(result, indent=2, default=str))
    
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
