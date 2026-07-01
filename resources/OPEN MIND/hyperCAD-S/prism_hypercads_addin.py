"""
PRISM In-Host Add-In for hyperCAD-S 31.0 (CAD-FUSION-LIVE-MS0 / U-HCS-ADDIN)
============================================================================

Loads inside hyperCAD-S via OPEN MIND's `om.cad` Python bridge
(`H:/.../OPEN MIND/Shared/31.0/python/lib/om/cad/`) and registers with
the PRISM Plugin Communication Hub over WebSocket. PRISM-side calls
flow:

    HyperCADSLiveBridgeEngine     (mcp-server/src/engines/HyperCADSLiveBridgeEngine.ts)
      → HyperCADSCodeGeneratorEngine.executeScript() → AC Python
        → HyperMillACBridgeEngine (loopback HTTP :18341)
          → POSTs script body → AC Python interpreter
            → imports `prism_hypercads_addin` (THIS FILE)
              → handlers call `om.cad` → mutates the live hyperCAD-S session

The Fusion-360 sibling lives at `resources/fusion360/prism-test-runner/`;
the hyperMILL sibling at `resources/HYPERMILL/prism_test_runner.py`.

This file CANNOT be exercised by vitest because it depends on the OPEN
MIND `om.cad` bridge. The shop installs it once under one of:

    %APPDATA%/OPENMIND/hyperCAD-S/31.0/Plugins/PRISM/prism_hypercads_addin.py
    H:/PRISM/resources/OPEN MIND/Shared/31.0/python/site-packages/prism_hypercads_addin.py

hyperCAD-S discovers it at startup and the PRISM panel appears.

Public API (PRISM engine side calls these via JSON-RPC over WS, or AC
Python loads this module and calls the dispatcher directly):

    register_with_hub()        — open WS, send registration
    handle_op(op: dict)        — dispatch a single CADOperation to om.cad
    handle_electrode_op(op)    — electrode-specific operations
    emit_frame(frame)          — stream telemetry (geometry refresh, error)
    report_result(result)      — final per-op result back to PRISM
    heartbeat()                — keep WS alive (5s stale threshold)

CADOperation kinds (match `HyperCADSLiveBridgeEngine` exactly):
    sketch_create, feature_extrude, feature_fillet, feature_chamfer,
    feature_revolve, feature_hole, feature_pattern_linear,
    feature_pattern_circular, boolean_union, boolean_subtract,
    boolean_intersect, feature_shell, export_step, export_iges,
    export_stl, export_dxf, export_pdf

Electrode operation kinds (NEW — driven by hyperCAD-S electrode module):
    electrode_pick_block_holder, electrode_set_orbit_strategy,
    electrode_set_description, electrode_generate, electrode_export_to_edm,
    electrode_clamping_setup, electrode_burn_sequence

Electrode descriptions (from `files/electrode/electrode_descriptions.xml`):
    Core / Cavity / Insert / Side / Master / Virtual / Injection /
    Rotational / User defined

Electrode orbits (from `files/electrode/electrode_orbit.xml`):
    Sink / Sphere / Square / Widen / Linear / Sink-and-widen /
    Sink-and-sphere / Sink-and-square / Injection / Half-sphere / ISOG

Holder libraries (from `files/electrode/electrode_blocks_holders*.xml`):
    Erowa_r / Erowa_s / System-3R_r / System-3R_s
    (Squared blocks + cylindrical blocks; X/Y face sizes, Z heights
    20/40/60/80/100/150/200/250/300mm)
"""

from __future__ import annotations

import json
import time
import uuid
from dataclasses import dataclass, field
from typing import Any

# ── om.cad host bridge — imported inside hyperCAD-S only; safely None offline.
try:
    import om.cad as om_cad  # noqa: F401  (hyperCAD-S resident)
except ImportError:  # pragma: no cover — outside hyperCAD-S
    om_cad = None  # type: ignore[assignment]

# ── WebSocket client shim; real install ships `websocket-client>=1.8`.
try:
    import websocket  # type: ignore[import-not-found]
except ImportError:  # pragma: no cover
    websocket = None  # type: ignore[assignment]


# ── Constants (shared with PRISM-side Communication Hub) ─────────────────────

HUB_ENDPOINT = "ws://localhost:7421/inhost/hypercads"
PLUGIN_ID = "hypercads-inhost-addin"
PLUGIN_VERSION = "1.0.0"
HEARTBEAT_INTERVAL_S = 2.5
HUB_STALE_THRESHOLD_S = 5.0

# Mirrors `CADOperationKind` in mcp-server/src/interfaces/ICADCodeGenerator.ts.
CAD_OP_KINDS = (
    "sketch_create",
    "feature_extrude",
    "feature_fillet",
    "feature_chamfer",
    "feature_revolve",
    "feature_hole",
    "feature_pattern_linear",
    "feature_pattern_circular",
    "boolean_union",
    "boolean_subtract",
    "boolean_intersect",
    "feature_shell",
    "export_step",
    "export_iges",
    "export_stl",
    "export_dxf",
    "export_pdf",
)

# Electrode-specific kinds (NEW for hyperCAD-S vs Fusion).
ELECTRODE_OP_KINDS = (
    "electrode_pick_block_holder",
    "electrode_set_orbit_strategy",
    "electrode_set_description",
    "electrode_generate",
    "electrode_export_to_edm",
    "electrode_clamping_setup",
    "electrode_burn_sequence",
)

# Catalog from `files/electrode/electrode_descriptions.xml`.
ELECTRODE_DESCRIPTIONS = (
    "Core electrode",
    "Cavity electrode",
    "Insert electrode",
    "Side electrode",
    "Master electrode",
    "Virtual electrode",
    "Injection electrode",
    "Rotational electrode",
    "User defined electrode",
)

# Catalog from `files/electrode/electrode_orbit.xml`.
ELECTRODE_ORBITS = (
    "Sink",
    "Sphere",
    "Square",
    "Widen",
    "Linear",
    "Sink and widen",
    "Sink and shpere",  # vendor spelling
    "Sink and square",
    "Injection",
    "Half sphere",
    "ISOG",
)

# Catalog from `files/electrode/electrode_blocks_holders.xml`.
HOLDER_LIBRARIES = ("Erowa_r", "Erowa_s", "System-3R_r", "System-3R_s")

# Standard block Z heights (mm) in hyperCAD-S electrode catalog.
HOLDER_Z_HEIGHTS_MM = (20, 40, 60, 80, 100, 150, 200, 250, 300)


# ── State ────────────────────────────────────────────────────────────────────

@dataclass
class AddinState:
    """In-memory state tracked by the add-in across the WS lifetime."""

    session_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    ws: Any = None
    ops_in: int = 0
    ops_succeeded: int = 0
    ops_failed: int = 0
    last_op_id: str | None = None
    last_error: str | None = None

    def reset_counters(self) -> None:
        self.ops_in = 0
        self.ops_succeeded = 0
        self.ops_failed = 0
        self.last_op_id = None
        self.last_error = None


# ── Hub registration / heartbeat / frame emission ────────────────────────────

def register_with_hub(state: AddinState) -> None:
    """Open the WS connection and send the hub registration handshake.

    Raises RuntimeError if `websocket-client` isn't installed — the shop
    install ships it; offline syntax-check tolerates the missing dep.
    """
    if websocket is None:
        raise RuntimeError("websocket-client not installed — `pip install websocket-client`")
    state.ws = websocket.create_connection(HUB_ENDPOINT, timeout=5)
    payload = {
        "plugin_id": PLUGIN_ID,
        "target": "hypercads",
        "transport": "websocket",
        "endpoint": HUB_ENDPOINT,
        "version": PLUGIN_VERSION,
        "capabilities": [
            *CAD_OP_KINDS,
            *ELECTRODE_OP_KINDS,
        ],
        "electrode_descriptions": list(ELECTRODE_DESCRIPTIONS),
        "electrode_orbits": list(ELECTRODE_ORBITS),
        "holder_libraries": list(HOLDER_LIBRARIES),
    }
    state.ws.send(json.dumps({"op": "register", "data": payload}))


def heartbeat(state: AddinState) -> None:
    """Send a heartbeat. Hub marks us offline after HUB_STALE_THRESHOLD_S."""
    if state.ws is None:
        return
    state.ws.send(json.dumps({"op": "heartbeat", "plugin_id": PLUGIN_ID, "ts": time.time()}))


def emit_frame(state: AddinState, frame: dict[str, Any]) -> None:
    """Send one frame envelope to the hub. frame must carry `op_id`."""
    if state.ws is None:
        return
    state.ws.send(json.dumps({"op": "route", "data": {**frame, "target": "hypercads"}}))


def report_result(state: AddinState, result: dict[str, Any]) -> None:
    """Ship a per-op result back to the PRISM engine for outcome recording."""
    if state.ws is None:
        return
    state.ws.send(json.dumps({"op": "op_result", "data": result}))


# ── Dispatcher: CADOperation → om.cad call ───────────────────────────────────

def handle_op(state: AddinState, op: dict[str, Any]) -> dict[str, Any]:
    """Translate one CADOperation into an om.cad call.

    Returns a dict shaped like LiveOpResult on the PRISM side:
        { ok, opId, durationMs, error?, output_files? }

    The actual om.cad call surface is whatever the OPEN MIND `_hcs.cad`
    binding exposes — the operator wires the concrete `om.cad.<func>`
    name at install time (it differs per hyperCAD-S point release).
    Placeholders below match the kind name so the operator can grep.
    """
    if om_cad is None:
        raise RuntimeError("om.cad not available — addin must be loaded inside hyperCAD-S")

    kind = op.get("kind")
    args = op.get("args", {})
    op_id = op.get("operationId") or f"op-{state.ops_in}"
    state.last_op_id = op_id
    state.ops_in += 1
    start = time.time()

    if kind not in CAD_OP_KINDS:
        state.ops_failed += 1
        state.last_error = f"unknown CADOperation kind: {kind}"
        return {
            "ok": False,
            "opId": op_id,
            "error": state.last_error,
            "durationMs": (time.time() - start) * 1000,
        }

    try:
        result = _dispatch_cad_op(kind, args)
        state.ops_succeeded += 1
        return {
            "ok": True,
            "opId": op_id,
            "kind": kind,
            "result": result,
            "durationMs": (time.time() - start) * 1000,
        }
    except Exception as exc:  # noqa: BLE001 — fail-loud, surface ALL exceptions
        state.ops_failed += 1
        state.last_error = f"{type(exc).__name__}: {exc}"
        return {
            "ok": False,
            "opId": op_id,
            "kind": kind,
            "error": state.last_error,
            "durationMs": (time.time() - start) * 1000,
        }


def _dispatch_cad_op(kind: str, args: dict[str, Any]) -> dict[str, Any]:
    """Per-kind branch. Each branch calls the concrete `om.cad` function.

    Implementation contract: every branch MUST be replaced by the operator
    with the actual `om.cad` call when installing on a workstation. The
    placeholder `getattr` lookup lets the install ship without crashing.

    R12 fail-loud: branches that can't find the host function raise
    AttributeError — surfaced to the caller as a structured failure.
    """
    if kind == "sketch_create":
        plane = args.get("plane", "XY")
        shapes = args.get("shapes", [])
        fn = getattr(om_cad, "create_sketch", None) or getattr(om_cad, "sketch_create", None)
        if fn is None:
            raise AttributeError("om.cad.create_sketch not found — install required")
        return {"sketch": fn(plane=plane, shapes=shapes)}

    if kind == "feature_extrude":
        fn = getattr(om_cad, "extrude", None) or getattr(om_cad, "feature_extrude", None)
        if fn is None:
            raise AttributeError("om.cad.extrude not found — install required")
        return {"feature": fn(
            profile_id=args.get("profileId"),
            distance=args["distance"],
            operation=args.get("operation", "new_body"),
        )}

    if kind == "feature_fillet":
        fn = getattr(om_cad, "fillet", None) or getattr(om_cad, "feature_fillet", None)
        if fn is None:
            raise AttributeError("om.cad.fillet not found — install required")
        return {"feature": fn(edge_ids=args.get("edgeIds", []), radius=args["radius"])}

    if kind == "feature_chamfer":
        fn = getattr(om_cad, "chamfer", None) or getattr(om_cad, "feature_chamfer", None)
        if fn is None:
            raise AttributeError("om.cad.chamfer not found — install required")
        return {"feature": fn(edge_ids=args.get("edgeIds", []), distance=args["distance"])}

    if kind == "feature_revolve":
        fn = getattr(om_cad, "revolve", None) or getattr(om_cad, "feature_revolve", None)
        if fn is None:
            raise AttributeError("om.cad.revolve not found — install required")
        return {"feature": fn(
            profile_id=args.get("profileId"),
            axis_id=args.get("axisId"),
            angle=args["angle"],
        )}

    if kind == "feature_hole":
        fn = getattr(om_cad, "hole", None) or getattr(om_cad, "feature_hole", None)
        if fn is None:
            raise AttributeError("om.cad.hole not found — install required")
        return {"feature": fn(
            x=args["x"], y=args["y"],
            diameter=args["diameter"], depth=args["depth"],
        )}

    if kind in ("feature_pattern_linear", "feature_pattern_circular"):
        pattern_type = "linear" if kind == "feature_pattern_linear" else "circular"
        fn = getattr(om_cad, "pattern", None) or getattr(om_cad, "feature_pattern", None)
        if fn is None:
            raise AttributeError("om.cad.pattern not found — install required")
        return {"feature": fn(
            type=pattern_type,
            feature_ids=args.get("featureIds", []),
            count=args["count"],
            spacing=args.get("spacing"),
        )}

    if kind in ("boolean_union", "boolean_subtract", "boolean_intersect"):
        op_name = kind.replace("boolean_", "")
        fn = getattr(om_cad, "boolean", None) or getattr(om_cad, f"boolean_{op_name}", None)
        if fn is None:
            raise AttributeError(f"om.cad.boolean ({op_name}) not found — install required")
        return {"feature": fn(op=op_name, body_ids=args.get("bodyIds", []))}

    if kind == "feature_shell":
        fn = getattr(om_cad, "shell", None) or getattr(om_cad, "feature_shell", None)
        if fn is None:
            raise AttributeError("om.cad.shell not found — install required")
        return {"feature": fn(body_id=args.get("bodyId"), thickness=args["thickness"])}

    if kind.startswith("export_"):
        fmt = kind.split("_", 1)[1]  # step / iges / stl / dxf / pdf
        fn = getattr(om_cad, "export", None) or getattr(om_cad, f"export_{fmt}", None)
        if fn is None:
            raise AttributeError(f"om.cad.export ({fmt}) not found — install required")
        return {"export": fn(format=fmt, path=args.get("path"))}

    # CAD_OP_KINDS membership was already validated above — this is unreachable
    # in practice; kept as belt-and-braces for branch exhaustiveness checks.
    raise AssertionError(f"unhandled CADOperation kind: {kind}")


# ── Electrode dispatcher ─────────────────────────────────────────────────────

def handle_electrode_op(state: AddinState, op: dict[str, Any]) -> dict[str, Any]:
    """Translate one electrode operation into an om.cad electrode call.

    Electrode operations have NO Fusion-360 equivalent — this is the
    primary reason for picking hyperCAD-S as a connector target.
    The electrode module is sinker-EDM-specific and used heavily for
    tool-and-die work (JM Die's bread-and-butter).

    R12: validates electrode-type / orbit / holder-lib against the
    catalog before dispatching; rejects with a structured error otherwise.
    """
    if om_cad is None:
        raise RuntimeError("om.cad not available — addin must be loaded inside hyperCAD-S")

    kind = op.get("kind")
    args = op.get("args", {})
    op_id = op.get("operationId") or f"elec-op-{state.ops_in}"
    state.last_op_id = op_id
    state.ops_in += 1
    start = time.time()

    if kind not in ELECTRODE_OP_KINDS:
        state.ops_failed += 1
        state.last_error = f"unknown electrode kind: {kind}"
        return {
            "ok": False,
            "opId": op_id,
            "error": state.last_error,
            "durationMs": (time.time() - start) * 1000,
        }

    try:
        result = _dispatch_electrode_op(kind, args)
        state.ops_succeeded += 1
        return {
            "ok": True,
            "opId": op_id,
            "kind": kind,
            "result": result,
            "durationMs": (time.time() - start) * 1000,
        }
    except Exception as exc:  # noqa: BLE001 — fail-loud
        state.ops_failed += 1
        state.last_error = f"{type(exc).__name__}: {exc}"
        return {
            "ok": False,
            "opId": op_id,
            "kind": kind,
            "error": state.last_error,
            "durationMs": (time.time() - start) * 1000,
        }


def _dispatch_electrode_op(kind: str, args: dict[str, Any]) -> dict[str, Any]:
    """Per-kind electrode branch. Calls om.cad's electrode module."""
    elec = getattr(om_cad, "electrode", None)
    if elec is None:
        raise AttributeError(
            "om.cad.electrode not found — requires hyperCAD-S electrode module licence"
        )

    if kind == "electrode_pick_block_holder":
        library = args.get("library")
        if library not in HOLDER_LIBRARIES:
            raise ValueError(
                f"unknown holder library: {library!r} — known: {HOLDER_LIBRARIES}"
            )
        z_height_mm = args.get("z_height_mm")
        if z_height_mm is not None and z_height_mm not in HOLDER_Z_HEIGHTS_MM:
            raise ValueError(
                f"non-standard Z height: {z_height_mm}mm — known: {HOLDER_Z_HEIGHTS_MM}"
            )
        fn = getattr(elec, "pick_block_holder", None) or getattr(elec, "select_holder", None)
        if fn is None:
            raise AttributeError("om.cad.electrode.pick_block_holder not found")
        return {"holder": fn(
            library=library,
            face_x_mm=args.get("face_x_mm"),
            face_y_mm=args.get("face_y_mm"),
            z_height_mm=z_height_mm,
            clamping=args.get("clamping", "000"),
            principal_orientation=args.get("principal_orientation", "X"),
        )}

    if kind == "electrode_set_orbit_strategy":
        orbit = args.get("orbit")
        if orbit not in ELECTRODE_ORBITS:
            raise ValueError(
                f"unknown orbit strategy: {orbit!r} — known: {ELECTRODE_ORBITS}"
            )
        fn = getattr(elec, "set_orbit", None) or getattr(elec, "orbit_strategy", None)
        if fn is None:
            raise AttributeError("om.cad.electrode.set_orbit not found")
        return {"orbit": fn(
            strategy=orbit,
            undersize_mm=args.get("undersize_mm", 0.0),
            roughing_undersize_mm=args.get("roughing_undersize_mm"),
            finishing_undersize_mm=args.get("finishing_undersize_mm"),
        )}

    if kind == "electrode_set_description":
        description = args.get("description")
        if description not in ELECTRODE_DESCRIPTIONS:
            raise ValueError(
                f"unknown electrode description: {description!r} — known: {ELECTRODE_DESCRIPTIONS}"
            )
        fn = getattr(elec, "set_description", None) or getattr(elec, "electrode_type", None)
        if fn is None:
            raise AttributeError("om.cad.electrode.set_description not found")
        return {"description": fn(description=description)}

    if kind == "electrode_generate":
        fn = getattr(elec, "generate", None) or getattr(elec, "create_electrode", None)
        if fn is None:
            raise AttributeError("om.cad.electrode.generate not found")
        return {"electrode": fn(
            description=args.get("description", "Core electrode"),
            cavity_body_id=args.get("cavity_body_id"),
            burn_face_ids=args.get("burn_face_ids", []),
            holder_library=args.get("holder_library", "Erowa_s"),
            orbit_strategy=args.get("orbit_strategy", "Sink"),
            undersize_mm=args.get("undersize_mm", 0.05),
            material=args.get("material", "Cu_OFHC"),
        )}

    if kind == "electrode_export_to_edm":
        fn = getattr(elec, "export_to_edm", None) or getattr(elec, "edm_export", None)
        if fn is None:
            raise AttributeError("om.cad.electrode.export_to_edm not found")
        return {"export": fn(
            electrode_id=args.get("electrode_id"),
            format=args.get("format", "step"),  # step / dxf / native
            path=args.get("path"),
        )}

    if kind == "electrode_clamping_setup":
        fn = getattr(elec, "clamping_setup", None) or getattr(elec, "set_clamping", None)
        if fn is None:
            raise AttributeError("om.cad.electrode.clamping_setup not found")
        return {"clamping": fn(
            electrode_id=args.get("electrode_id"),
            clamping_code=args.get("clamping_code", "000"),
            holder_library=args.get("holder_library", "Erowa_s"),
            offset_x_mm=args.get("offset_x_mm", 0.0),
            offset_y_mm=args.get("offset_y_mm", 0.0),
            offset_z_mm=args.get("offset_z_mm", 0.0),
        )}

    if kind == "electrode_burn_sequence":
        fn = getattr(elec, "burn_sequence", None) or getattr(elec, "edm_sequence", None)
        if fn is None:
            raise AttributeError("om.cad.electrode.burn_sequence not found")
        return {"sequence": fn(
            electrode_ids=args.get("electrode_ids", []),
            order=args.get("order", "depth_descending"),
            roughing_per_electrode=args.get("roughing_per_electrode", True),
            finishing_per_electrode=args.get("finishing_per_electrode", True),
        )}

    raise AssertionError(f"unhandled electrode kind: {kind}")


# ── Combined dispatcher used by the WS message loop ─────────────────────────

def dispatch(state: AddinState, op: dict[str, Any]) -> dict[str, Any]:
    """Top-level dispatcher — routes to handle_op or handle_electrode_op."""
    kind = op.get("kind", "")
    if kind in ELECTRODE_OP_KINDS:
        return handle_electrode_op(state, op)
    if kind in CAD_OP_KINDS:
        return handle_op(state, op)
    state.ops_in += 1
    state.ops_failed += 1
    state.last_error = f"unknown op kind: {kind!r}"
    return {
        "ok": False,
        "opId": op.get("operationId") or "unknown",
        "error": state.last_error,
    }


# ── Heartbeat loop (entrypoint) ──────────────────────────────────────────────

def main() -> None:  # pragma: no cover — hyperCAD-S resident entrypoint
    """Entrypoint hyperCAD-S calls at plugin load.

    Real install: this blocks, heartbeats, and dispatches `dispatch` calls
    received from the PRISM Communication Hub. Kept minimal here because
    no offline harness can drive the WS round-trip without a running
    PRISM server.
    """
    state = AddinState()
    register_with_hub(state)
    try:
        while True:
            heartbeat(state)
            # Pull the next op envelope off the WS (the hub fans this out
            # from PRISM-side HyperCADSLiveBridgeEngine calls). Real impl
            # uses non-blocking recv with a poll loop.
            try:
                if state.ws is None:
                    break
                raw = state.ws.recv()
                if not raw:
                    time.sleep(HEARTBEAT_INTERVAL_S)
                    continue
                envelope = json.loads(raw)
                if envelope.get("op") == "dispatch":
                    result = dispatch(state, envelope.get("data", {}))
                    report_result(state, result)
                elif envelope.get("op") == "shutdown":
                    break
            except Exception:  # noqa: BLE001
                # Hub disconnect or recv timeout — heartbeat and retry.
                time.sleep(HEARTBEAT_INTERVAL_S)
    finally:
        if state.ws is not None:
            state.ws.close()


if __name__ == "__main__":  # pragma: no cover
    main()
