#!/usr/bin/env python3
"""
CadQuery Script Executor for PRISM Video Action Replay.
Executes generated CadQuery Python code and reports geometry metrics.

Usage:
  python cadquery-executor.py --script "code string"
  python cadquery-executor.py --file script.py
  python cadquery-executor.py --file script.py --output result.step
  python cadquery-executor.py --file script.py --output result.stl --format stl

Output: JSON to stdout with geometry metrics.
"""
import sys
import json
import argparse
import time
import traceback
import tempfile
import os
import math

# Add CadQuery import with error handling
try:
    import cadquery as cq
    from cadquery import exporters
    HAS_CADQUERY = True
except ImportError:
    HAS_CADQUERY = False


def find_result(namespace):
    """
    Find the CadQuery result object in the execution namespace.
    Looks for common variable names, then falls back to finding
    the last Workplane object.
    """
    # Check common names first
    for name in ("result", "part", "model", "body", "solid", "shape"):
        obj = namespace.get(name)
        if obj is not None and hasattr(obj, "val"):
            return obj

    # Fall back: find last Workplane object assigned
    for key in reversed(list(namespace.keys())):
        obj = namespace[key]
        if hasattr(obj, "val") and hasattr(obj, "faces"):
            return obj

    return None


def extract_metrics(result, elapsed_ms):
    """Extract geometry metrics from a CadQuery Workplane result."""
    val = result.val()
    bb = val.BoundingBox()

    metrics = {
        "success": True,
        "volume_mm3": round(val.Volume(), 4),
        "bounding_box": [
            round(bb.xlen, 4),
            round(bb.ylen, 4),
            round(bb.zlen, 4),
        ],
        "center": [
            round(bb.center.x, 4),
            round(bb.center.y, 4),
            round(bb.center.z, 4),
        ],
        "face_count": len(val.Faces()),
        "edge_count": len(val.Edges()),
        "vertex_count": len(val.Vertices()),
        "is_valid": val.isValid(),
        "execution_time_ms": round(elapsed_ms, 2),
    }
    return metrics


def export_result(result, output_path, fmt="step"):
    """Export the CadQuery result to STEP or STL file."""
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)

    if fmt == "both":
        base, _ = os.path.splitext(output_path)
        step_path = base + ".step"
        stl_path = base + ".stl"
        exporters.export(result, step_path)
        exporters.export(result, stl_path, "STL")
        return [step_path, stl_path]
    elif fmt == "stl" or output_path.lower().endswith(".stl"):
        exporters.export(result, output_path, "STL")
        return [output_path]
    else:
        exporters.export(result, output_path)
        return [output_path]


def execute_script(code, output_path=None, fmt="step"):
    """Execute CadQuery code and return metrics as a dict."""
    if not HAS_CADQUERY:
        return {
            "success": False,
            "error": "CadQuery is not installed. "
                     "Install with: pip install cadquery",
            "execution_time_ms": 0,
        }

    start = time.perf_counter()

    try:
        # Build sandboxed namespace with CadQuery and math available
        namespace = {
            "cq": cq,
            "cadquery": cq,
            "math": __import__("math"),
            "os": __import__("os"),
        }

        exec(code, namespace)

        elapsed_ms = (time.perf_counter() - start) * 1000.0

        # Find the result object
        result = find_result(namespace)
        if result is None:
            return {
                "success": False,
                "error": "No CadQuery result found. "
                         "Assign to 'result', 'part', or 'model'.",
                "execution_time_ms": round(elapsed_ms, 2),
            }

        # Extract geometry metrics
        metrics = extract_metrics(result, elapsed_ms)

        # Export if output path specified
        if output_path:
            exported = export_result(result, output_path, fmt)
            metrics["output_files"] = exported
            metrics["output_file"] = exported[0]

        return metrics

    except Exception as e:
        elapsed_ms = (time.perf_counter() - start) * 1000.0
        return {
            "success": False,
            "error": f"{type(e).__name__}: {str(e)}",
            "traceback": traceback.format_exc(),
            "execution_time_ms": round(elapsed_ms, 2),
        }


def main():
    parser = argparse.ArgumentParser(
        description="Execute CadQuery scripts and report geometry metrics"
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--script", type=str,
        help="CadQuery Python code as a string"
    )
    group.add_argument(
        "--file", type=str,
        help="Path to a CadQuery Python script file"
    )
    parser.add_argument(
        "--output", type=str, default=None,
        help="Output file path (STEP or STL)"
    )
    parser.add_argument(
        "--format", type=str, default="step",
        choices=["step", "stl", "both"],
        help="Export format (default: step)"
    )

    args = parser.parse_args()

    # Read the code
    if args.script:
        code = args.script
    else:
        if not os.path.isfile(args.file):
            result = {
                "success": False,
                "error": f"Script file not found: {args.file}",
                "execution_time_ms": 0,
            }
            print(json.dumps(result))
            sys.exit(1)
        with open(args.file, "r", encoding="utf-8") as f:
            code = f.read()

    # Execute and print JSON result
    result = execute_script(code, args.output, args.format)
    print(json.dumps(result))

    # Exit with appropriate code
    sys.exit(0 if result.get("success") else 1)


if __name__ == "__main__":
    main()
