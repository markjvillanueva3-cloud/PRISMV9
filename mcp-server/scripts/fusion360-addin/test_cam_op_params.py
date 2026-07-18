#!/usr/bin/env python
"""Real-shape tests for GET /cam/operation/parameters (navmap endpoint #3, the verify-before-bind
keystone). Imports the ACTUAL add-in module (mocking only `adsk`) and drives the real
`_FusionAPILogic._list_cam_operation_parameters` through `dispatch()` — so it catches the
wrong-class / runtime-AttributeError class that py_compile + hermetic HTTP-shape mocks miss.

Invariants asserted: resolves op by index AND by name; enumerates REAL param names + the op's
.strategy; is strictly READ-ONLY (never mutates a parameter); per-param fail-soft (a param whose
.value raises is still listed); errors loud on no-CAM / bad setup / out-of-range op.

    H:/Tools/python/python.exe mcp-server/scripts/fusion360-addin/test_cam_op_params.py
"""
import os
import sys
import types
import importlib.util


def _install_fake_adsk():
    adsk = types.ModuleType("adsk")
    core = types.ModuleType("adsk.core")
    fusion = types.ModuleType("adsk.fusion")
    cam = types.ModuleType("adsk.cam")

    class CustomEventHandler:
        pass

    class _Application:
        _inst = None

        @classmethod
        def get(cls):
            return cls._inst

    core.CustomEventHandler = CustomEventHandler
    core.CustomEvent = type("CustomEvent", (), {})
    core.Application = _Application
    core.DocumentTypes = type("DocumentTypes", (), {"FusionDesignDocumentType": 0})
    fusion.Design = type("Design", (), {"cast": staticmethod(lambda x: x)})
    fusion.DesignTypes = type("DesignTypes", (), {"ParametricDesignType": 0, "DirectDesignType": 1})
    # adsk.cam.CAM.cast(activeProduct) → return as-is (None stays None → "No CAM product").
    cam.CAM = type("CAM", (), {"cast": staticmethod(lambda x: x)})
    adsk.core = core
    adsk.fusion = fusion
    adsk.cam = cam
    adsk.doEvents = lambda *a, **k: None
    for name, m in (("adsk", adsk), ("adsk.core", core), ("adsk.fusion", fusion), ("adsk.cam", cam)):
        sys.modules[name] = m
    return core


def _load_module():
    here = os.path.dirname(os.path.abspath(__file__))
    spec = importlib.util.spec_from_file_location("fusion_api_server", os.path.join(here, "fusion360_api_server.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class FakeValue:
    def __init__(self, value, raises=False):
        self._value = value
        self._raises = raises

    @property
    def value(self):
        if self._raises:
            raise RuntimeError("value accessor unsupported for this CAMParameterValue subtype")
        return self._value


class FakeParam:
    def __init__(self, name, value, raises=False):
        self.name = name
        self.title = name.replace("_", " ")
        self.expression = str(value)
        self.isEnabled = True
        self.value = FakeValue(value, raises)
        self.mutated = False

    # If anything tried to WRITE the expression, we'd see it — read-only invariant guard.
    def __setattr__(self, k, v):
        if k == "expression" and getattr(self, "_inited", False):
            object.__setattr__(self, "mutated", True)
        object.__setattr__(self, k, v)


class FakeColl:
    def __init__(self, items):
        self._items = items

    @property
    def count(self):
        return len(self._items)

    def item(self, i):
        return self._items[i]


class FakeOp:
    def __init__(self, name, strategy, params):
        self.name = name
        self.strategy = strategy
        self.parameters = FakeColl(params)


class FakeSetup:
    def __init__(self, name, ops):
        self.name = name
        self.operations = FakeColl(ops)


class FakeCAM:
    def __init__(self, setups):
        self.setups = FakeColl(setups)


class FakeApp:
    def __init__(self, cam):
        self.activeProduct = cam


def _mk_cam():
    p1 = FakeParam("tool_diameter", 0.5)
    p2 = FakeParam("stepover", 0.4)
    p3 = FakeParam("weird_choice", "outside", raises=True)  # value accessor raises -> fail-soft
    for p in (p1, p2, p3):
        object.__setattr__(p, "_inited", True)
    op = FakeOp("Face1", "turningFace", [p1, p2, p3])
    return FakeCAM([FakeSetup("Setup1", [op])]), (p1, p2, p3), op


def main():
    core = _install_fake_adsk()
    mod = _load_module()
    logic = mod._FusionAPILogic()
    failures = []

    def check(cond, msg):
        (print("  ok:", msg) if cond else (failures.append(msg), print("  FAIL:", msg)))

    # T1 — no CAM product → loud error, no crash.
    core.Application._inst = FakeApp(None)
    r1 = logic._list_cam_operation_parameters({})
    check("error" in r1 and "No CAM product" in r1["error"], "no CAM -> loud error")

    # T2 — resolve op by index, enumerate real names + strategy; READ-ONLY.
    cam, (p1, p2, p3), op = _mk_cam()
    core.Application._inst = FakeApp(cam)
    r2 = logic._list_cam_operation_parameters({"setup_index": "0", "op_index": "0"})
    print("T2:", {k: r2.get(k) for k in ("success", "strategy", "parameter_count", "operation_name")})
    check(r2.get("success") is True, "by-index resolve succeeds")
    check(r2.get("strategy") == "turningFace", "real .strategy surfaced (verifies matrix string)")
    check(r2.get("parameter_count") == 3, "all 3 params enumerated")
    names = [p["name"] for p in r2["parameters"]]
    check(names == ["tool_diameter", "stepover", "weird_choice"], "exact real param names dumped")
    check(all(not p.mutated for p in (p1, p2, p3)), "READ-ONLY — no parameter was mutated")

    # T3 — per-param fail-soft: p3's value raised, but it is still listed (value_type/value None).
    p3entry = [p for p in r2["parameters"] if p["name"] == "weird_choice"][0]
    check(p3entry.get("value") is None, "fail-soft: raising param listed with value=None (dump not aborted)")

    # T4 — resolve op by NAME.
    cam, _, _ = _mk_cam()
    core.Application._inst = FakeApp(cam)
    r4 = logic._list_cam_operation_parameters({"op_name": "Face1"})
    check(r4.get("operation_name") == "Face1", "by-name resolve returns the named op")

    # T5 — op_index out of range → loud error.
    cam, _, _ = _mk_cam()
    core.Application._inst = FakeApp(cam)
    r5 = logic._list_cam_operation_parameters({"op_index": "9"})
    check("error" in r5 and "out of range" in r5["error"], "op_index OOR -> loud error")

    # T6 — full dispatch path GET /cam/operation/parameters returns data, not an error envelope
    #      (proves the route is wired + the method resolves in the dispatch class).
    cam, _, _ = _mk_cam()
    core.Application._inst = FakeApp(cam)
    # dispatch signature is (method, path, body, query) — query is the 4th arg.
    out = logic.dispatch("GET", "/cam/operation/parameters", None, {"op_index": "0"})
    print("T6 dispatch:", {k: out.get(k) for k in ("success", "parameter_count")})
    check("error" not in out and out.get("parameter_count") == 3, "GET route wired + resolves via dispatch")

    print()
    if failures:
        print(f"FAILED ({len(failures)}):")
        for f in failures:
            print("  -", f)
        sys.exit(1)
    print("ALL PASS")


if __name__ == "__main__":
    main()
