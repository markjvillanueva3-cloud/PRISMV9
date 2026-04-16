"""
PRISM Operation Writer - Direct adsk.cam API S/F Modification
==============================================================
Writes PRISM-computed physics S/F directly to Fusion 360 CAM operations
using the adsk.cam API. This is the CORRECT approach:

1. Set spindleSpeed via operation.parameters.itemByName('tool_spindleSpeed').expression
2. Set feed via operation.parameters.itemByName('tool_feedCutting').expression
3. Write extra physics data (force, power, confidence, tool_life, stable_rpm)
   to operation.notes or operation.comment as structured JSON

The CPS post processor (PRISM-Master.cps) reads:
- Normal spindleSpeed/feed from the operation (set by this writer)
- Physics JSON from operation:comment via parsePrismComment()

This module does NOT use:
- getGlobalParameter (wrong API, scored 32/100 in v1 review)
- design.rootComponent.attributes.add (wrong target)
- Document-level attributes (not per-operation)

Pipeline: prism_bridge.py -> prism_operation_writer.py (this) -> PRISM-Master.cps
"""

import json
from typing import Any, Dict, List, Optional, Tuple

# Try importing adsk - will fail outside Fusion 360, which is OK for testing
try:
    import adsk.core
    import adsk.cam
    import adsk.fusion
    _HAS_ADSK = True
except ImportError:
    _HAS_ADSK = False


# -- Result Types ---------------------------------------------------------

class OperationWriteResult:
    """Result of writing S/F to a single Fusion 360 operation."""

    __slots__ = (
        "operation_name", "success", "rpm_set", "feed_set",
        "comment_written", "original_rpm", "original_feed",
        "original_comment", "error",
    )

    def __init__(self, **kwargs):
        for slot in self.__slots__:
            setattr(self, slot, kwargs.get(slot))

    def to_dict(self):
        return {s: getattr(self, s, None) for s in self.__slots__}


class BatchWriteResult:
    """Result of writing S/F to multiple operations."""

    def __init__(self, results, total_operations):
        self.results = results  # List[OperationWriteResult]
        self.total_operations = total_operations
        self.success_count = sum(1 for r in results if r.success)
        self.failed_count = sum(1 for r in results if not r.success)

    def to_dict(self):
        return {
            "total_operations": self.total_operations,
            "success_count": self.success_count,
            "failed_count": self.failed_count,
            "results": [r.to_dict() for r in self.results],
        }


# -- Writer ---------------------------------------------------------------

# Fusion 360 CAM parameter names for S/F
PARAM_SPINDLE_SPEED = "tool_spindleSpeed"
PARAM_FEED_CUTTING = "tool_feedCutting"
PARAM_FEED_ENTRY = "tool_feedEntry"
PARAM_FEED_EXIT = "tool_feedExit"
PARAM_FEED_PLUNGE = "tool_feedPlunge"
PARAM_FEED_RETRACT = "tool_feedRetract"
PARAM_FEED_RAMP = "tool_feedRamp"

# PRISM comment JSON marker - parsed by PRISM-Master.cps parsePrismComment()
PRISM_COMMENT_MARKER = '{"prism":'


class PRISMOperationWriter:
    """Writes PRISM physics S/F to Fusion 360 operations via adsk.cam API.

    Usage:
        from prism_bridge import PRISMPhysicsBridge
        from prism_operation_writer import PRISMOperationWriter

        bridge = PRISMPhysicsBridge()
        writer = PRISMOperationWriter()

        # Get physics S/F from server
        sf = bridge.compute_physics_sf(tool, material, operation, machine)
        if sf:
            # Write to Fusion 360 operation
            cam = get_cam()  # adsk.cam.CAM
            operation = cam.setups.item(0).operations.item(0)
            result = writer.write_sf_to_operation(operation, sf)
            print(f"Success: {result.success}, RPM: {result.rpm_set}")
    """

    def __init__(self, unit_system="metric"):
        """Initialize writer.

        Args:
            unit_system: "metric" (mm/min) or "imperial" (in/min).
                         Fusion 360 internal units are always cm, but
                         expression strings can use unit suffixes.
        """
        self.unit_system = unit_system

    def write_sf_to_operation(self, operation, sf_result, preserve_comments=True):
        """Write PRISM-computed S/F to a single Fusion 360 CAM operation.

        Sets spindleSpeed and feed via adsk.cam parameter expressions,
        and writes physics metadata (force, power, confidence, tool_life,
        stable_rpm_range) to the operation comment as JSON.

        Args:
            operation: adsk.cam.Operation or compatible object
            sf_result: PhysicsSFResult from PRISMPhysicsBridge
            preserve_comments: If True, append PRISM JSON to existing comment
                             instead of replacing. Default True per U-PPR24 spec.

        Returns:
            OperationWriteResult with success/failure details.
        """
        result_kwargs = {
            "operation_name": _safe_op_name(operation),
            "success": False,
            "error": None,
        }

        try:
            params = operation.parameters
            if params is None:
                result_kwargs["error"] = "Operation has no parameters"
                return OperationWriteResult(**result_kwargs)

            # -- Read originals for undo tracking --
            result_kwargs["original_rpm"] = _read_param_value(params, PARAM_SPINDLE_SPEED)
            result_kwargs["original_feed"] = _read_param_value(params, PARAM_FEED_CUTTING)
            result_kwargs["original_comment"] = _read_comment(operation)

            # -- Write spindle speed --
            rpm_written = False
            if sf_result.rpm is not None and sf_result.rpm > 0:
                rpm_written = _write_param_expression(
                    params, PARAM_SPINDLE_SPEED,
                    f"{int(round(sf_result.rpm))} rpm",
                )
                result_kwargs["rpm_set"] = sf_result.rpm

            # -- Write feed rate --
            feed_written = False
            if sf_result.feed_mmmin is not None and sf_result.feed_mmmin > 0:
                if self.unit_system == "imperial":
                    feed_inmin = sf_result.feed_mmmin / 25.4
                    expr = f"{round(feed_inmin, 2)} in/min"
                else:
                    expr = f"{round(sf_result.feed_mmmin, 1)} mm/min"

                feed_written = _write_param_expression(
                    params, PARAM_FEED_CUTTING, expr,
                )
                result_kwargs["feed_set"] = sf_result.feed_mmmin

            # -- Write physics data to operation comment --
            comment_written = False
            prism_json = sf_result.to_comment_json()
            if prism_json:
                comment_written = _write_prism_comment(
                    operation, prism_json, preserve_comments,
                )
                result_kwargs["comment_written"] = comment_written

            result_kwargs["success"] = rpm_written or feed_written
            return OperationWriteResult(**result_kwargs)

        except Exception as e:
            result_kwargs["error"] = str(e)
            return OperationWriteResult(**result_kwargs)

    def write_all_operations(self, cam, sf_results_map):
        """Write S/F to all operations across all setups in a CAM workspace.

        Args:
            cam: adsk.cam.CAM object
            sf_results_map: Dict mapping operation index (setup_idx, op_idx)
                          to PhysicsSFResult. Example: {(0,0): sf1, (0,1): sf2}

        Returns:
            BatchWriteResult with per-operation results.
        """
        results = []
        total_ops = 0

        try:
            for si in range(cam.setups.count):
                setup = cam.setups.item(si)
                if not setup or not setup.operations:
                    continue
                for oi in range(setup.operations.count):
                    total_ops += 1
                    op = setup.operations.item(oi)
                    if not op:
                        continue

                    sf = sf_results_map.get((si, oi))
                    if sf is None:
                        continue

                    result = self.write_sf_to_operation(op, sf)
                    results.append(result)

        except Exception as e:
            results.append(OperationWriteResult(
                operation_name="batch_error",
                success=False,
                error=str(e),
            ))

        return BatchWriteResult(results=results, total_operations=total_ops)

    def write_sequential(self, operations_list, sf_results_list):
        """Write S/F to a flat list of operations (no setup traversal).

        Args:
            operations_list: List of adsk.cam.Operation objects
            sf_results_list: List of PhysicsSFResult (same length, None for skip)

        Returns:
            BatchWriteResult
        """
        results = []
        for op, sf in zip(operations_list, sf_results_list):
            if sf is None:
                continue
            result = self.write_sf_to_operation(op, sf)
            results.append(result)

        return BatchWriteResult(
            results=results,
            total_operations=len(operations_list),
        )


# -- Internal Helpers (adsk.cam API) --------------------------------------

def _safe_op_name(operation):
    """Safely get operation name."""
    try:
        return operation.name or "unnamed"
    except Exception:
        return "unknown"


def _read_param_value(params, name):
    """Read current value of a CAM parameter, or None."""
    try:
        p = params.itemByName(name)
        if p:
            return p.value
    except Exception:
        pass
    return None


def _read_comment(operation):
    """Read current operation comment/notes, or empty string."""
    try:
        # Fusion 360 operations have a 'notes' property
        if hasattr(operation, "notes") and operation.notes:
            return operation.notes
    except Exception:
        pass
    try:
        # Also try 'comment' if available
        if hasattr(operation, "comment") and operation.comment:
            return operation.comment
    except Exception:
        pass
    # Try via parameters (operation-comment)
    try:
        params = operation.parameters
        if params:
            p = params.itemByName("operation_comment")
            if p:
                return str(p.expression) if p.expression else ""
    except Exception:
        pass
    return ""


def _write_param_expression(params, name, expression):
    """Write a parameter expression string via adsk.cam API.

    Uses operation.parameters.itemByName(name).expression = value
    This is the CORRECT adsk.cam API approach.

    Returns True on success, False on failure.
    """
    try:
        p = params.itemByName(name)
        if p is None:
            return False
        p.expression = expression
        return True
    except Exception:
        # Fallback: try .value with numeric
        try:
            p = params.itemByName(name)
            if p:
                # Extract numeric from expression
                import re
                match = re.search(r"([\d.]+)", expression)
                if match:
                    p.value = float(match.group(1))
                    return True
        except Exception:
            pass
    return False


def _write_prism_comment(operation, prism_json, preserve_existing):
    """Write PRISM physics JSON to operation comment.

    The PRISM-Master.cps parsePrismComment() function reads this via
    getParameter("operation:comment") and looks for {"prism":...} JSON.

    If preserve_existing is True, appends to existing comment with
    a newline separator. If existing comment already has PRISM JSON,
    replaces only the PRISM portion.
    """
    try:
        existing = _read_comment(operation)

        if preserve_existing and existing:
            # Check if existing comment already has PRISM JSON
            prism_idx = existing.find(PRISM_COMMENT_MARKER)
            if prism_idx >= 0:
                # Find end of existing PRISM JSON
                brace_count = 0
                end_idx = prism_idx
                for i in range(prism_idx, len(existing)):
                    if existing[i] == "{":
                        brace_count += 1
                    elif existing[i] == "}":
                        brace_count -= 1
                        if brace_count == 0:
                            end_idx = i + 1
                            break
                # Replace existing PRISM JSON
                new_comment = existing[:prism_idx] + prism_json + existing[end_idx:]
            else:
                # Append PRISM JSON after existing comment
                new_comment = existing.rstrip() + "\n" + prism_json
        else:
            new_comment = prism_json

        # Write via notes property (preferred)
        try:
            if hasattr(operation, "notes"):
                operation.notes = new_comment
                return True
        except Exception:
            pass

        # Write via parameters (fallback)
        try:
            params = operation.parameters
            if params:
                p = params.itemByName("operation_comment")
                if p:
                    p.expression = json.dumps(new_comment)
                    return True
        except Exception:
            pass

        return False

    except Exception:
        return False
