"""
PRISM Agent MCP Proxy - CORE.2
Enhancement Roadmap v4.0 | 4 hours estimated

PROBLEM: API agents don't have MCP access (MCP connects to CLIENT)
SOLUTION: Orchestrator proxies tool calls

Agent requests tool → Orchestrator intercepts → MCP executes → Returns

ENABLES: True parallel agent execution with full tool access
SPEEDUP: 6x faster multi-agent tasks

Components:
1. Tool schema converter (MCP → API format)
2. Proxy loop with tool call handling
3. Parallel agent spawning
4. Integration with existing MCP server

@version 1.0.0
@author PRISM Development Team
"""

import os
import sys
import json
import asyncio
import subprocess
from typing import Dict, List, Any, Optional, Callable, Tuple
from dataclasses import dataclass, field
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

# Add parent to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    import anthropic
    HAS_ANTHROPIC = True
except ImportError:
    HAS_ANTHROPIC = False
    print("Warning: anthropic package not installed. API features disabled.")


# ============================================================================
# CONFIGURATION
# ============================================================================

@dataclass
class ProxyConfig:
    """Configuration for Agent MCP Proxy."""
    model: str = "claude-sonnet-4-20250514"
    max_tokens: int = 8192
    temperature: float = 0.3
    max_tool_calls: int = 50  # Per agent session
    timeout_seconds: int = 300
    parallel_limit: int = 8  # Max concurrent agents
    mcp_server_path: str = r"C:\PRISM\mcp-server"
    registries_path: str = r"C:\PRISM\registries"
    skills_path: str = r"C:\PRISM\skills-consolidated"


# ============================================================================
# MCP TOOL DEFINITIONS
# ============================================================================

# Core MCP tools that can be proxied to agents
MCP_TOOL_SCHEMAS: Dict[str, Dict[str, Any]] = {
    # Data Access Tools
    "query_material": {
        "name": "query_material",
        "description": "Get material with all 127 parameters by ID or search criteria",
        "input_schema": {
            "type": "object",
            "properties": {
                "id": {"type": "string", "description": "Material ID (e.g., 'MAT-P-CS-1045')"},
                "name": {"type": "string", "description": "Material name to search"},
                "category": {"type": "string", "description": "ISO category (P, M, K, N, S, H)"},
                "include_physics": {"type": "boolean", "description": "Include Kienzle/Taylor params", "default": True}
            },
            "required": []
        }
    },
    "query_machine": {
        "name": "query_machine",
        "description": "Get machine specifications by ID or manufacturer",
        "input_schema": {
            "type": "object",
            "properties": {
                "id": {"type": "string", "description": "Machine ID"},
                "manufacturer": {"type": "string", "description": "Manufacturer name"},
                "model": {"type": "string", "description": "Model name/number"}
            },
            "required": []
        }
    },
    "query_tool": {
        "name": "query_tool",
        "description": "Get cutting tool specifications",
        "input_schema": {
            "type": "object",
            "properties": {
                "id": {"type": "string", "description": "Tool ID"},
                "type": {"type": "string", "description": "Tool type (endmill, drill, etc.)"},
                "diameter": {"type": "number", "description": "Tool diameter in mm"}
            },
            "required": []
        }
    },
    "query_alarm": {
        "name": "query_alarm",
        "description": "Get CNC alarm information by code or controller",
        "input_schema": {
            "type": "object",
            "properties": {
                "code": {"type": "string", "description": "Alarm code"},
                "controller": {"type": "string", "description": "Controller family (FANUC, SIEMENS, etc.)"},
                "category": {"type": "string", "description": "Alarm category"}
            },
            "required": []
        }
    },
    
    # Physics/Calculation Tools
    "compute_kienzle": {
        "name": "compute_kienzle",
        "description": "Compute cutting force using Kienzle model: Fc = kc1.1 × h^mc × b",
        "input_schema": {
            "type": "object",
            "properties": {
                "material_id": {"type": "string", "description": "Material ID for kc1.1, mc lookup"},
                "kc1_1": {"type": "number", "description": "Specific cutting force (N/mm²) - if not using material_id"},
                "mc": {"type": "number", "description": "Kienzle exponent - if not using material_id"},
                "h": {"type": "number", "description": "Uncut chip thickness (mm)"},
                "b": {"type": "number", "description": "Width of cut (mm)"},
                "rake_angle": {"type": "number", "description": "Rake angle correction (degrees)", "default": 0}
            },
            "required": ["h", "b"]
        }
    },
    "compute_taylor": {
        "name": "compute_taylor",
        "description": "Compute tool life using Taylor equation: VT^n = C",
        "input_schema": {
            "type": "object",
            "properties": {
                "material_id": {"type": "string", "description": "Material ID for n, C lookup"},
                "n": {"type": "number", "description": "Taylor exponent - if not using material_id"},
                "C": {"type": "number", "description": "Taylor constant - if not using material_id"},
                "cutting_speed": {"type": "number", "description": "Cutting speed (m/min)"},
                "target_life": {"type": "number", "description": "Target tool life (min) - solve for V"}
            },
            "required": []
        }
    },
    "compute_surface_finish": {
        "name": "compute_surface_finish",
        "description": "Compute theoretical surface roughness Ra",
        "input_schema": {
            "type": "object",
            "properties": {
                "feed_per_rev": {"type": "number", "description": "Feed per revolution (mm/rev)"},
                "nose_radius": {"type": "number", "description": "Tool nose radius (mm)"},
                "operation": {"type": "string", "description": "turning, milling, etc."}
            },
            "required": ["feed_per_rev", "nose_radius"]
        }
    },
    "compute_mrr": {
        "name": "compute_mrr",
        "description": "Compute Material Removal Rate",
        "input_schema": {
            "type": "object",
            "properties": {
                "cutting_speed": {"type": "number", "description": "Cutting speed (m/min)"},
                "feed": {"type": "number", "description": "Feed rate (mm/rev or mm/tooth)"},
                "depth_of_cut": {"type": "number", "description": "Axial depth (mm)"},
                "width_of_cut": {"type": "number", "description": "Radial width (mm)"},
                "operation": {"type": "string", "description": "turning or milling"}
            },
            "required": ["cutting_speed", "feed", "depth_of_cut"]
        }
    },
    
    # Validation Tools
    "validate_kienzle": {
        "name": "validate_kienzle",
        "description": "Validate Kienzle coefficients against physics constraints",
        "input_schema": {
            "type": "object",
            "properties": {
                "kc1_1": {"type": "number", "description": "Specific cutting force (N/mm²)"},
                "mc": {"type": "number", "description": "Kienzle exponent"},
                "material_category": {"type": "string", "description": "ISO category for range checking"}
            },
            "required": ["kc1_1", "mc"]
        }
    },
    "compute_safety_score": {
        "name": "compute_safety_score",
        "description": "Compute S(x) safety score for machining parameters",
        "input_schema": {
            "type": "object",
            "properties": {
                "spindle_speed": {"type": "number", "description": "RPM"},
                "feed_rate": {"type": "number", "description": "Feed (mm/min)"},
                "depth_of_cut": {"type": "number", "description": "DOC (mm)"},
                "tool_diameter": {"type": "number", "description": "Tool diameter (mm)"},
                "material_id": {"type": "string", "description": "Material ID"},
                "machine_id": {"type": "string", "description": "Machine ID"}
            },
            "required": ["spindle_speed", "feed_rate", "depth_of_cut"]
        }
    },
    "check_limits": {
        "name": "check_limits",
        "description": "Check if value is within valid limits for material/parameter",
        "input_schema": {
            "type": "object",
            "properties": {
                "value": {"type": "number", "description": "Value to check"},
                "parameter": {"type": "string", "description": "Parameter name"},
                "material_id": {"type": "string", "description": "Material ID for context"},
                "machine_id": {"type": "string", "description": "Machine ID for context"}
            },
            "required": ["value", "parameter"]
        }
    },
    
    # Formula Tools
    "query_formula": {
        "name": "query_formula",
        "description": "Get formula definition and implementation",
        "input_schema": {
            "type": "object",
            "properties": {
                "id": {"type": "string", "description": "Formula ID (e.g., 'F-CUT-001')"},
                "domain": {"type": "string", "description": "Formula domain"},
                "search": {"type": "string", "description": "Search term"}
            },
            "required": []
        }
    },
    "execute_formula": {
        "name": "execute_formula",
        "description": "Execute a registered formula with parameters",
        "input_schema": {
            "type": "object",
            "properties": {
                "formula_id": {"type": "string", "description": "Formula ID"},
                "parameters": {"type": "object", "description": "Formula input parameters"}
            },
            "required": ["formula_id", "parameters"]
        }
    },
    
    # Wiring/Architecture Tools
    "trace_wiring": {
        "name": "trace_wiring",
        "description": "Trace connections through architecture layers",
        "input_schema": {
            "type": "object",
            "properties": {
                "start_id": {"type": "string", "description": "Starting resource ID"},
                "direction": {"type": "string", "description": "upstream or downstream"},
                "max_depth": {"type": "integer", "description": "Max layers to traverse", "default": 5}
            },
            "required": ["start_id"]
        }
    },
    "find_consumers": {
        "name": "find_consumers",
        "description": "Find all consumers of a resource",
        "input_schema": {
            "type": "object",
            "properties": {
                "resource_id": {"type": "string", "description": "Resource ID"},
                "resource_type": {"type": "string", "description": "database, formula, engine, skill"}
            },
            "required": ["resource_id"]
        }
    }
}


# ============================================================================
# TOOL SCHEMA CONVERTER
# ============================================================================

class ToolSchemaConverter:
    """Converts MCP tool schemas to Anthropic API format."""
    
    @staticmethod
    def mcp_to_api(mcp_schema: Dict[str, Any]) -> Dict[str, Any]:
        """Convert MCP tool schema to Anthropic API tool format."""
        return {
            "name": mcp_schema["name"],
            "description": mcp_schema["description"],
            "input_schema": mcp_schema["input_schema"]
        }
    
    @staticmethod
    def get_tools_for_agent(tool_names: List[str]) -> List[Dict[str, Any]]:
        """Get API-formatted tool definitions for specified tools."""
        tools = []
        for name in tool_names:
            if name in MCP_TOOL_SCHEMAS:
                tools.append(ToolSchemaConverter.mcp_to_api(MCP_TOOL_SCHEMAS[name]))
        return tools
    
    @staticmethod
    def get_all_tools() -> List[Dict[str, Any]]:
        """Get all available tools in API format."""
        return [ToolSchemaConverter.mcp_to_api(s) for s in MCP_TOOL_SCHEMAS.values()]


# ============================================================================
# MCP TOOL EXECUTOR (Local Implementation)
# ============================================================================

class MCPToolExecutor:
    """Executes MCP tool calls locally using registry data."""
    
    def __init__(self, config: ProxyConfig):
        self.config = config
        self.registries = {}
        self._load_registries()
    
    def _load_registries(self):
        """Load registry data for tool execution."""
        registry_files = {
            "materials": "MATERIAL_REGISTRY.json",
            "machines": "MACHINE_REGISTRY.json", 
            "tools": "TOOL_REGISTRY.json",
            "alarms": "ALARM_REGISTRY.json",
            "formulas": "FORMULA_REGISTRY.json",
            "engines": "ENGINE_REGISTRY.json",
            "databases": "DATABASE_REGISTRY.json",
            "wiring_d2f": "PRECISE_WIRING_D2F.json",
            "wiring_f2e": "PRECISE_WIRING_F2E.json",
            "wiring_e2s": "PRECISE_WIRING_E2S.json"
        }
        
        for key, filename in registry_files.items():
            filepath = os.path.join(self.config.registries_path, filename)
            if os.path.exists(filepath):
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        self.registries[key] = json.load(f)
                except Exception as e:
                    print(f"Warning: Could not load {filename}: {e}")
                    self.registries[key] = {}
    
    def execute(self, tool_name: str, tool_input: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a tool call and return result."""
        method_name = f"_exec_{tool_name}"
        if hasattr(self, method_name):
            try:
                return getattr(self, method_name)(tool_input)
            except Exception as e:
                return {"error": str(e), "tool": tool_name}
        else:
            return {"error": f"Tool '{tool_name}' not implemented", "tool": tool_name}
    
    # --- Data Access Tools ---
    
    def _exec_query_material(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Query material database."""
        materials = self.registries.get("materials", {}).get("materials", [])
        
        if params.get("id"):
            for mat in materials:
                if mat.get("id") == params["id"]:
                    return {"found": True, "material": mat}
        
        if params.get("name"):
            search = params["name"].lower()
            matches = [m for m in materials if search in m.get("name", "").lower()]
            return {"found": len(matches) > 0, "count": len(matches), "materials": matches[:10]}
        
        if params.get("category"):
            matches = [m for m in materials if m.get("category") == params["category"]]
            return {"found": len(matches) > 0, "count": len(matches), "materials": matches[:20]}
        
        return {"found": False, "error": "No search criteria provided"}
    
    def _exec_query_machine(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Query machine database."""
        machines = self.registries.get("machines", {}).get("machines", [])
        
        if params.get("id"):
            for mach in machines:
                if mach.get("id") == params["id"]:
                    return {"found": True, "machine": mach}
        
        if params.get("manufacturer"):
            search = params["manufacturer"].lower()
            matches = [m for m in machines if search in m.get("manufacturer", "").lower()]
            return {"found": len(matches) > 0, "count": len(matches), "machines": matches[:10]}
        
        return {"found": False, "error": "No search criteria provided"}
    
    def _exec_query_alarm(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Query alarm database."""
        alarms = self.registries.get("alarms", {}).get("alarms", [])
        
        if params.get("code") and params.get("controller"):
            for alarm in alarms:
                if (alarm.get("code") == params["code"] and 
                    alarm.get("controller") == params["controller"]):
                    return {"found": True, "alarm": alarm}
        
        if params.get("controller"):
            matches = [a for a in alarms if a.get("controller") == params["controller"]]
            return {"found": len(matches) > 0, "count": len(matches), "alarms": matches[:20]}
        
        return {"found": False, "error": "No search criteria provided"}
    
    # --- Physics/Calculation Tools ---
    
    def _exec_compute_kienzle(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Compute Kienzle cutting force."""
        kc1_1 = params.get("kc1_1")
        mc = params.get("mc")
        
        # Look up from material if not provided
        if params.get("material_id") and (kc1_1 is None or mc is None):
            mat_result = self._exec_query_material({"id": params["material_id"]})
            if mat_result.get("found"):
                mat = mat_result["material"]
                kc1_1 = kc1_1 or mat.get("kienzle", {}).get("kc1_1", 1800)
                mc = mc or mat.get("kienzle", {}).get("mc", 0.25)
        
        kc1_1 = kc1_1 or 1800  # Default for steel
        mc = mc or 0.25
        h = params["h"]
        b = params["b"]
        rake_correction = 1.0 - 0.01 * params.get("rake_angle", 0)
        
        # Kienzle formula: Fc = kc1.1 × h^(1-mc) × b × rake_correction
        Fc = kc1_1 * (h ** (1 - mc)) * b * rake_correction
        
        return {
            "cutting_force_N": round(Fc, 2),
            "kc1_1": kc1_1,
            "mc": mc,
            "h": h,
            "b": b,
            "formula": "Fc = kc1.1 × h^(1-mc) × b"
        }
    
    def _exec_compute_taylor(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Compute Taylor tool life."""
        n = params.get("n")
        C = params.get("C")
        
        if params.get("material_id") and (n is None or C is None):
            mat_result = self._exec_query_material({"id": params["material_id"]})
            if mat_result.get("found"):
                mat = mat_result["material"]
                n = n or mat.get("taylor", {}).get("n", 0.25)
                C = C or mat.get("taylor", {}).get("C", 200)
        
        n = n or 0.25
        C = C or 200
        
        if params.get("cutting_speed"):
            V = params["cutting_speed"]
            T = (C / V) ** (1/n)
            return {
                "tool_life_min": round(T, 2),
                "cutting_speed": V,
                "n": n,
                "C": C,
                "formula": "T = (C/V)^(1/n)"
            }
        elif params.get("target_life"):
            T = params["target_life"]
            V = C / (T ** n)
            return {
                "recommended_speed": round(V, 2),
                "target_life": T,
                "n": n,
                "C": C,
                "formula": "V = C / T^n"
            }
        
        return {"error": "Provide either cutting_speed or target_life"}
    
    def _exec_compute_surface_finish(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Compute theoretical surface roughness."""
        f = params["feed_per_rev"]
        r = params["nose_radius"]
        
        # Theoretical Ra = f² / (32 × r) (for turning)
        Ra = (f ** 2) / (32 * r) * 1000  # Convert to μm
        
        return {
            "Ra_um": round(Ra, 3),
            "feed_per_rev": f,
            "nose_radius": r,
            "formula": "Ra = f² / (32 × r)"
        }
    
    def _exec_compute_mrr(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Compute material removal rate."""
        Vc = params["cutting_speed"]
        f = params["feed"]
        ap = params["depth_of_cut"]
        ae = params.get("width_of_cut", ap)  # Default to ap if not specified
        
        if params.get("operation") == "turning":
            # MRR = Vc × f × ap (turning)
            MRR = Vc * f * ap * 1000  # mm³/min
        else:
            # MRR = ae × ap × Vf (milling, Vf = n × fz × z)
            MRR = ae * ap * Vc * f / 1000  # Simplified
        
        return {
            "MRR_cm3_per_min": round(MRR / 1000, 2),
            "MRR_mm3_per_min": round(MRR, 2),
            "parameters": params
        }
    
    # --- Validation Tools ---
    
    def _exec_validate_kienzle(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Validate Kienzle coefficients."""
        kc1_1 = params["kc1_1"]
        mc = params["mc"]
        category = params.get("material_category", "P")
        
        # Physical validity ranges by category
        ranges = {
            "P": {"kc1_1": (1200, 3000), "mc": (0.15, 0.35)},  # Steels
            "M": {"kc1_1": (1800, 3500), "mc": (0.20, 0.35)},  # Stainless
            "K": {"kc1_1": (800, 1800), "mc": (0.20, 0.35)},   # Cast iron
            "N": {"kc1_1": (500, 1200), "mc": (0.20, 0.40)},   # Non-ferrous
            "S": {"kc1_1": (2500, 5000), "mc": (0.20, 0.35)},  # Superalloys
            "H": {"kc1_1": (2800, 5500), "mc": (0.15, 0.30)}   # Hardened
        }
        
        r = ranges.get(category, ranges["P"])
        issues = []
        
        if not (r["kc1_1"][0] <= kc1_1 <= r["kc1_1"][1]):
            issues.append(f"kc1_1 {kc1_1} outside range {r['kc1_1']} for category {category}")
        if not (r["mc"][0] <= mc <= r["mc"][1]):
            issues.append(f"mc {mc} outside range {r['mc']} for category {category}")
        
        return {
            "valid": len(issues) == 0,
            "kc1_1": kc1_1,
            "mc": mc,
            "category": category,
            "expected_ranges": r,
            "issues": issues
        }
    
    def _exec_compute_safety_score(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Compute S(x) safety score."""
        # Simplified safety scoring
        score = 1.0
        issues = []
        
        rpm = params.get("spindle_speed", 0)
        feed = params.get("feed_rate", 0)
        doc = params.get("depth_of_cut", 0)
        
        # Basic limit checks
        if rpm > 20000:
            score -= 0.2
            issues.append("Spindle speed > 20000 RPM")
        if doc > 10:
            score -= 0.15
            issues.append("Depth of cut > 10mm")
        if feed > 5000:
            score -= 0.1
            issues.append("Feed rate > 5000 mm/min")
        
        return {
            "S_x": round(max(0, score), 2),
            "passes_threshold": score >= 0.70,
            "threshold": 0.70,
            "issues": issues,
            "parameters": params
        }
    
    def _exec_check_limits(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Check parameter limits."""
        value = params["value"]
        param = params["parameter"]
        
        # Common parameter limits
        limits = {
            "spindle_speed": (0, 40000),
            "feed_rate": (0, 20000),
            "depth_of_cut": (0, 50),
            "cutting_speed": (0, 1000),
            "kc1_1": (200, 6000),
            "mc": (0.1, 0.5),
            "tool_diameter": (0.1, 100)
        }
        
        lim = limits.get(param, (float('-inf'), float('inf')))
        in_range = lim[0] <= value <= lim[1]
        
        return {
            "in_range": in_range,
            "value": value,
            "parameter": param,
            "limits": {"min": lim[0], "max": lim[1]}
        }
    
    # --- Formula Tools ---
    
    def _exec_query_formula(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Query formula registry."""
        formulas = self.registries.get("formulas", {}).get("formulas", [])
        
        if params.get("id"):
            for f in formulas:
                if f.get("id") == params["id"]:
                    return {"found": True, "formula": f}
        
        if params.get("domain"):
            matches = [f for f in formulas if f.get("domain") == params["domain"]]
            return {"found": len(matches) > 0, "count": len(matches), "formulas": matches[:10]}
        
        if params.get("search"):
            search = params["search"].lower()
            matches = [f for f in formulas if search in f.get("name", "").lower()]
            return {"found": len(matches) > 0, "count": len(matches), "formulas": matches[:10]}
        
        return {"found": False, "error": "No search criteria provided"}
    
    # --- Wiring Tools ---
    
    def _exec_trace_wiring(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Trace wiring connections."""
        start_id = params["start_id"]
        direction = params.get("direction", "downstream")
        max_depth = params.get("max_depth", 5)
        
        # Simplified wiring trace
        connections = []
        
        # Check D→F wiring
        d2f = self.registries.get("wiring_d2f", {}).get("connections", [])
        for conn in d2f:
            if conn.get("from") == start_id or conn.get("to") == start_id:
                connections.append({"layer": "D→F", "connection": conn})
        
        # Check F→E wiring  
        f2e = self.registries.get("wiring_f2e", {}).get("connections", [])
        for conn in f2e:
            if conn.get("from") == start_id or conn.get("to") == start_id:
                connections.append({"layer": "F→E", "connection": conn})
        
        return {
            "start_id": start_id,
            "direction": direction,
            "connections_found": len(connections),
            "connections": connections[:20]
        }
    
    def _exec_find_consumers(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Find consumers of a resource."""
        resource_id = params["resource_id"]
        consumers = []
        
        # Search wiring layers for consumers
        for wiring_key in ["wiring_d2f", "wiring_f2e", "wiring_e2s"]:
            wiring = self.registries.get(wiring_key, {}).get("connections", [])
            for conn in wiring:
                if conn.get("from") == resource_id:
                    consumers.append({
                        "consumer_id": conn.get("to"),
                        "layer": wiring_key,
                        "connection_type": conn.get("type", "uses")
                    })
        
        return {
            "resource_id": resource_id,
            "consumer_count": len(consumers),
            "consumers": consumers
        }


# ============================================================================
# AGENT MCP PROXY
# ============================================================================

@dataclass
class AgentResult:
    """Result from an agent execution."""
    agent_id: str
    task: str
    success: bool
    result: str
    tool_calls: int
    execution_time_ms: int
    error: Optional[str] = None


class AgentMCPProxy:
    """
    Proxy that enables API-spawned agents to use MCP tools.
    
    Agent requests tool → Proxy intercepts → Executes locally → Returns result
    """
    
    def __init__(self, config: Optional[ProxyConfig] = None):
        self.config = config or ProxyConfig()
        self.tool_executor = MCPToolExecutor(self.config)
        self.schema_converter = ToolSchemaConverter()
        
        if HAS_ANTHROPIC:
            self.client = anthropic.Anthropic()
        else:
            self.client = None
        
        self._agent_counter = 0
        self._lock = threading.Lock()
    
    def _get_agent_id(self) -> str:
        """Generate unique agent ID."""
        with self._lock:
            self._agent_counter += 1
            return f"AGENT-{datetime.now().strftime('%H%M%S')}-{self._agent_counter:03d}"
    
    def spawn_agent(
        self,
        task: str,
        tools: Optional[List[str]] = None,
        system_prompt: Optional[str] = None,
        max_tool_calls: Optional[int] = None
    ) -> AgentResult:
        """
        Spawn an agent with MCP tool access.
        
        Args:
            task: Task for the agent to perform
            tools: List of tool names to enable (None = all tools)
            system_prompt: Custom system prompt (uses default if None)
            max_tool_calls: Max tool calls allowed (uses config default if None)
        
        Returns:
            AgentResult with execution details
        """
        if not self.client:
            return AgentResult(
                agent_id="ERROR",
                task=task,
                success=False,
                result="",
                tool_calls=0,
                execution_time_ms=0,
                error="Anthropic client not available"
            )
        
        agent_id = self._get_agent_id()
        start_time = datetime.now()
        
        # Get tools
        if tools:
            api_tools = self.schema_converter.get_tools_for_agent(tools)
        else:
            api_tools = self.schema_converter.get_all_tools()
        
        # Default system prompt
        if not system_prompt:
            system_prompt = """You are a PRISM Manufacturing Intelligence assistant with access to MCP tools.

Use the tools to query materials, machines, compute physics, and validate parameters.
Be precise and thorough. For calculations, show your work.
If a tool returns an error, explain what went wrong."""
        
        messages = [{"role": "user", "content": task}]
        tool_call_count = 0
        max_calls = max_tool_calls or self.config.max_tool_calls
        
        try:
            while tool_call_count < max_calls:
                response = self.client.messages.create(
                    model=self.config.model,
                    max_tokens=self.config.max_tokens,
                    temperature=self.config.temperature,
                    system=system_prompt,
                    tools=api_tools,
                    messages=messages
                )
                
                # Check if we need to handle tool use
                if response.stop_reason == "tool_use":
                    # Process tool calls
                    tool_results = []
                    for block in response.content:
                        if block.type == "tool_use":
                            tool_call_count += 1
                            tool_result = self.tool_executor.execute(
                                block.name,
                                block.input
                            )
                            tool_results.append({
                                "type": "tool_result",
                                "tool_use_id": block.id,
                                "content": json.dumps(tool_result)
                            })
                    
                    # Add assistant message and tool results
                    messages.append({"role": "assistant", "content": response.content})
                    messages.append({"role": "user", "content": tool_results})
                else:
                    # Final response
                    result_text = ""
                    for block in response.content:
                        if hasattr(block, "text"):
                            result_text += block.text
                    
                    elapsed = (datetime.now() - start_time).total_seconds() * 1000
                    
                    return AgentResult(
                        agent_id=agent_id,
                        task=task,
                        success=True,
                        result=result_text,
                        tool_calls=tool_call_count,
                        execution_time_ms=int(elapsed)
                    )
            
            # Max tool calls reached
            elapsed = (datetime.now() - start_time).total_seconds() * 1000
            return AgentResult(
                agent_id=agent_id,
                task=task,
                success=False,
                result="",
                tool_calls=tool_call_count,
                execution_time_ms=int(elapsed),
                error=f"Max tool calls ({max_calls}) reached"
            )
            
        except Exception as e:
            elapsed = (datetime.now() - start_time).total_seconds() * 1000
            return AgentResult(
                agent_id=agent_id,
                task=task,
                success=False,
                result="",
                tool_calls=tool_call_count,
                execution_time_ms=int(elapsed),
                error=str(e)
            )
    
    def spawn_parallel(
        self,
        tasks: List[Tuple[str, Optional[List[str]]]],
        max_concurrent: Optional[int] = None
    ) -> List[AgentResult]:
        """
        Spawn multiple agents in parallel.
        
        Args:
            tasks: List of (task, tools) tuples
            max_concurrent: Max concurrent agents (uses config default if None)
        
        Returns:
            List of AgentResults in same order as tasks
        """
        max_workers = max_concurrent or self.config.parallel_limit
        results = [None] * len(tasks)
        
        def run_agent(index: int, task: str, tools: Optional[List[str]]) -> Tuple[int, AgentResult]:
            result = self.spawn_agent(task, tools)
            return (index, result)
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = []
            for i, (task, tools) in enumerate(tasks):
                future = executor.submit(run_agent, i, task, tools)
                futures.append(future)
            
            for future in as_completed(futures):
                index, result = future.result()
                results[index] = result
        
        return results


# ============================================================================
# CLI INTERFACE
# ============================================================================

def main():
    """CLI interface for Agent MCP Proxy."""
    import argparse
    
    parser = argparse.ArgumentParser(description="PRISM Agent MCP Proxy")
    parser.add_argument("--task", "-t", help="Task for agent to perform")
    parser.add_argument("--tools", "-T", nargs="+", help="Specific tools to enable")
    parser.add_argument("--parallel", "-p", nargs="+", help="Multiple tasks to run in parallel")
    parser.add_argument("--list-tools", action="store_true", help="List available tools")
    parser.add_argument("--test", action="store_true", help="Run test execution")
    
    args = parser.parse_args()
    
    if args.list_tools:
        print("\n" + "="*60)
        print("AVAILABLE MCP TOOLS")
        print("="*60)
        for name, schema in MCP_TOOL_SCHEMAS.items():
            print(f"\n{name}:")
            print(f"  {schema['description']}")
        print()
        return
    
    if args.test:
        print("\n" + "="*60)
        print("TESTING MCP TOOL EXECUTOR")
        print("="*60)
        
        config = ProxyConfig()
        executor = MCPToolExecutor(config)
        
        # Test Kienzle calculation
        print("\nTest: compute_kienzle")
        result = executor.execute("compute_kienzle", {
            "kc1_1": 1800,
            "mc": 0.25,
            "h": 0.2,
            "b": 3.0
        })
        print(f"  Result: {json.dumps(result, indent=2)}")
        
        # Test Taylor calculation
        print("\nTest: compute_taylor")
        result = executor.execute("compute_taylor", {
            "n": 0.25,
            "C": 200,
            "cutting_speed": 150
        })
        print(f"  Result: {json.dumps(result, indent=2)}")
        
        # Test validation
        print("\nTest: validate_kienzle")
        result = executor.execute("validate_kienzle", {
            "kc1_1": 1800,
            "mc": 0.25,
            "material_category": "P"
        })
        print(f"  Result: {json.dumps(result, indent=2)}")
        
        print("\n✓ All tests completed")
        return
    
    proxy = AgentMCPProxy()
    
    if args.parallel:
        print(f"\nSpawning {len(args.parallel)} agents in parallel...")
        tasks = [(task, args.tools) for task in args.parallel]
        results = proxy.spawn_parallel(tasks)
        
        print("\n" + "="*60)
        print("PARALLEL EXECUTION RESULTS")
        print("="*60)
        for result in results:
            print(f"\nAgent: {result.agent_id}")
            print(f"Task: {result.task}")
            print(f"Success: {result.success}")
            print(f"Tool Calls: {result.tool_calls}")
            print(f"Time: {result.execution_time_ms}ms")
            if result.error:
                print(f"Error: {result.error}")
            else:
                print(f"Result: {result.result[:500]}...")
        return
    
    if args.task:
        print(f"\nSpawning agent for task: {args.task}")
        result = proxy.spawn_agent(args.task, args.tools)
        
        print("\n" + "="*60)
        print("AGENT RESULT")
        print("="*60)
        print(f"Agent ID: {result.agent_id}")
        print(f"Success: {result.success}")
        print(f"Tool Calls: {result.tool_calls}")
        print(f"Time: {result.execution_time_ms}ms")
        if result.error:
            print(f"Error: {result.error}")
        else:
            print(f"\nResult:\n{result.result}")
        return
    
    parser.print_help()


if __name__ == "__main__":
    main()
