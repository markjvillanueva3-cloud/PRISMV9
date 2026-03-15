"""
PRISM API Client — HTTP bridge to PRISM MCP server.
Calls CAM kernel actions for tool selection, program generation, etc.
"""

import json
import urllib.request
import urllib.error
from typing import Any, Dict, List, Optional


PRISM_BASE_URL = "http://localhost:18361"


class PRISMClient:
    """HTTP client for PRISM MCP server CAM kernel actions."""

    def __init__(self, base_url: str = PRISM_BASE_URL):
        self.base_url = base_url.rstrip("/")

    def is_connected(self) -> bool:
        """Check if PRISM server is reachable."""
        try:
            req = urllib.request.Request(
                f"{self.base_url}/health",
                method="GET",
            )
            with urllib.request.urlopen(req, timeout=3) as resp:
                return resp.status == 200
        except Exception:
            return False

    def call_action(self, action: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Call a PRISM dispatcher action via HTTP POST."""
        payload = json.dumps({
            "action": action,
            "params": params,
        }).encode("utf-8")

        req = urllib.request.Request(
            f"{self.base_url}/api/cam",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            return {"error": f"HTTP {e.code}: {e.reason}"}
        except urllib.error.URLError as e:
            return {"error": f"Connection failed: {e.reason}"}
        except Exception as e:
            return {"error": str(e)}

    # ── Convenience methods ──────────────────────────────────

    def smart_tool_select(
        self,
        operation_type: str,
        material_iso_group: str,
        feature_diameter_mm: Optional[float] = None,
        feature_depth_mm: Optional[float] = None,
        optimize_for: str = "balanced",
        max_results: int = 5,
    ) -> Dict[str, Any]:
        """Select optimal tool from 73K catalog with physics scoring."""
        params: Dict[str, Any] = {
            "operation_type": operation_type,
            "material_iso_group": material_iso_group,
            "optimize_for": optimize_for,
            "max_results": max_results,
        }
        if feature_diameter_mm is not None:
            params["feature_diameter_mm"] = feature_diameter_mm
        if feature_depth_mm is not None:
            params["feature_depth_mm"] = feature_depth_mm
        return self.call_action("cam_smart_tool", params)

    def generate_program(
        self,
        features: List[Dict],
        material: str,
        machine_name: str = "generic",
        production_mode: bool = True,
        post_process: bool = True,
        optimize_sf: bool = True,
    ) -> Dict[str, Any]:
        """Generate complete G-code program from features.

        With post_process=True and optimize_sf=True (defaults), this chains:
        1. SmartToolSelector → pick best tool from 73K catalog
        2. AdaptiveToolpathRouter → best algorithm from 34
        3. ProductionToolpath → polygon offset with chip thinning
        4. AutoSpeedFeedEngine → line-by-line variable S/F
        5. PostProcessorPipeline → 35-stage 7-phase optimization:
           P0: Parse + resolve (material/machine/tool from catalogs)
           P1: Physics (Kienzle S/F, stability lobes, deflection, coolant)
           P2: Per-block (engagement, chip thinning, corner decel, wear)
           P3: Motion (S-curve velocity, look-ahead, controller features)
           P4: Stochastic (Monte Carlo force CI, Taguchi robustness)
           P5: Safety (24 rules, playbook 296 rules, tribal tips)
           P6: Output (controller dialect, probe routines, setup sheet)
        """
        return self.call_action("cam_unified_generate", {
            "features": features,
            "material": material,
            "machine_name": machine_name,
            "production_mode": production_mode,
            "post_process": post_process,
            "optimize_sf": optimize_sf,
        })

    def generate_full_pipeline(
        self,
        gcode: str,
        material: str,
        machine_name: str,
        controller: str = "fanuc",
        tools: Optional[List[Dict]] = None,
        aggressiveness: float = 0.5,
    ) -> Dict[str, Any]:
        """Run existing G-code through the full 35-stage PP pipeline.

        Use this when Fusion/other CAM already generated the toolpath,
        and you want PRISM to optimize the S/F, inject controller
        features, validate safety, and produce setup documentation.

        This is the "Phase B re-optimizer" — takes ANY G-code from
        ANY source and makes it better using PRISM's physics engines.
        """
        return self.call_action("pp_run_full", {
            "gcode": gcode,
            "material": {"name": material},
            "machine": {"name": machine_name, "controller": controller},
            "tools": tools or [],
            "aggressiveness": aggressiveness,
            "stages": {
                "speed_feed": True,
                "stability_lobes": True,
                "engagement_analysis": True,
                "chip_thinning": True,
                "adaptive_feed": True,
                "corner_detection": True,
                "plunge_detection": True,
                "wear_progression": True,
                "thermal_tracking": True,
                "motion_dynamics": True,
                "controller_features": True,
                "safety_analysis": True,
                "playbook_rules": True,
                "tribal_knowledge": True,
                "energy_optimization": True,
                "gcode_generation": True,
                "cycle_time": True,
                "verification": True,
            },
        })

    def optimize_existing_gcode(
        self,
        gcode: str,
        material: str,
        controller: str = "fanuc",
        tools: Optional[List[Dict]] = None,
    ) -> Dict[str, Any]:
        """Quick S/F optimization of existing G-code.

        Lighter than generate_full_pipeline — just runs AutoSpeedFeed
        for line-by-line physics optimization without full PP stages.
        """
        return self.call_action("cam_unified_generate", {
            "features": [],
            "material": material,
            "machine_name": "generic",
            "optimize_sf": True,
            "existing_gcode": gcode,
        })

    def verify_toolpath(
        self,
        segments: List[Dict],
        tool: Dict,
        material_iso_group: str,
    ) -> Dict[str, Any]:
        """Verify toolpath with collision + physics + safety."""
        return self.call_action("cam_verify", {
            "toolpath_segments": segments,
            "tool": tool,
            "material_iso_group": material_iso_group,
        })

    def chatter_safe_rpm(
        self,
        tool_diameter_mm: float,
        tool_flute_count: int,
        tool_overhang_mm: float,
        material_iso_group: str,
        doc_mm: float,
        target_rpm: int,
        machine_max_rpm: int,
    ) -> Dict[str, Any]:
        """Get Monte Carlo chatter-safe RPM."""
        return self.call_action("cam_chatter_rpm", {
            "tool_diameter_mm": tool_diameter_mm,
            "tool_flute_count": tool_flute_count,
            "tool_overhang_mm": tool_overhang_mm,
            "material_iso_group": material_iso_group,
            "doc_mm": doc_mm,
            "target_rpm": target_rpm,
            "machine_max_rpm": machine_max_rpm,
        })

    def export_tool_library(
        self,
        material_iso_group: str = "P",
        max_tools: int = 50,
        tool_type: Optional[str] = None,
        manufacturer: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Export Fusion 360-compatible tool library JSON."""
        params: Dict[str, Any] = {
            "material_iso_group": material_iso_group,
            "max_tools": max_tools,
        }
        if tool_type:
            params["tool_type"] = tool_type
        if manufacturer:
            params["manufacturer"] = manufacturer
        return self.call_action("fusion_tool_export", params)

    def dfm_check(
        self,
        features: List[Dict],
        material_iso_group: str = "P",
    ) -> Dict[str, Any]:
        """Run DFM manufacturability check on features."""
        return self.call_action("cam_dfm_check", {
            "features": features,
            "material_iso_group": material_iso_group,
        })

    def cost_estimate(
        self,
        segments: List[Dict],
        config: Dict,
    ) -> Dict[str, Any]:
        """Get cost-per-feature breakdown."""
        return self.call_action("cam_cost_feature", {
            "segments": segments,
            "config": config,
        })
