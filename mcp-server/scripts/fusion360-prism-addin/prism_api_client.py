"""
PRISM API Client — HTTP bridge to PRISM MCP server.
Calls CAM kernel actions for tool selection, program generation, etc.
"""

import json
import urllib.request
import urllib.error
from typing import Any, Dict, List, Optional


PRISM_BASE_URL = "http://localhost:3100"


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
        return self.call_action("cam_fusion_tool_export", params)

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

    # ── Remaining 15% — Full PRISM system access ─────────────

    def multi_process(
        self,
        features: List[Dict],
        material: Dict,
        machine: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """Multi-process: turning + EDM + grinding + laser + waterjet."""
        return self.call_action("cam_multi_process", {
            "features": features,
            "material": material,
            "machine": machine,
        })

    def mill_turn(
        self,
        operations: List[Dict],
        config: Dict,
    ) -> Dict[str, Any]:
        """Mill-turn / Swiss program with live tools and sub-spindle."""
        return self.call_action("cam_mill_turn", {
            "operations": operations,
            "config": config,
        })

    def five_axis_convert(
        self,
        segments: List[Dict],
        config: Dict,
    ) -> Dict[str, Any]:
        """Convert 3-axis toolpath to 5-axis with lead/lean and RTCP."""
        return self.call_action("cam_5axis_convert", {
            "segments": segments,
            "config": config,
        })

    def advanced_strategy(
        self,
        strategy: str,
        **kwargs,
    ) -> Dict[str, Any]:
        """Run advanced strategy: flowline, geodesic, scallop, swarf, thread, chamfer."""
        return self.call_action("cam_advanced_strategy", {
            "strategy": strategy,
            **kwargs,
        })

    def complex_generate(
        self,
        features: List[Dict],
        material: str,
        machine_name: str,
        stock_dims: Dict,
        **kwargs,
    ) -> Dict[str, Any]:
        """Generate multi-setup G-code for 200+ feature complex parts."""
        return self.call_action("cam_complex_generate", {
            "features": features,
            "material": material,
            "machine_name": machine_name,
            "stock_dims": stock_dims,
            **kwargs,
        })

    def intelligent_sequence(
        self,
        operations: List[Dict],
    ) -> Dict[str, Any]:
        """33-rule production ordering for operation sequence."""
        return self.call_action("cam_intelligent_sequence", {
            "operations": operations,
        })

    def list_actions(self) -> Dict[str, Any]:
        """List all available PRISM CAM actions."""
        return self.call_action("cam_list_actions", {})

    # ── Underutilized systems now exposed ─────────────────────

    def browse_tools(
        self,
        tool_type: Optional[str] = None,
        diameter_range: Optional[List[float]] = None,
        manufacturer: Optional[str] = None,
        iso_group: Optional[str] = None,
        max_results: int = 20,
    ) -> Dict[str, Any]:
        """Browse the 73,827-tool catalog with filters.
        Hover tooltip: 'Search real manufacturer tools — OSG, Kennametal,
        Sandvik, etc. Each tool has full geometry, coatings, and
        physics-backed cutting parameters for 6 material groups.'
        """
        params: Dict[str, Any] = {"max_results": max_results}
        if tool_type: params["type"] = tool_type
        if diameter_range: params["diameter_range"] = diameter_range
        if manufacturer: params["manufacturer"] = manufacturer
        if iso_group: params["iso_group"] = iso_group
        return self.call_action("tool_catalog_search", params)

    def get_machine_specs(self, machine_name: str) -> Dict[str, Any]:
        """Get full machine specs: spindle curve, axis limits, controller.
        Hover tooltip: 'PRISM profiles 910 CNC machines from 48 manufacturers
        with spindle power curves, axis travel, rapid rates, and controller type.'
        """
        return self.call_action("machine_search", {"query": machine_name})

    def get_material_properties(self, material: str) -> Dict[str, Any]:
        """Get material physics: kc1.1, mc, thermal conductivity, constitutive model.
        Hover tooltip: 'PRISM has 2,957 materials with Kienzle coefficients,
        Johnson-Cook constitutive parameters, and thermal properties.
        Better material data = more accurate speeds and feeds.'
        """
        return self.call_action("material_search", {"query": material})

    def compare_programs(
        self, gcode_a: str, gcode_b: str,
    ) -> Dict[str, Any]:
        """Compare two G-code programs with physics analysis.
        Hover tooltip: 'See exactly what PRISM changed: cycle time difference,
        feed variation range, tool change count, and which is better.'
        """
        return self.call_action("cam_compare_programs", {
            "gcode_a": gcode_a, "gcode_b": gcode_b,
        })

    def generate_probe_program(
        self,
        probe_points: List[Dict],
        controller: str = "renishaw_fanuc",
        probe_tool_number: int = 50,
    ) -> Dict[str, Any]:
        """Generate probing G-code for WCS setup or in-process inspection.
        Hover tooltip: 'Auto-generates probe routines for Renishaw, Heidenhain,
        Blum, or Siemens probes. Includes WCS setup, first article inspection,
        and in-process dimensional checks with auto-compensation.'
        """
        return self.call_action("probe_generate", {
            "features": probe_points,
            "config": {
                "controller": controller,
                "probe_tool_number": probe_tool_number,
            },
        })

    def optimize_magazine(
        self,
        tool_sequence: List[Dict],
        magazine_type: str = "disc",
        magazine_slots: int = 24,
    ) -> Dict[str, Any]:
        """Optimize tool magazine layout for minimum change time.
        Hover tooltip: 'Arranges tools in the magazine to minimize
        tool change time using nearest-neighbor adjacency optimization.
        Saves 5-15% cycle time on multi-tool programs.'
        """
        return self.call_action("prism_machine_setup:tool_magazine_optimize", {
            "tools": tool_sequence,
            "magazine_type": magazine_type,
            "magazine_slots": magazine_slots,
        })

    def feasibility_check(
        self,
        stock: Dict,
        operations: List[Dict],
        material: str,
    ) -> Dict[str, Any]:
        """Full manufacturability feasibility analysis.
        Hover tooltip: 'Checks if your part can actually be machined:
        tool reach, holder clearance, clamping force, wall rigidity,
        dead-end detection, and setup transition feasibility.
        Returns FEASIBLE / MARGINAL / INFEASIBLE with specific issues.'
        """
        return self.call_action("cam_feasibility_check", {
            "stock": stock,
            "operations": operations,
            "material": material,
        })

    def generate_quote(
        self,
        features: List[Dict],
        material: str,
        quantity: int = 1,
        machine_rate_per_hour: float = 95.0,
    ) -> Dict[str, Any]:
        """Generate physics-backed manufacturing quote.
        Hover tooltip: 'Estimates cost per part using physics-based cycle time,
        actual tool costs from catalog, machine rates, and material waste.
        Includes setup time, secondary operations, and quantity price breaks.'
        """
        return self.call_action("quote_estimate", {
            "features": features,
            "material": material,
            "quantity": quantity,
            "machine_rate_per_hour": machine_rate_per_hour,
        })
