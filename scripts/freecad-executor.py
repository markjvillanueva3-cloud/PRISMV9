#!/usr/bin/env python3
"""
FreeCAD Script Executor for PRISM CAD-COMPLETE-MS0.
Executes generated FreeCAD Python scripts headlessly and reports geometry metrics.

Usage:
  python freecad-executor.py --script "code string"
  python freecad-executor.py --file script.py
  python freecad-executor.py --file script.py --output result.step
  python freecad-executor.py --file script.py --output result.stl --format stl

Output: JSON to stdout with geometry metrics.

Requirements:
  - FreeCAD installed and accessible via FREECAD_PATH env var or standard locations
  - Windows: resources/Freecad/bin or C:/Program Files/FreeCAD*/bin
  - Linux: /usr/lib/freecad/lib or /usr/share/freecad/lib
"""
import sys
import json
import argparse
import time
import traceback
import os

# FreeCAD path discovery
FREECAD_PATHS = [
    os.environ.get("FREECAD_PATH", ""),
    "H:/prism/resources/Freecad/bin",
    "C:/Program Files/FreeCAD 0.21/bin",
    "C:/Program Files/FreeCAD 1.0/bin",
    "/usr/lib/freecad/lib",
    "/usr/share/freecad/lib",
    "/Applications/FreeCAD.app/Contents/Resources/lib",
]

# Add FreeCAD paths to sys.path
for path in FREECAD_PATHS:
    if path and os.path.isdir(path) and path not in sys.path:
        sys.path.insert(0, path)

# Try to import FreeCAD
try:
    import FreeCAD
    import Part
    HAS_FREECAD = True
except ImportError:
    HAS_FREECAD = False
    FreeCAD = None
    Part = None


def find_result(namespace):
    """
    Find the FreeCAD Part shape object in the execution namespace.
    Looks for common variable names, then falls back to finding
    the last Shape object or document's first object.
    """
    # Check common names first
    for name in ("result", "part", "model", "body", "solid", "shape"):
        obj = namespace.get(name)
        if obj is not None:
            # If it's a Shape directly
            if hasattr(obj, "Volume") and hasattr(obj, "BoundBox"):
                return obj
            # If it's a Document object with a Shape
            if hasattr(obj, "Shape"):
                return obj.Shape

    # Check for doc variable with objects
    doc = namespace.get("doc") or namespace.get("document")
    if doc and hasattr(doc, "Objects") and len(doc.Objects) > 0:
        for obj in reversed(doc.Objects):
            if hasattr(obj, "Shape"):
                return obj.Shape

    # Fall back: find any Part.Shape in namespace
    for key in reversed(list(namespace.keys())):
        obj = namespace[key]
        if hasattr(obj, "Volume") and hasattr(obj, "BoundBox"):
            return obj
        if hasattr(obj, "Shape"):
            return obj.Shape

    # Last resort: check active document
    if FreeCAD and FreeCAD.ActiveDocument:
        for obj in reversed(FreeCAD.ActiveDocument.Objects):
            if hasattr(obj, "Shape"):
                return obj.Shape

    return None


def extract_metrics(shape, elapsed_ms):
    """Extract geometry metrics from a FreeCAD Part.Shape."""
    bb = shape.BoundBox

    metrics = {
        "success": True,
        "volume_mm3": round(shape.Volume, 4),
        "bounding_box": [
            round(bb.XLength, 4),
            round(bb.YLength, 4),
            round(bb.ZLength, 4),
        ],
        "center": [
            round(bb.Center.x, 4),
            round(bb.Center.y, 4),
            round(bb.Center.z, 4),
        ],
        "face_count": len(shape.Faces),
        "edge_count": len(shape.Edges),
        "vertex_count": len(shape.Vertexes),
        "is_valid": shape.isValid(),
        "is_closed": shape.isClosed() if hasattr(shape, "isClosed") else True,
        "execution_time_ms": round(elapsed_ms, 2),
    }
    return metrics


def export_result(shape, output_path, fmt="step"):
    """Export the FreeCAD shape to STEP, STL, or BREP file."""
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)

    if fmt == "both":
        base, _ = os.path.splitext(output_path)
        step_path = base + ".step"
        stl_path = base + ".stl"
        shape.exportStep(step_path)
        shape.exportStl(stl_path)
        return [step_path, stl_path]
    elif fmt == "stl" or output_path.lower().endswith(".stl"):
        shape.exportStl(output_path)
        return [output_path]
    elif fmt == "brep" or output_path.lower().endswith(".brep"):
        shape.exportBrep(output_path)
        return [output_path]
    else:
        # Default to STEP
        shape.exportStep(output_path)
        return [output_path]


def execute_script(code, output_path=None, fmt="step"):
    """Execute FreeCAD Python code and return metrics as a dict."""
    if not HAS_FREECAD:
        return {
            "success": False,
            "error": "FreeCAD is not installed or not found in path. "
                     "Set FREECAD_PATH environment variable or install FreeCAD.",
            "searched_paths": [p for p in FREECAD_PATHS if p],
            "execution_time_ms": 0,
        }

    start = time.perf_counter()

    try:
        # Create a new document for each execution
        doc = FreeCAD.newDocument("PRISMExecutor")

        # Build sandboxed namespace with FreeCAD modules available
        namespace = {
            "FreeCAD": FreeCAD,
            "Part": Part,
            "App": FreeCAD,
            "doc": doc,
            "document": doc,
            "math": __import__("math"),
            "os": __import__("os"),
        }

        # Try to import additional common modules
        try:
            import PartDesign
            namespace["PartDesign"] = PartDesign
        except ImportError:
            pass

        try:
            import Sketcher
            namespace["Sketcher"] = Sketcher
        except ImportError:
            pass

        try:
            import Draft
            namespace["Draft"] = Draft
        except ImportError:
            pass

        exec(code, namespace)

        elapsed_ms = (time.perf_counter() - start) * 1000.0

        # Find the result shape
        shape = find_result(namespace)
        if shape is None:
            return {
                "success": False,
                "error": "No FreeCAD shape found. "
                         "Assign to 'result', 'part', 'shape', or add objects to doc.",
                "execution_time_ms": round(elapsed_ms, 2),
            }

        # Extract geometry metrics
        metrics = extract_metrics(shape, elapsed_ms)

        # Export if output path specified
        if output_path:
            exported = export_result(shape, output_path, fmt)
            metrics["output_files"] = exported
            metrics["output_file"] = exported[0]

        # Clean up document
        FreeCAD.closeDocument(doc.Name)

        return metrics

    except Exception as e:
        elapsed_ms = (time.perf_counter() - start) * 1000.0

        # Try to clean up document on error
        try:
            if FreeCAD and FreeCAD.ActiveDocument:
                FreeCAD.closeDocument(FreeCAD.ActiveDocument.Name)
        except:
            pass

        return {
            "success": False,
            "error": f"{type(e).__name__}: {str(e)}",
            "traceback": traceback.format_exc(),
            "execution_time_ms": round(elapsed_ms, 2),
        }


def main():
    parser = argparse.ArgumentParser(
        description="Execute FreeCAD scripts and report geometry metrics"
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--script", type=str,
        help="FreeCAD Python code as a string"
    )
    group.add_argument(
        "--file", type=str,
        help="Path to a FreeCAD Python script file"
    )
    parser.add_argument(
        "--output", type=str, default=None,
        help="Output file path (STEP, STL, or BREP)"
    )
    parser.add_argument(
        "--format", type=str, default="step",
        choices=["step", "stl", "brep", "both"],
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
