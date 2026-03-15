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
        post_process: bool = False,
        optimize_sf: bool = False,
    ) -> Dict[str, Any]:
        """Generate complete G-code program from features."""
        return self.call_action("cam_unified_generate", {
            "features": features,
            "material": material,
            "machine_name": machine_name,
            "production_mode": production_mode,
            "post_process": post_process,
            "optimize_sf": optimize_sf,
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
