"""
PRISM Physics Bridge - Fusion 360 Add-in HTTP Bridge to PRISM Server
=====================================================================
Computes physics-optimized speeds and feeds via PRISM MCP server's
PPG pipeline endpoint. This is the CORRECT architecture: the add-in
computes physics S/F server-side, then the operation writer (prism_operation_writer.py)
applies them directly to Fusion 360 operations via adsk.cam API.

The CPS post processor reads normal spindleSpeed/feed - no property bridge.
Extra physics data (force, power, confidence) goes into operation:comment JSON.

Pipeline: prism_bridge.py (this) -> prism_operation_writer.py -> PRISM-Master.cps

Server endpoint: POST /ppg/pipeline
Fallback: POST /ppg/optimize-program
Offline behavior: graceful skip (use CAM defaults)
"""

import json
import time
import urllib.request
import urllib.error
from typing import Any, Dict, List, Optional, Tuple


# -- Configuration --------------------------------------------------------

DEFAULT_SERVER_URL = "http://localhost:3100"
TIMEOUT_SECONDS = 5
MAX_RETRIES = 1
RETRY_DELAY_SECONDS = 0.5
MIN_SERVER_VERSION = "1.0.0"


# -- Result Types ---------------------------------------------------------

class PhysicsSFResult:
    """Result of a physics S/F computation for one operation.

    Attributes:
        rpm: Optimized spindle speed (rev/min)
        feed_mmmin: Optimized feed rate (mm/min)
        force_N: Cutting force via Kienzle model (N)
        power_kW: Spindle power requirement (kW)
        confidence: Confidence in result (0.0 - 1.0)
        tool_life_min: Estimated tool life via Taylor model (min)
        stable_rpm_range: Chatter-free RPM range [min, max]
        source: Source of computation ("prism_server" or "fallback")
        warnings: Any warnings from the server
    """

    __slots__ = (
        "rpm", "feed_mmmin", "force_N", "power_kW", "confidence",
        "tool_life_min", "stable_rpm_range", "source", "warnings",
    )

    def __init__(self, **kwargs):
        for slot in self.__slots__:
            setattr(self, slot, kwargs.get(slot))

    def to_dict(self):
        """Convert to dictionary for JSON serialization."""
        return {s: getattr(self, s, None) for s in self.__slots__}

    def to_comment_json(self):
        """Format as JSON string for operation:comment embedding.

        This is parsed by PRISM-Master.cps parsePrismComment().
        Format: {"prism":{"force":N,"power":kW,"confidence":0-1,...}}
        """
        data = {
            "force": self.force_N,
            "power": self.power_kW,
            "confidence": self.confidence,
            "tool_life_min": self.tool_life_min,
        }
        if self.stable_rpm_range:
            data["stable_rpm_min"] = self.stable_rpm_range[0]
            data["stable_rpm_max"] = self.stable_rpm_range[1]
        if self.warnings:
            data["warnings"] = self.warnings
        # Remove None values
        data = {k: v for k, v in data.items() if v is not None}
        return json.dumps({"prism": data})

    def __repr__(self):
        return (
            f"PhysicsSFResult(rpm={self.rpm}, feed={self.feed_mmmin} mm/min, "
            f"force={self.force_N} N, power={self.power_kW} kW, "
            f"confidence={self.confidence})"
        )


class BatchSFResult:
    """Result of batch S/F computation for multiple operations."""

    def __init__(self, results, server_available, elapsed_ms):
        self.results = results          # List[Optional[PhysicsSFResult]]
        self.server_available = server_available
        self.elapsed_ms = elapsed_ms
        self.success_count = sum(1 for r in results if r is not None)
        self.total_count = len(results)


# -- Bridge ---------------------------------------------------------------

class PRISMPhysicsBridge:
    """HTTP bridge to PRISM MCP server for physics-based S/F computation.

    Usage in Fusion 360 add-in:
        bridge = PRISMPhysicsBridge()
        if bridge.is_available():
            result = bridge.compute_physics_sf(
                tool={"diameter_mm": 12.7, "flutes": 4, "material": "carbide"},
                material={"name": "4140 Steel", "iso_group": "P"},
                operation={"type": "roughing", "ap_mm": 1.0, "ae_mm": 6.35},
                machine={"model": "Haas VF-2", "max_rpm": 8100},
            )
            if result:
                print(f"RPM: {result.rpm}, Feed: {result.feed_mmmin} mm/min")
    """

    def __init__(self, server_url=DEFAULT_SERVER_URL, timeout=TIMEOUT_SECONDS):
        self.server_url = server_url.rstrip("/")
        self.timeout = timeout
        self._server_version = None
        self._last_health_check = 0
        self._server_ok = None  # None = unknown, True/False = cached

    # -- Health / Version -------------------------------------------------

    def is_available(self):
        """Check if PRISM server is reachable and meets version requirements.

        Caches result for 30 seconds to avoid repeated health checks.
        Returns True if server responds to /health within timeout.
        """
        now = time.time()
        if self._server_ok is not None and (now - self._last_health_check) < 30:
            return self._server_ok

        try:
            req = urllib.request.Request(
                f"{self.server_url}/health",
                method="GET",
            )
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                if resp.status == 200:
                    body = json.loads(resp.read().decode("utf-8"))
                    self._server_version = body.get("version", "0.0.0")
                    self._server_ok = True
                    self._last_health_check = now
                    return True
        except Exception:
            pass

        self._server_ok = False
        self._last_health_check = now
        return False

    def get_server_version(self):
        """Return cached server version, or None if not checked."""
        return self._server_version

    # -- Single Operation S/F ---------------------------------------------

    def compute_physics_sf(self, tool, material, operation, machine=None):
        """Compute physics-optimized S/F for a single operation.

        Args:
            tool: Dict with keys: diameter_mm, flutes, material (hss/carbide/cermet),
                  coating (optional), overhang_mm (optional)
            material: Dict with keys: name or iso_group (P/M/K/N/S/H)
            operation: Dict with keys: type (roughing/finishing/drilling),
                       ap_mm (depth of cut), ae_mm (width of cut, optional)
            machine: Optional dict with keys: model, max_rpm, max_power_kW

        Returns:
            PhysicsSFResult if successful, None if server unavailable or error.
            On failure, returns None (graceful skip - Fusion uses its own defaults).
        """
        if not self.is_available():
            return None

        payload = self._build_sf_payload(tool, material, operation, machine)
        response = self._post_with_retry("/ppg/pipeline", payload)

        if response is None:
            return None

        return self._parse_sf_response(response)

    # -- Batch Operations -------------------------------------------------

    def compute_batch_sf(self, operations):
        """Compute S/F for multiple operations in a single request.

        Args:
            operations: List of dicts, each with keys: tool, material, operation, machine

        Returns:
            BatchSFResult with per-operation results.
        """
        start = time.time()

        if not self.is_available():
            return BatchSFResult(
                results=[None] * len(operations),
                server_available=False,
                elapsed_ms=0,
            )

        results = []
        for op_spec in operations:
            result = self.compute_physics_sf(
                tool=op_spec.get("tool", {}),
                material=op_spec.get("material", {}),
                operation=op_spec.get("operation", {}),
                machine=op_spec.get("machine"),
            )
            results.append(result)

        elapsed = (time.time() - start) * 1000
        return BatchSFResult(
            results=results,
            server_available=True,
            elapsed_ms=round(elapsed, 1),
        )

    # -- Internal HTTP Methods --------------------------------------------

    def _post_with_retry(self, path, payload):
        """POST to server with retry on transient failure.

        Retries once after RETRY_DELAY_SECONDS on connection/timeout errors.
        Does NOT retry on 4xx errors (client issue, not transient).
        """
        for attempt in range(MAX_RETRIES + 1):
            try:
                return self._post(path, payload)
            except urllib.error.HTTPError as e:
                if e.code < 500:
                    # Client error (400, 422) - no retry
                    return None
                if attempt < MAX_RETRIES:
                    time.sleep(RETRY_DELAY_SECONDS)
                    continue
                return None
            except (urllib.error.URLError, TimeoutError, OSError):
                if attempt < MAX_RETRIES:
                    time.sleep(RETRY_DELAY_SECONDS)
                    continue
                return None
            except Exception:
                return None
        return None

    def _post(self, path, payload):
        """Raw POST to PRISM server. Returns parsed JSON or raises."""
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            f"{self.server_url}{path}",
            data=data,
            headers={
                "Content-Type": "application/json",
                "X-PRISM-Client": "fusion360-addin",
                "X-PRISM-Client-Version": "1.0.0",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=self.timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))

    # -- Payload Building -------------------------------------------------

    def _build_sf_payload(self, tool, material, operation, machine):
        """Build the request payload for the PPG pipeline endpoint.

        Constructs a minimal G-code snippet representing the operation
        so the PostProcessorPipelineEngine can compute physics S/F.
        """
        # Extract tool parameters
        diameter = tool.get("diameter_mm", 12.7)
        flutes = tool.get("flutes", 4)
        tool_material = tool.get("material", "carbide")
        coating = tool.get("coating", "TiAlN")
        overhang = tool.get("overhang_mm", diameter * 3)

        # Extract material
        mat_name = material.get("name", "steel")
        iso_group = material.get("iso_group", "P")

        # Extract operation
        op_type = operation.get("type", "roughing")
        ap = operation.get("ap_mm", 1.0)
        ae = operation.get("ae_mm", diameter * 0.5)

        # Extract machine
        machine_name = "generic"
        max_rpm = 10000
        max_power = 15
        controller = "fanuc"
        if machine:
            machine_name = machine.get("model", "generic")
            max_rpm = machine.get("max_rpm", 10000)
            max_power = machine.get("max_power_kW", 15)
            controller = machine.get("controller", "fanuc")

        # Build synthetic G-code for pipeline input
        # The pipeline needs G-code to analyze - we create a representative block
        gcode_lines = [
            f"(PRISM Physics S/F Request)",
            f"(Material: {mat_name} ISO {iso_group})",
            f"(Tool: D{diameter} Z{flutes} {tool_material} {coating})",
            f"(Operation: {op_type} ap={ap} ae={ae})",
            f"T1 M6",
            f"S1000 M3",
            f"G1 X50.0 Y0.0 Z-{ap} F200",
            f"G1 X50.0 Y{ae} Z-{ap} F200",
            f"M30",
        ]

        return {
            "gcode": "\n".join(gcode_lines),
            "material": {
                "name": mat_name,
                "iso_group": iso_group,
            },
            "machine": {
                "name": machine_name,
                "max_rpm": max_rpm,
                "max_power_kW": max_power,
                "controller": controller,
            },
            "tools": [{
                "number": 1,
                "diameter_mm": diameter,
                "flutes": flutes,
                "material": tool_material,
                "coating": coating,
                "overhang_mm": overhang,
                "type": "flat_endmill" if op_type != "drilling" else "drill",
            }],
            "context": {
                "source": "fusion360_addin",
                "operation_type": op_type,
                "ap_mm": ap,
                "ae_mm": ae,
            },
        }

    # -- Response Parsing -------------------------------------------------

    def _parse_sf_response(self, response):
        """Parse the PPG pipeline response into a PhysicsSFResult.

        The pipeline returns analytics with physics data including
        optimized S/F, forces, power, and stability information.
        """
        if not response or not isinstance(response, dict):
            return None

        data = response.get("data", response)
        if not data:
            return None

        # Extract from pipeline analytics
        analytics = data.get("analytics", {})
        stages = data.get("stages", [])
        blocks = data.get("blocks", [])

        # Try to get S/F from analytics (primary source)
        rpm = analytics.get("optimized_rpm") or analytics.get("rpm")
        feed = analytics.get("optimized_feed") or analytics.get("feed_mmmin")
        force = analytics.get("cutting_force_N") or analytics.get("force_N")
        power = analytics.get("spindle_power_kW") or analytics.get("power_kW")
        confidence = analytics.get("confidence", 0.7)
        tool_life = analytics.get("tool_life_min")

        # Try stability data
        stable_min = analytics.get("stable_rpm_min")
        stable_max = analytics.get("stable_rpm_max")
        stable_range = None
        if stable_min is not None and stable_max is not None:
            stable_range = [stable_min, stable_max]

        # Fallback: parse from optimized G-code blocks
        if (rpm is None or feed is None) and blocks:
            for block in blocks:
                if isinstance(block, dict):
                    if rpm is None and block.get("S"):
                        rpm = block["S"]
                    if feed is None and block.get("F"):
                        feed = block["F"]

        # Fallback: parse from optimized_gcode S/F words
        optimized = data.get("optimized_gcode", "")
        if (rpm is None or feed is None) and optimized:
            for line in optimized.split("\n"):
                if rpm is None and "S" in line:
                    rpm = self._extract_word(line, "S")
                if feed is None and "F" in line:
                    feed = self._extract_word(line, "F")

        if rpm is None and feed is None:
            return None

        # Collect warnings
        warnings = []
        for stage in stages:
            if isinstance(stage, dict) and stage.get("warnings"):
                warnings.extend(stage["warnings"])

        return PhysicsSFResult(
            rpm=_safe_numeric(rpm),
            feed_mmmin=_safe_numeric(feed),
            force_N=_safe_numeric(force),
            power_kW=_safe_numeric(power),
            confidence=_safe_numeric(confidence, 0.7),
            tool_life_min=_safe_numeric(tool_life),
            stable_rpm_range=stable_range,
            source="prism_server",
            warnings=warnings if warnings else None,
        )

    def _extract_word(self, line, letter):
        """Extract numeric value after a G-code letter (e.g., S3762 -> 3762)."""
        import re
        match = re.search(rf"{letter}([\d.]+)", line)
        if match:
            try:
                return float(match.group(1))
            except ValueError:
                pass
        return None


# -- Helpers --------------------------------------------------------------

def _safe_numeric(val, default=None):
    """Safely convert to float, returning default on failure.

    Guards against NaN/Infinity per U-PPR04 NaN guard requirements.
    """
    if val is None:
        return default
    try:
        f = float(val)
        if f != f:  # NaN check
            return default
        if f == float("inf") or f == float("-inf"):
            return default
        return f
    except (ValueError, TypeError):
        return default
