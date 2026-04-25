#!/usr/bin/env python3
"""freecad-executor.py — U-CADC06 (CAD-COMPLETE-MS0 PHASE-1).

Subprocess harness that runs a PRISM-generated FreeCAD Python script
inside FreeCADCmd, captures structured metrics (volume, bounding box,
face/edge/vertex counts) from the resulting PartDesign::Body, and emits
a single-line JSON result to stdout that the FreeCADCodeGeneratorEngine
node-side consumes.

Three execution modes:

  --script-path <FILE>       Run the given .py file inside FreeCADCmd
                             (or `python -i`-style if FreeCAD is on
                             PYTHONPATH). REQUIRED unless --mock.

  --output-fcstd <FILE>      Persist the document to .FCStd after run.
                             Optional; the script may already do this.

  --output-step  <FILE>      Export the active body to .STEP using
                             Part.export(); optional.

  --metrics-json <FILE>      Write the structured metrics JSON to FILE
                             (in addition to stdout). Optional.

  --mock                     Skip FreeCAD entirely; emit a deterministic
                             fixture identical in shape to the real
                             output. Lets CI exercise the engine ↔
                             executor JSON contract without FreeCAD
                             installed.

  --no-emit-stdout           Suppress the stdout JSON line (file-only).

Output schema (printed to stdout as one JSON object on a single line,
plus optional file write — same payload):

  {
    "ok":            bool,
    "error":         "string or null",
    "durationMs":    int,
    "metrics": {
      "volumeMm3":    number | null,
      "boundingBoxMm":[Lx, Ly, Lz] | null,
      "faceCount":    int  | null,
      "edgeCount":    int  | null,
      "vertexCount":  int  | null
    },
    "outputs": {
      "fcstd":  "absolute path or null",
      "step":   "absolute path or null"
    },
    "log":           "stdout+stderr (truncated to 65 536 bytes)"
  }

Exit codes:
   0  ok=true (script executed cleanly)
   1  ok=false (any failure path) — `error` field populated.
"""

from __future__ import annotations

import argparse
import io
import json
import os
import sys
import time
import traceback
from contextlib import redirect_stderr, redirect_stdout
from typing import Any, Optional


# ── Argument parsing ────────────────────────────────────────────────────────


def parse_args(argv: Optional[list[str]] = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="PRISM FreeCAD execution harness (U-CADC06)",
    )
    p.add_argument("--script-path", type=str, default=None)
    p.add_argument("--output-fcstd", type=str, default=None)
    p.add_argument("--output-step", type=str, default=None)
    p.add_argument("--metrics-json", type=str, default=None)
    p.add_argument("--mock", action="store_true")
    p.add_argument("--no-emit-stdout", action="store_true")
    return p.parse_args(argv)


# ── Mock-mode payload (CI contract) ─────────────────────────────────────────


def mock_payload(duration_ms: int) -> dict[str, Any]:
    """Deterministic fixture matching the real output shape exactly.

    The numbers are intentionally non-zero and pass downstream
    plausibility checks (volume > 0, bbox extent > 0, face count == 6
    for a primitive cube). The CADExecutionResult assertions in the
    Node engine compare this shape so a future drift in either side
    surfaces immediately.
    """
    return {
        "ok": True,
        "error": None,
        "durationMs": duration_ms,
        "metrics": {
            "volumeMm3": 1000.0,
            "boundingBoxMm": [10.0, 10.0, 10.0],
            "faceCount": 6,
            "edgeCount": 12,
            "vertexCount": 8,
        },
        "outputs": {"fcstd": None, "step": None},
        "log": "mock-mode executor (PRISM_CAD_MOCK / --mock)",
    }


# ── Real-mode helpers (require FreeCAD) ─────────────────────────────────────


def _try_import_freecad() -> tuple[Any, Any, Optional[str]]:
    """Import FreeCAD + Part. Returns (FreeCAD, Part, error?). Pure
    in-process — caller has already arranged PYTHONPATH or is running
    inside FreeCADCmd."""
    try:
        import FreeCAD  # type: ignore
        import Part  # type: ignore
        return FreeCAD, Part, None
    except Exception as e:  # noqa: BLE001 — surface ANY import failure
        return None, None, f"import FreeCAD failed: {e}"


def _find_active_body(FreeCAD: Any) -> Optional[Any]:
    """Find the first PartDesign::Body in the active document.
    Falls back to the first solid Shape if no Body exists."""
    doc = FreeCAD.ActiveDocument
    if doc is None:
        return None
    for obj in doc.Objects:
        # PartDesign::Body
        if hasattr(obj, "TypeId") and "PartDesign::Body" in str(obj.TypeId):
            return obj
    # Fallback: any object exposing .Shape with at least one solid.
    for obj in doc.Objects:
        shape = getattr(obj, "Shape", None)
        if shape is not None and getattr(shape, "Volume", 0.0) > 0:
            return obj
    return None


def _compute_metrics(body: Any) -> dict[str, Any]:
    """Extract canonical metrics from a body's Shape. Defensive against
    missing attributes — every field is independently nullable so a
    partial extraction still emits a usable payload."""
    shape = getattr(body, "Shape", None)
    if shape is None:
        return {
            "volumeMm3": None,
            "boundingBoxMm": None,
            "faceCount": None,
            "edgeCount": None,
            "vertexCount": None,
        }
    volume = float(getattr(shape, "Volume", 0.0) or 0.0)
    bbox = getattr(shape, "BoundBox", None)
    bb_dims = (
        [float(bbox.XLength), float(bbox.YLength), float(bbox.ZLength)]
        if bbox is not None
        else None
    )
    faces = getattr(shape, "Faces", None)
    edges = getattr(shape, "Edges", None)
    vertices = getattr(shape, "Vertexes", None)
    return {
        "volumeMm3": volume if volume > 0 else None,
        "boundingBoxMm": bb_dims,
        "faceCount": len(faces) if faces is not None else None,
        "edgeCount": len(edges) if edges is not None else None,
        "vertexCount": len(vertices) if vertices is not None else None,
    }


def _abs_or_none(p: Optional[str]) -> Optional[str]:
    return os.path.abspath(p) if p else None


def run_real(args: argparse.Namespace, started: float) -> dict[str, Any]:
    if not args.script_path:
        return _failure("--script-path is required in real mode", started)
    if not os.path.isfile(args.script_path):
        return _failure(f"script not found: {args.script_path}", started)

    FreeCAD, Part, import_err = _try_import_freecad()
    if FreeCAD is None or Part is None:
        return _failure(import_err or "FreeCAD import failed", started)

    log_buf_out = io.StringIO()
    log_buf_err = io.StringIO()
    metrics: dict[str, Any] = {
        "volumeMm3": None,
        "boundingBoxMm": None,
        "faceCount": None,
        "edgeCount": None,
        "vertexCount": None,
    }
    error: Optional[str] = None
    fcstd_out: Optional[str] = None
    step_out: Optional[str] = None

    try:
        with open(args.script_path, "rb") as fh:
            script_body = fh.read().decode("utf-8")
        # Capture all script output so it round-trips into the JSON log.
        with redirect_stdout(log_buf_out), redirect_stderr(log_buf_err):
            exec(  # noqa: S102 — running PRISM-controlled script inside FreeCAD
                compile(script_body, args.script_path, "exec"),
                {"__name__": "__main__", "FreeCAD": FreeCAD, "Part": Part},
            )

        body = _find_active_body(FreeCAD)
        if body is not None:
            metrics = _compute_metrics(body)

        if args.output_fcstd and FreeCAD.ActiveDocument is not None:
            FreeCAD.ActiveDocument.saveAs(args.output_fcstd)
            fcstd_out = _abs_or_none(args.output_fcstd)
        if args.output_step and body is not None:
            shape = getattr(body, "Shape", None)
            if shape is not None:
                Part.export([body], args.output_step)
                step_out = _abs_or_none(args.output_step)
    except Exception as e:  # noqa: BLE001 — catch ALL script failures
        error = f"{type(e).__name__}: {e}"
        log_buf_err.write("\n" + traceback.format_exc())

    log = (log_buf_out.getvalue() + log_buf_err.getvalue())[:65536]
    duration_ms = int((time.time() - started) * 1000)
    return {
        "ok": error is None,
        "error": error,
        "durationMs": duration_ms,
        "metrics": metrics,
        "outputs": {"fcstd": fcstd_out, "step": step_out},
        "log": log,
    }


def _failure(msg: str, started: float) -> dict[str, Any]:
    return {
        "ok": False,
        "error": msg,
        "durationMs": int((time.time() - started) * 1000),
        "metrics": {
            "volumeMm3": None,
            "boundingBoxMm": None,
            "faceCount": None,
            "edgeCount": None,
            "vertexCount": None,
        },
        "outputs": {"fcstd": None, "step": None},
        "log": msg,
    }


# ── Main ────────────────────────────────────────────────────────────────────


def main(argv: Optional[list[str]] = None) -> int:
    args = parse_args(argv)
    started = time.time()

    if args.mock or os.environ.get("PRISM_CAD_MOCK") == "1":
        # Mock mode: deterministic payload. Honor optional outputs by
        # pretending we wrote them so downstream mtime checks pass.
        payload = mock_payload(int((time.time() - started) * 1000))
        if args.output_fcstd:
            payload["outputs"]["fcstd"] = _abs_or_none(args.output_fcstd)
        if args.output_step:
            payload["outputs"]["step"] = _abs_or_none(args.output_step)
    else:
        payload = run_real(args, started)

    payload_json = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))

    if args.metrics_json:
        os.makedirs(os.path.dirname(os.path.abspath(args.metrics_json)) or ".", exist_ok=True)
        with open(args.metrics_json, "w", encoding="utf-8") as fh:
            fh.write(payload_json)
            fh.write("\n")

    if not args.no_emit_stdout:
        sys.stdout.write(payload_json)
        sys.stdout.write("\n")
        sys.stdout.flush()

    return 0 if payload["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
