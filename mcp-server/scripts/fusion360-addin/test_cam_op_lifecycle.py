#!/usr/bin/env python
"""Real-shape tests for the CAM operation LIFECYCLE endpoints (navmap #5 edit + #7 delete/reorder).
Imports the ACTUAL add-in module (mocking only `adsk`) and drives the real
`_FusionAPILogic._edit_cam_operation / _delete_cam_operation / _reorder_cam_operation` through
`dispatch()` — catching the wrong-class / runtime-AttributeError class that py_compile + hermetic
HTTP-shape mocks miss (same harness precedent as test_cam_op_params.py / endpoint #3).

Invariants asserted:
  EDIT   — sets only the named params (itemByName/.expression, no factor); unknown names are REPORTED
           in 'failed', never guessed; non-dict raw_parameters errors loud; idempotent route wired.
  DELETE — REFUSES an implicit target (must pass op_name or explicit op_index); deleteMe() removes the
           op and remaining count drops; no-CAM errors loud.
  REORDER— missing/OOR target_index errors loud; capability-DETECTS move(): applies it when present,
           and fail-soft REFUSES (supported=False + available methods + fallback) when absent — never
           a silent no-op (R12).

    H:/Tools/python/python.exe mcp-server/scripts/fusion360-addin/test_cam_op_lifecycle.py
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

    class _Application:
        _inst = None

        @classmethod
        def get(cls):
            return cls._inst

    core.CustomEventHandler = type("CustomEventHandler", (), {})
    core.CustomEvent = type("CustomEvent", (), {})
    core.Application = _Application
    core.DocumentTypes = type("DocumentTypes", (), {"FusionDesignDocumentType": 0})
    fusion.Design = type("Design", (), {"cast": staticmethod(lambda x: x)})
    fusion.DesignTypes = type("DesignTypes", (), {"ParametricDesignType": 0, "DirectDesignType": 1})
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


class FakeParam:
    def __init__(self, name, expr, raises_on_write=False):
        self.name = name
        self.expression = str(expr)
        self.writes = 0
        self.raises_on_write = raises_on_write

    def __setattr__(self, k, v):
        if k == "expression" and getattr(self, "_inited", False):
            if getattr(self, "raises_on_write", False):
                # Mirror a real Fusion CAMParameter rejecting a bad expression (e.g. "0.4 banana").
                raise RuntimeError("invalid expression for this CAMParameter")
            object.__setattr__(self, "writes", self.writes + 1)
        object.__setattr__(self, k, v)


class FakeParamColl:
    def __init__(self, params):
        self._by = {p.name: p for p in params}
        self._items = params

    @property
    def count(self):
        return len(self._items)

    def item(self, i):
        return self._items[i]

    def itemByName(self, name):
        return self._by.get(name)  # None when absent → handler reports 'not_found' (never guesses)


class FakeOp:
    def __init__(self, name, params):
        self.name = name
        self.parameters = FakeParamColl(params)
        self._parent = None
        self.deleted = False

    def deleteMe(self):
        self.deleted = True
        if self._parent is not None:
            self._parent._remove(self)
        return True


class FakeOpsColl:
    def __init__(self, ops):
        self._items = list(ops)
        for o in self._items:
            o._parent = self

    @property
    def count(self):
        return len(self._items)

    def item(self, i):
        return self._items[i]

    def _remove(self, op):
        self._items = [o for o in self._items if o is not op]


class FakeOpsCollWithMove(FakeOpsColl):
    def __init__(self, ops):
        super().__init__(ops)
        self.moved = None

    def move(self, op, target_index):
        self.moved = (op.name, target_index)
        return True


class FakeOpWithMove(FakeOp):
    """Op exposing its OWN move(target_index) — exercises the handler's second capability branch
    (`hasattr(op, 'move')`) when the collection itself has no move()."""
    def __init__(self, name, params):
        super().__init__(name, params)
        self.moved_to = None

    def move(self, target_index):
        self.moved_to = target_index
        return True


class FakeSetup:
    def __init__(self, name, ops_coll):
        self.name = name
        self.operations = ops_coll


class FakeColl:
    def __init__(self, items):
        self._items = items

    @property
    def count(self):
        return len(self._items)

    def item(self, i):
        return self._items[i]


class FakeCAM:
    def __init__(self, setups):
        self.setups = FakeColl(setups)


class FakeApp:
    def __init__(self, cam):
        self.activeProduct = cam


def _mk_cam(with_move=False):
    op1 = FakeOp("Face1", [FakeParam("stepover", "0.5 in"), FakeParam("tool_diameter", "0.25 in")])
    op2 = FakeOp("Rough1", [FakeParam("stepover", "0.3 in")])
    for o in (op1, op2):
        for p in o.parameters._items:
            object.__setattr__(p, "_inited", True)
    ops = (FakeOpsCollWithMove if with_move else FakeOpsColl)([op1, op2])
    return FakeCAM([FakeSetup("Setup1", ops)]), op1, op2


def main():
    core = _install_fake_adsk()
    mod = _load_module()
    logic = mod._FusionAPILogic()
    failures = []

    def check(cond, msg):
        (print("  ok:", msg) if cond else (failures.append(msg), print("  FAIL:", msg)))

    # ── EDIT (#5) ─────────────────────────────────────────────────────
    # E1 — no CAM → loud error.
    core.Application._inst = FakeApp(None)
    r = logic._edit_cam_operation({"op_name": "Face1", "raw_parameters": {"stepover": "0.4 in"}})
    check("error" in r and "No CAM product" in r["error"], "edit: no CAM -> loud error")

    # E2 — set a known param by name; only it is written, value applied.
    cam, op1, op2 = _mk_cam()
    core.Application._inst = FakeApp(cam)
    r = logic._edit_cam_operation({"op_name": "Face1", "raw_parameters": {"stepover": "0.4 in"}})
    check(r.get("success") and r.get("set") == ["stepover"], "edit: known param set")
    sp = op1.parameters.itemByName("stepover")
    check(sp.expression == "0.4 in" and sp.writes == 1, "edit: expression applied, single write (idempotent mechanism)")
    check(op1.parameters.itemByName("tool_diameter").writes == 0, "edit: untouched param NOT written")

    # E3 — unknown param name is REPORTED, never guessed.
    cam, op1, _ = _mk_cam()
    core.Application._inst = FakeApp(cam)
    r = logic._edit_cam_operation({"op_name": "Face1", "raw_parameters": {"nonexistent_param": "9"}})
    check(r.get("success") and any(f["param"] == "nonexistent_param" and f["reason"] == "not_found" for f in r["failed"]),
          "edit: unknown name -> failed[not_found], not guessed")

    # E4 — non-dict raw_parameters errors loud.
    cam, _, _ = _mk_cam()
    core.Application._inst = FakeApp(cam)
    r = logic._edit_cam_operation({"op_name": "Face1", "raw_parameters": [1, 2]})
    check("error" in r and "must be an object" in r["error"], "edit: non-dict raw_parameters -> loud error")

    # E5 — dispatch route POST /cam/operation/edit wired.
    cam, _, _ = _mk_cam()
    core.Application._inst = FakeApp(cam)
    out = logic.dispatch("POST", "/cam/operation/edit", {"op_name": "Face1", "raw_parameters": {"stepover": "0.2 in"}}, None)
    check(out.get("success") is True, "edit: POST route wired via dispatch")

    # E6 — IDEMPOTENT: editing the same op twice with the same expr writes once PER call (writes==2),
    #      and the expression is stable (the docstring's idempotency claim, actually exercised).
    cam, op1, _ = _mk_cam()
    core.Application._inst = FakeApp(cam)
    logic._edit_cam_operation({"op_name": "Face1", "raw_parameters": {"stepover": "0.4 in"}})
    r = logic._edit_cam_operation({"op_name": "Face1", "raw_parameters": {"stepover": "0.4 in"}})
    sp = op1.parameters.itemByName("stepover")
    check(r.get("success") and sp.expression == "0.4 in" and sp.writes == 2,
          "edit: idempotent — 2 calls => stable expr, one write each (no append/double-count)")

    # E7 — a param whose .expression SETTER raises (bad expr) lands in failed with a non-not_found
    #      reason and never aborts the op (the fail-soft branch the mocks otherwise paper over).
    badp = FakeParam("feed", "1.0")
    object.__setattr__(badp, "_inited", True)
    object.__setattr__(badp, "raises_on_write", True)
    op_bad = FakeOp("Drill1", [badp])
    object.__setattr__(op_bad.parameters._items[0], "_inited", True)
    cam_bad = FakeCAM([FakeSetup("Setup1", FakeOpsColl([op_bad]))])
    core.Application._inst = FakeApp(cam_bad)
    r = logic._edit_cam_operation({"op_name": "Drill1", "raw_parameters": {"feed": "1.0 banana"}})
    check(r.get("success") and any(f["param"] == "feed" and f["reason"] != "not_found" for f in r["failed"]),
          "edit: expression-setter raise -> failed[reason!=not_found], op not aborted (fail-soft)")

    # ── DELETE (#7) ───────────────────────────────────────────────────
    # D1 — refuse implicit target (no op_name, no op_index).
    cam, _, _ = _mk_cam()
    core.Application._inst = FakeApp(cam)
    r = logic._delete_cam_operation({})
    check("error" in r and "implicit" in r["error"].lower(), "delete: refuses implicit target (safety)")

    # D2 — explicit op_name → deleteMe + remaining count drops.
    cam, op1, op2 = _mk_cam()
    core.Application._inst = FakeApp(cam)
    r = logic._delete_cam_operation({"op_name": "Face1"})
    check(r.get("success") and r.get("deleted_operation") == "Face1", "delete: named op deleted")
    check(op1.deleted is True and r.get("remaining_operations") == 1, "delete: deleteMe() called, count 2->1")

    # D3 — explicit op_index works too.
    cam, op1, op2 = _mk_cam()
    core.Application._inst = FakeApp(cam)
    r = logic._delete_cam_operation({"op_index": 1})
    check(r.get("success") and r.get("deleted_operation") == "Rough1", "delete: by explicit op_index")

    # D4 — no CAM → loud error.
    core.Application._inst = FakeApp(None)
    r = logic._delete_cam_operation({"op_name": "Face1"})
    check("error" in r and "No CAM product" in r["error"], "delete: no CAM -> loud error")

    # D5 — dispatch route wired.
    cam, _, _ = _mk_cam()
    core.Application._inst = FakeApp(cam)
    out = logic.dispatch("POST", "/cam/operation/delete", {"op_index": 0}, None)
    check(out.get("success") is True, "delete: POST route wired via dispatch")

    # D6 — SAFETY: a provided-but-empty/whitespace op_name must error loud, NOT fall through to
    #      index 0 and delete the wrong op (the destructive-target hole the reviewer caught).
    cam, op1, op2 = _mk_cam()
    core.Application._inst = FakeApp(cam)
    r = logic._delete_cam_operation({"op_name": "   ", "op_index": 0})
    check("error" in r and "empty" in r["error"].lower(), "delete: empty/whitespace op_name -> loud error (no silent index fallthrough)")
    check(op1.deleted is False and op2.deleted is False, "delete: empty-name refusal deleted NOTHING")

    # D7 — explicit op_index out of range → loud error (bounds guard tested on the delete path too).
    cam, _, _ = _mk_cam()
    core.Application._inst = FakeApp(cam)
    r = logic._delete_cam_operation({"op_index": 99})
    check("error" in r and "out of range" in r["error"], "delete: op_index OOR -> loud error")

    # D8 — a STRING op_index ("1") is coerced, not an uncaught TypeError in the destructive path.
    cam, op1, op2 = _mk_cam()
    core.Application._inst = FakeApp(cam)
    r = logic._delete_cam_operation({"op_index": "1"})
    check(r.get("success") and r.get("deleted_operation") == "Rough1", "delete: string op_index '1' coerced to int (no TypeError)")

    # ── REORDER (#7) ──────────────────────────────────────────────────
    # R1 — missing target_index → loud error.
    cam, _, _ = _mk_cam(with_move=True)
    core.Application._inst = FakeApp(cam)
    r = logic._reorder_cam_operation({"op_name": "Rough1"})
    check("error" in r and "target_index" in r["error"], "reorder: missing target_index -> loud error")

    # R2 — capability ABSENT → fail-soft REFUSE (supported False + methods + fallback), never silent.
    cam, _, _ = _mk_cam(with_move=False)
    core.Application._inst = FakeApp(cam)
    r = logic._reorder_cam_operation({"op_name": "Rough1", "target_index": 0})
    check(r.get("success") is False and r.get("supported") is False, "reorder: unsupported -> supported=False (not silent)")
    check(isinstance(r.get("available_collection_methods"), list) and "fallback" in r,
          "reorder: unsupported reports available methods + fallback")

    # R3 — capability PRESENT → move() applied with (op, target_index).
    cam, op1, op2 = _mk_cam(with_move=True)
    core.Application._inst = FakeApp(cam)
    r = logic._reorder_cam_operation({"op_name": "Rough1", "target_index": 0})
    check(r.get("success") is True and r.get("supported") is True, "reorder: supported -> success")
    check(cam.setups.item(0).operations.moved == ("Rough1", 0), "reorder: move() called with (op, target_index)")

    # R4 — target_index out of range → loud error.
    cam, _, _ = _mk_cam(with_move=True)
    core.Application._inst = FakeApp(cam)
    r = logic._reorder_cam_operation({"op_name": "Rough1", "target_index": 9})
    check("error" in r and "out of range" in r["error"], "reorder: target_index OOR -> loud error")

    # R5 — dispatch route wired.
    cam, _, _ = _mk_cam(with_move=True)
    core.Application._inst = FakeApp(cam)
    out = logic.dispatch("POST", "/cam/operation/reorder", {"op_name": "Rough1", "target_index": 0}, None)
    check(out.get("success") is True, "reorder: POST route wired via dispatch")

    # R6 — the OTHER capability branch: collection lacks move() but the OP exposes move(index).
    #      Proves the op.move(target_index) single-arg path (untested before -> R9 gap).
    op_a = FakeOpWithMove("Rough1", [FakeParam("stepover", "0.3 in")])
    op_b = FakeOpWithMove("Face1", [FakeParam("stepover", "0.5 in")])
    cam_om = FakeCAM([FakeSetup("Setup1", FakeOpsColl([op_a, op_b]))])  # plain coll: no ops.move
    core.Application._inst = FakeApp(cam_om)
    r = logic._reorder_cam_operation({"op_name": "Rough1", "target_index": 1})
    check(r.get("success") is True and op_a.moved_to == 1, "reorder: op-level move(target_index) branch exercised")

    print()
    if failures:
        print(f"FAILED ({len(failures)}):")
        for f in failures:
            print("  -", f)
        sys.exit(1)
    print("ALL PASS")


if __name__ == "__main__":
    main()
