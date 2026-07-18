#!/usr/bin/env python
"""Real-shape tests for the document-close / scratch-registry surface of
fusion360_api_server.py. Imports the ACTUAL add-in module (mocking only `adsk`)
and drives the real `_FusionAPILogic` methods through `dispatch()` — so it would
catch the `_nav_safe`-in-wrong-class NameError/AttributeError class that
py_compile and a hermetic HTTP-shape mock both miss.

    H:/Tools/python/python.exe mcp-server/scripts/fusion360-addin/test_doc_close.py
"""
import os
import sys
import types
import importlib.util


def _install_fake_adsk():
    """Minimal fake `adsk` so the add-in module imports outside Fusion."""
    adsk = types.ModuleType("adsk")
    core = types.ModuleType("adsk.core")
    fusion = types.ModuleType("adsk.fusion")
    cam = types.ModuleType("adsk.cam")

    class CustomEventHandler:  # class base used at module load
        pass

    class _Application:
        _inst = None

        @classmethod
        def get(cls):
            return cls._inst

    class DocumentTypes:
        FusionDesignDocumentType = 0

    class Design:
        @staticmethod
        def cast(x):
            return x

    class DesignTypes:
        ParametricDesignType = 0
        DirectDesignType = 1

    core.CustomEventHandler = CustomEventHandler
    core.CustomEvent = type("CustomEvent", (), {})
    core.Application = _Application
    core.DocumentTypes = DocumentTypes
    fusion.Design = Design
    fusion.DesignTypes = DesignTypes
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


class _Attrs:
    def itemByName(self, group, name):
        return None

    def add(self, group, name, value):
        return None


class FakeDoc:
    def __init__(self, name, is_saved=False, modified=True):
        self.name = name
        self.isSaved = is_saved
        self.isModified = modified
        self.attributes = _Attrs()
        self.closed_with = "NOT_CALLED"

    def close(self, save_changes):
        self.closed_with = save_changes


class FakeDocs:
    def __init__(self, items):
        self._items = items

    @property
    def count(self):
        return len(self._items)

    def item(self, i):
        return self._items[i]


class FakeApp:
    def __init__(self, docs, active=None):
        self.documents = FakeDocs(docs)
        self.activeDocument = active
        self.activeProduct = None


def main():
    core = _install_fake_adsk()
    mod = _load_module()
    logic = mod._FusionAPILogic()
    failures = []

    def check(cond, msg):
        if not cond:
            failures.append(msg)
            print("  FAIL:", msg)
        else:
            print("  ok:", msg)

    # T1 — close target=scratch: discard-only (saveChanges False) + isSaved skip.
    d1 = FakeDoc("PRISM-SCRATCH-1")
    d2 = FakeDoc("PRISM-SCRATCH-2")
    dsaved = FakeDoc("RealPart", is_saved=True)
    mod._prism_scratch_docs[:] = [d1, d2, dsaved]
    core.Application._inst = FakeApp([d1, d2, dsaved])
    res = logic._close_document({"target": "scratch"})
    print("T1 close scratch:", res)
    check(d1.closed_with is False, "d1 closed with saveChanges=False (discard)")
    check(d2.closed_with is False, "d2 closed with saveChanges=False (discard)")
    check(dsaved.closed_with == "NOT_CALLED", "SAVED doc must NOT be closed/discarded (CAD-loss guard)")
    check(res.get("closedCount") == 2, "closedCount == 2")
    check(mod._prism_scratch_docs == [], "registry drained after close")

    # T2 — /documents resolves _nav_safe at RUNTIME (the P0: _nav_safe was in the wrong class).
    dA = FakeDoc("PRISM-SCRATCH-9")
    dB = FakeDoc("CustomerPart.f3d", is_saved=True)
    mod._prism_scratch_docs[:] = [dA]
    core.Application._inst = FakeApp([dA, dB], active=dB)
    lst = logic._list_documents()
    print("T2 list:", lst)
    check(lst.get("count") == 2, "count == 2")
    check(lst.get("scratchCount") == 1, "scratchCount == 1 (only registered doc)")

    # T3 — full dispatch path GET /documents returns data, NOT an error envelope.
    mod._prism_scratch_docs[:] = [dA]
    core.Application._inst = FakeApp([dA, dB], active=dB)
    out = logic.dispatch("GET", "/documents", None, None)
    print("T3 dispatch GET /documents:", out)
    check("error" not in out, "no error envelope (proves _nav_safe + methods resolve via dispatch)")
    check(out.get("count") == 2, "dispatch returned count == 2")

    # T4 — close target=active refuses to discard a MODIFIED non-scratch doc without force.
    mod._prism_scratch_docs[:] = []
    modded = FakeDoc("UnsavedUserWork", is_saved=False, modified=True)
    core.Application._inst = FakeApp([modded], active=modded)
    r4 = logic._close_document({"target": "active"})
    print("T4 close active (modified, non-scratch, no force):", r4)
    check("error" in r4 and modded.closed_with == "NOT_CALLED", "modified non-scratch active NOT discarded without force")

    print()
    if failures:
        print(f"FAILED ({len(failures)}):")
        for f in failures:
            print("  -", f)
        sys.exit(1)
    print("ALL PASS")


if __name__ == "__main__":
    main()
