# PRISM CAM Galaxy — Fusion 360 live parameter enumerator (slot:kilo)
#
# WHAT THIS IS
#   A Fusion 360 *Script* (Python, adsk.cam API) that walks every CAM operation
#   in the active document and dumps EVERY parameter the live API exposes —
#   name, title, type, value, expression, unit, and (when the API provides them)
#   choice/enum values. Output is a faithful JSON dump for PRISM's ingest step.
#
# WHY
#   The missing ~40% of the Fusion catalog (cam-functions/fusion360/, 59% covered)
#   is genuine data ABSENCE — it is NOT in any text-parseable local file
#   (defaults live inside Fusion; the API is the only grounded source). This dump
#   is grounded BY CONSTRUCTION: every value comes from the running seat, never
#   invented. Anything the API does not give is OMITTED (PRISM ingest marks it
#   `unverified`) — we never fabricate a default or range (would emit unsafe G-code).
#
# HOW TO RUN (operator runbook — see README-fusion-enumerator.md)
#   1. Fusion 360 -> Utilities -> ADD-INS -> Scripts and Add-Ins -> Scripts -> "+".
#   2. Point it at THIS file's folder; Fusion registers the script. Select -> Run.
#   3. Open a CAM-rich document FIRST (e.g. an op-heavy file from
#      H:/PRISM/JM DIE/FUSION CAD AND CAM FILES/). The richer the operations
#      present, the more of the universe gets enumerated.
#   4. The script writes JSON to the PRISM _raw folder (or your home dir as
#      fallback) and shows the path in a dialog. Run it against several
#      strategy-diverse docs to cover more operation types.
#   5. Hand the JSON(s) to:  node scripts/ingest-fusion-cam-enum.mjs <file.json>
#
# DESIGN: fail-loud at the top level (clear message if no CAM product), but
# fail-SOFT per parameter — a single param that throws on .value never aborts
# the whole dump; it is recorded with an `error` note instead.

import adsk.core
import adsk.cam
import traceback
import json
import os
import datetime


# Preferred output dir = PRISM repo _raw (so ingest finds it); fallback = home.
# NOTE: kept OUT of mcp-server/data/ (the ingestion-cache root guard).
_PREFERRED_OUT_DIRS = [
    r"H:/prism/scripts/cam-enumerators/_raw",
    r"H:/prism-slot-kilo/scripts/cam-enumerators/_raw",
]


def _pick_output_dir():
    for d in _PREFERRED_OUT_DIRS:
        try:
            if os.path.isdir(os.path.dirname(d)):
                os.makedirs(d, exist_ok=True)
                return d
        except Exception:
            continue
    return os.path.expanduser("~")


def _safe(getter, default=None):
    """Call a 0-arg lambda, swallow any API exception, return default."""
    try:
        return getter()
    except Exception:
        return default


def _extract_param(param):
    """Faithfully extract one CAMParameter. Never fabricates; omits absent fields."""
    out = {}
    out["name"] = _safe(lambda: param.name)
    out["title"] = _safe(lambda: param.title)
    out["isEnabled"] = _safe(lambda: param.isEnabled)

    pv = _safe(lambda: param.value)
    if pv is None:
        out["error"] = "value object inaccessible"
        return out

    # The concrete CAMParameterValue subtype is the most reliable type signal.
    out["valueType"] = _safe(lambda: type(pv).__name__)

    # Best-effort scalar value (Boolean/Float/Integer/String all expose .value).
    val = _safe(lambda: pv.value, "<<unset>>")
    if val != "<<unset>>":
        # JSON-safe coercion only; preserve numeric/bool type, stringify objects.
        if isinstance(val, (bool, int, float, str)) or val is None:
            out["value"] = val
        else:
            out["value"] = _safe(lambda: str(val))

    # Expression carries the unit-bearing form (e.g. "0.1 mm") when present.
    expr = _safe(lambda: pv.expression)
    if expr not in (None, ""):
        out["expression"] = expr

    # Choice/enum params: capture the available choices when the API exposes them.
    # ChoiceCAMParameterValue surfaces choices differently across API versions;
    # probe the documented accessors, omit silently if none resolve.
    choices = (
        _safe(lambda: list(pv.choices))
        or _safe(lambda: list(pv.choiceValues))
        or _safe(lambda: list(pv.values))
    )
    if choices:
        norm = []
        for c in choices:
            tok = _safe(lambda c=c: c.name) or _safe(lambda c=c: c.value) or _safe(lambda c=c: str(c))
            if tok is not None:
                norm.append(tok)
        if norm:
            out["enumValues"] = norm

    return out


def _extract_operation(op):
    out = {}
    out["operationName"] = _safe(lambda: op.name)
    out["strategy"] = _safe(lambda: op.strategy)  # internal Fusion strategy id
    out["operationType"] = _safe(lambda: op.operationType)
    params = _safe(lambda: op.parameters)
    pcount = _safe(lambda: params.count, 0) if params else 0
    plist = []
    for i in range(pcount or 0):
        p = _safe(lambda i=i: params.item(i))
        if p is None:
            continue
        try:
            plist.append(_extract_param(p))
        except Exception as e:
            plist.append({"error": "extract failed: %s" % e})
    out["parameterCount"] = len(plist)
    out["parameters"] = plist
    return out


def run(context):
    ui = None
    try:
        app = adsk.core.Application.get()
        ui = app.userInterface

        product = app.activeProduct
        cam = adsk.cam.CAM.cast(product)
        if cam is None:
            # Fail loud — the operator must be in the Manufacture workspace.
            ui.messageBox(
                "PRISM enumerator: no CAM product active.\n\n"
                "Switch to the MANUFACTURE workspace with a document that has at "
                "least one CAM setup + operations, then run again."
            )
            return

        doc_name = _safe(lambda: app.activeDocument.name, "untitled")
        version = _safe(lambda: app.version, "unknown")

        operations = []
        setups = _safe(lambda: cam.setups)
        setup_count = _safe(lambda: setups.count, 0) if setups else 0
        for s in range(setup_count or 0):
            setup = _safe(lambda s=s: setups.item(s))
            if setup is None:
                continue
            # allOperations includes operations nested in folders/patterns.
            ops = _safe(lambda: setup.allOperations) or _safe(lambda: setup.operations)
            ocount = _safe(lambda: ops.count, 0) if ops else 0
            for o in range(ocount or 0):
                op = _safe(lambda o=o: ops.item(o))
                if op is None:
                    continue
                try:
                    operations.append(_extract_operation(op))
                except Exception as e:
                    operations.append({"error": "operation extract failed: %s" % e})

        if not operations:
            ui.messageBox(
                "PRISM enumerator: CAM product found but 0 operations enumerated.\n\n"
                "Open a document that already contains CAM operations (e.g. one "
                "from JM DIE/FUSION CAD AND CAM FILES/) and run again."
            )
            return

        total_params = sum(len(o.get("parameters", [])) for o in operations)
        payload = {
            "system": "fusion360",
            "source": "Fusion 360 %s live-enum" % version,
            "enumeratedAt": datetime.datetime.now().isoformat(),
            "document": doc_name,
            "operationCount": len(operations),
            "totalParameters": total_params,
            "operations": operations,
        }

        out_dir = _pick_output_dir()
        ts = datetime.datetime.now().strftime("%Y%m%dT%H%M%S")
        safe_doc = "".join(ch for ch in str(doc_name) if ch.isalnum() or ch in "-_")[:40]
        out_path = os.path.join(out_dir, "fusion-enum-%s-%s.json" % (safe_doc or "doc", ts))
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=1, ensure_ascii=False)

        ui.messageBox(
            "PRISM Fusion enumerator - done.\n\n"
            "Document: %s\nOperations: %d\nParameters: %d\n\n"
            "Written to:\n%s\n\n"
            "Next: node scripts/ingest-fusion-cam-enum.mjs \"%s\""
            % (doc_name, len(operations), total_params, out_path, out_path)
        )

    except Exception:
        if ui:
            ui.messageBox("PRISM enumerator failed:\n%s" % traceback.format_exc())
        else:
            raise
